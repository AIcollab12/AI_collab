import React, { useState, useEffect, useRef } from 'react';
import './Spreadsheet.css';

const SpreadsheetEditor = ({ roomId, socket, username }) => {
  const [cells, setCells] = useState({});
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [rows] = useState(50);
  const [cols] = useState(26); // A to Z
  const [cellStyles, setCellStyles] = useState({});
  const [activeStyle, setActiveStyle] = useState({
    bold: false,
    italic: false,
    color: '#000000',
    backgroundColor: '#ffffff'
  });
  
  const spreadsheetRef = useRef(null);
  const editInputRef = useRef(null);

  // Initialize spreadsheet with empty cells
  const initializeSpreadsheet = React.useCallback(() => {
    const initialCells = {};
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        initialCells[`${row},${col}`] = '';
      }
    }
    setCells(initialCells);
  }, [rows, cols]);

  useEffect(() => {
    initializeSpreadsheet();
    
    // Load saved data
    if (socket && roomId) {
      socket.emit('get-spreadsheet-data', { spreadsheetId: roomId });
    }
  }, [roomId, socket, initializeSpreadsheet]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleCellUpdate = (data) => {
      const { row, col, value, style } = data;
      const key = `${row},${col}`;
      
      setCells(prev => ({
        ...prev,
        [key]: value || ''
      }));
      
      if (style) {
        setCellStyles(prev => ({
          ...prev,
          [key]: style
        }));
      }
    };

    const handleStyleUpdate = (data) => {
      const { row, col, style } = data;
      const key = `${row},${col}`;
      
      setCellStyles(prev => ({
        ...prev,
        [key]: style
      }));
    };

    const handleSpreadsheetData = (data) => {
      if (data.cells && Array.isArray(data.cells)) {
        const loadedCells = { ...cells };
        const loadedStyles = { ...cellStyles };
        
        data.cells.forEach(cell => {
          const key = `${cell.row},${cell.col}`;
          loadedCells[key] = cell.value || '';
          if (cell.style) {
            loadedStyles[key] = cell.style;
          }
        });
        
        setCells(loadedCells);
        setCellStyles(loadedStyles);
      }
    };

    const handleSpreadsheetClear = () => {
      initializeSpreadsheet();
      setCellStyles({});
    };

    socket.on('spreadsheet-cell-updated', handleCellUpdate);
    socket.on('spreadsheet-cell-style-updated', handleStyleUpdate);
    socket.on('spreadsheet-data', handleSpreadsheetData);
    socket.on('spreadsheet-cleared', handleSpreadsheetClear);

    return () => {
      socket.off('spreadsheet-cell-updated', handleCellUpdate);
      socket.off('spreadsheet-cell-style-updated', handleStyleUpdate);
      socket.off('spreadsheet-data', handleSpreadsheetData);
      socket.off('spreadsheet-cleared', handleSpreadsheetClear);
    };
  }, [socket, cells, cellStyles, initializeSpreadsheet]);

  const getColumnLetter = (colIndex) => {
    let result = '';
    let index = colIndex;
    
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
      if (index < 0) break;
    }
    
    return result || 'A';
  };

  const handleCellClick = React.useCallback((row, col) => {
    const key = `${row},${col}`;
    setSelectedCell({ row, col });
    setEditValue(cells[key] || '');
    
    // Set active style from cell
    if (cellStyles[key]) {
      setActiveStyle(cellStyles[key]);
    } else {
      setActiveStyle({
        bold: false,
        italic: false,
        color: '#000000',
        backgroundColor: '#ffffff'
      });
    }
    
    // Start editing after a short delay
    setTimeout(() => {
      setEditingCell({ row, col });
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 100);
  }, [cells, cellStyles]);

  const handleCellDoubleClick = (row, col) => {
    const key = `${row},${col}`;
    setEditValue(cells[key] || '');
    setEditingCell({ row, col });
    
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 10);
  };

  const handleInputChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (editingCell) {
      saveCell(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  };

  const handleInputKeyDown = (e) => {
    if (!editingCell) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCell(editingCell.row, editingCell.col, editValue);
      
      // Move to next row
      const nextRow = editingCell.row + 1;
      if (nextRow < rows) {
        handleCellClick(nextRow, editingCell.col);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCell(editingCell.row, editingCell.col, editValue);
      
      // Move to next column
      const nextCol = editingCell.col + 1;
      if (nextCol < cols) {
        handleCellClick(editingCell.row, nextCol);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const saveCell = (row, col, value) => {
    const key = `${row},${col}`;
    
    // Update local state
    setCells(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Send to server
    if (socket && roomId) {
      socket.emit('spreadsheet-cell-update', {
        spreadsheetId: roomId,
        row,
        col,
        value,
        style: activeStyle
      });
    }
  };

  const applyStyle = (styleKey, value) => {
    const newStyle = { ...activeStyle, [styleKey]: value };
    setActiveStyle(newStyle);
    
    // Apply to selected cell
    if (selectedCell && socket && roomId) {
      const { row, col } = selectedCell;
      const key = `${row},${col}`;
      
      // Update local styles
      setCellStyles(prev => ({
        ...prev,
        [key]: newStyle
      }));
      
      // Send to server
      socket.emit('spreadsheet-cell-style', {
        spreadsheetId: roomId,
        row,
        col,
        style: newStyle
      });
    }
  };

  const handleClearSpreadsheet = () => {
    if (window.confirm('Are you sure you want to clear the entire spreadsheet?')) {
      if (socket && roomId) {
        socket.emit('spreadsheet-clear', { spreadsheetId: roomId });
      }
      initializeSpreadsheet();
      setCellStyles({});
    }
  };

  const exportToCSV = () => {
    let csv = '';
    
    // Add header row
    const headers = [];
    for (let col = 0; col < cols; col++) {
      headers.push(getColumnLetter(col));
    }
    csv += headers.join(',') + '\n';
    
    // Add data rows
    for (let row = 0; row < rows; row++) {
      const rowData = [];
      for (let col = 0; col < cols; col++) {
        const key = `${row},${col}`;
        const value = cells[key] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escapedValue = value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
        rowData.push(escapedValue);
      }
      csv += rowData.join(',') + '\n';
    }
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spreadsheet-${roomId || 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFormula = () => {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    const currentValue = cells[`${row},${col}`] || '';
    const formula = prompt('Enter formula (e.g., =SUM(A1:A10)):', currentValue);
    
    if (formula !== null) {
      saveCell(row, col, formula);
    }
  };

  // Navigation with arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input or textarea element
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!selectedCell) return;
      
      let newRow = selectedCell.row;
      let newCol = selectedCell.col;
      
      switch (e.key) {
        case 'ArrowUp':
          if (newRow > 0) newRow--;
          break;
        case 'ArrowDown':
          if (newRow < rows - 1) newRow++;
          break;
        case 'ArrowLeft':
          if (newCol > 0) newCol--;
          break;
        case 'ArrowRight':
          if (newCol < cols - 1) newCol++;
          break;
        default:
          return;
      }
      
      if (newRow !== selectedCell.row || newCol !== selectedCell.col) {
        e.preventDefault();
        handleCellClick(newRow, newCol);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, rows, cols, handleCellClick]);

  const renderCell = (row, col) => {
    const key = `${row},${col}`;
    const isSelected = selectedCell.row === row && selectedCell.col === col;
    const isEditing = editingCell && editingCell.row === row && editingCell.col === col;
    const cellStyle = cellStyles[key] || {};
    const value = cells[key] || '';
    
    const cellClassNames = [
      'spreadsheet-cell',
      isSelected ? 'selected' : '',
      isEditing ? 'editing' : '',
      value.startsWith('=') ? 'formula' : ''
    ].filter(Boolean).join(' ');
    
    const style = {
      fontWeight: cellStyle.bold ? 'bold' : 'normal',
      fontStyle: cellStyle.italic ? 'italic' : 'normal',
      color: cellStyle.color || '#000000',
      backgroundColor: cellStyle.backgroundColor || '#ffffff'
    };
    
    if (isEditing) {
      return (
        <div className={cellClassNames} style={style}>
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="cell-input"
            autoFocus
          />
        </div>
      );
    }
    
    return (
      <div
        className={cellClassNames}
        style={style}
        onClick={() => handleCellClick(row, col)}
        onDoubleClick={() => handleCellDoubleClick(row, col)}
        title={value}
      >
        {value}
      </div>
    );
  };

  return (
    <div className="spreadsheet-editor">
      {/* Toolbar */}
      <div className="spreadsheet-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${activeStyle.bold ? 'active' : ''}`}
            onClick={() => applyStyle('bold', !activeStyle.bold)}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className={`toolbar-btn ${activeStyle.italic ? 'active' : ''}`}
            onClick={() => applyStyle('italic', !activeStyle.italic)}
            title="Italic"
          >
            <em>I</em>
          </button>
        </div>
        
        <div className="toolbar-group">
          <input
            type="color"
            value={activeStyle.color || '#000000'}
            onChange={(e) => applyStyle('color', e.target.value)}
            title="Text Color"
            className="color-picker"
          />
          <input
            type="color"
            value={activeStyle.backgroundColor || '#ffffff'}
            onChange={(e) => applyStyle('backgroundColor', e.target.value)}
            title="Cell Color"
            className="color-picker"
          />
        </div>
        
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            onClick={handleFormula}
            title="Insert Formula"
          >
            ƒ
          </button>
          <button
            className="toolbar-btn"
            onClick={exportToCSV}
            title="Export to CSV"
          >
            📊
          </button>
          <button
            className="toolbar-btn danger"
            onClick={handleClearSpreadsheet}
            title="Clear Spreadsheet"
          >
            🗑️
          </button>
        </div>
        
        <div className="selected-cell-info">
          Selected: {getColumnLetter(selectedCell.col)}{selectedCell.row + 1}
        </div>
      </div>
      
      {/* Spreadsheet Grid */}
      <div className="spreadsheet-grid" ref={spreadsheetRef}>
        {/* Column Headers */}
        <div className="spreadsheet-row header-row">
          <div className="spreadsheet-cell corner-cell"></div>
          {Array.from({ length: cols }).map((_, col) => (
            <div key={`header-${col}`} className="spreadsheet-cell column-header">
              {getColumnLetter(col)}
            </div>
          ))}
        </div>
        
        {/* Data Rows */}
        {Array.from({ length: rows }).map((_, row) => (
          <div key={`row-${row}`} className="spreadsheet-row">
            <div className="spreadsheet-cell row-header">
              {row + 1}
            </div>
            {Array.from({ length: cols }).map((_, col) => (
              <React.Fragment key={`${row},${col}`}>
                {renderCell(row, col)}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
      
      {/* Editing Instructions */}
      <div className="spreadsheet-help">
        <div className="help-item">
          <kbd>Double-click</kbd> to edit cell
        </div>
        <div className="help-item">
          <kbd>Enter</kbd> to save and move down
        </div>
        <div className="help-item">
          <kbd>Tab</kbd> to save and move right
        </div>
        <div className="help-item">
          <kbd>Arrow keys</kbd> to navigate
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetEditor;