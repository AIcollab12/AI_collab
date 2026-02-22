import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Whiteboard.css';

const Whiteboard = ({ room, socket }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawColor, setDrawColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [lineMode, setLineMode] = useState('solid');
  const [fillShape, setFillShape] = useState(false);
  const [fillColor, setFillColor] = useState('#ffffff');
  const [canvasBackground, setCanvasBackground] = useState('#ffffff');
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  
  // For undo/redo functionality
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const maxHistory = 50;

  // Save to history function
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL();
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(dataUrl);
    
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }
    
    historyIndexRef.current = historyRef.current.length - 1;
  };

  // Draw grid function
  const drawGrid = useCallback((ctx, canvas) => {
    if (!gridEnabled || !ctx || !canvas) return;
    
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x <= canvas.width / 2; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height / 2);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvas.height / 2; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width / 2, y);
      ctx.stroke();
    }
  }, [gridEnabled, gridSize]);

  // Clear canvas with white background
  const clearCanvas = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    
    // Fill with background color
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    
    // Draw grid if enabled
    if (gridEnabled) {
      drawGrid(ctx, canvas);
    }
  }, [canvasBackground, gridEnabled, drawGrid]);

  // Load initial content
  const loadInitialContent = useCallback(() => {
    const savedContent = localStorage.getItem(`whiteboard_${room?.id}`);
    if (savedContent) {
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current) {
          // Clear with background first
          clearCanvas();
          ctxRef.current.drawImage(img, 0, 0);
          saveToHistory();
        }
      };
      img.src = savedContent;
    } else {
      // Initialize with background
      clearCanvas();
      saveToHistory();
    }
  }, [room?.id, clearCanvas]);

  // Memoized functions
  const drawFromData = useCallback((data) => {
    if (data.action === 'draw') {
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current && canvasRef.current) {
          clearCanvas();
          ctxRef.current.drawImage(img, 0, 0);
          saveToHistory();
        }
      };
      img.src = data.data;
    }
  }, [clearCanvas]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current && canvasRef.current) {
          clearCanvas();
          ctxRef.current.drawImage(img, 0, 0);
        }
      };
      img.src = historyRef.current[historyIndexRef.current];
      
      if (socket && room?.id) {
        socket.emit('whiteboard-history', {
          roomId: room.id,
          action: 'undo',
          from: socket.id
        });
      }
    }
  }, [room?.id, socket, clearCanvas]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current && canvasRef.current) {
          clearCanvas();
          ctxRef.current.drawImage(img, 0, 0);
        }
      };
      img.src = historyRef.current[historyIndexRef.current];
      
      if (socket && room?.id) {
        socket.emit('whiteboard-history', {
          roomId: room.id,
          action: 'redo',
          from: socket.id
        });
      }
    }
  }, [room?.id, socket, clearCanvas]);

  const clearWhiteboard = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    
    clearCanvas();
    saveToHistory();
    
    if (socket && room?.id) {
      socket.emit('whiteboard-clear', {
        roomId: room.id,
        from: socket.id
      });
    }
  }, [room?.id, socket, clearCanvas]);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
      
      // Load initial content
      loadInitialContent();
    }
  }, [loadInitialContent]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardUpdate = (data) => {
      if (data.from !== socket.id) {
        drawFromData(data);
      }
    };

    const handleWhiteboardClear = () => {
      clearWhiteboard();
    };

    const handleWhiteboardHistory = (data) => {
      if (data.action === 'undo') {
        undo();
      } else if (data.action === 'redo') {
        redo();
      }
    };

    socket.on('whiteboard-update', handleWhiteboardUpdate);
    socket.on('whiteboard-clear', handleWhiteboardClear);
    socket.on('whiteboard-history', handleWhiteboardHistory);

    return () => {
      socket.off('whiteboard-update', handleWhiteboardUpdate);
      socket.off('whiteboard-clear', handleWhiteboardClear);
      socket.off('whiteboard-history', handleWhiteboardHistory);
    };
  }, [socket, drawFromData, clearWhiteboard, undo, redo]);

  const startDrawing = (e) => {
    if (!canvasRef.current || !ctxRef.current) return;
    
    const canvas = canvasRef.current;
    const scaleX = canvas.width / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    const x = (e.clientX - canvas.getBoundingClientRect().left) * scaleX / 2;
    const y = (e.clientY - canvas.getBoundingClientRect().top) * scaleY / 2;
    
    setStartPos({ x, y });
    
    if (drawingTool === 'text') {
      setShowTextModal(true);
      return;
    }
    
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    ctxRef.current.strokeStyle = drawingTool === 'eraser' ? canvasBackground : drawColor;
    ctxRef.current.lineWidth = brushSize;
    
    // Set line style
    if (lineMode === 'dashed') {
      ctxRef.current.setLineDash([5, 5]);
    } else if (lineMode === 'dotted') {
      ctxRef.current.setLineDash([2, 5]);
    } else {
      ctxRef.current.setLineDash([]);
    }
    
    if (fillShape && ['rectangle', 'circle'].includes(drawingTool)) {
      ctxRef.current.fillStyle = fillColor;
    }
    
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctxRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const scaleX = canvas.width / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    const x = (e.clientX - canvas.getBoundingClientRect().left) * scaleX / 2;
    const y = (e.clientY - canvas.getBoundingClientRect().top) * scaleY / 2;
    
    if (drawingTool === 'pen' || drawingTool === 'eraser' || drawingTool === 'line') {
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    } else if (drawingTool === 'rectangle') {
      // Redraw previous state
      if (historyRef.current[historyIndexRef.current]) {
        const img = new Image();
        img.src = historyRef.current[historyIndexRef.current];
        clearCanvas();
        ctxRef.current.drawImage(img, 0, 0);
      }
      
      ctxRef.current.beginPath();
      const width = x - startPos.x;
      const height = y - startPos.y;
      
      if (fillShape) {
        ctxRef.current.fillRect(startPos.x, startPos.y, width, height);
      }
      ctxRef.current.strokeRect(startPos.x, startPos.y, width, height);
    } else if (drawingTool === 'circle') {
      if (historyRef.current[historyIndexRef.current]) {
        const img = new Image();
        img.src = historyRef.current[historyIndexRef.current];
        clearCanvas();
        ctxRef.current.drawImage(img, 0, 0);
      }
      
      ctxRef.current.beginPath();
      const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
      
      if (fillShape) {
        ctxRef.current.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctxRef.current.fill();
      } else {
        ctxRef.current.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctxRef.current.stroke();
      }
    } else if (drawingTool === 'arrow') {
      if (historyRef.current[historyIndexRef.current]) {
        const img = new Image();
        img.src = historyRef.current[historyIndexRef.current];
        clearCanvas();
        ctxRef.current.drawImage(img, 0, 0);
      }
      
      drawArrow(startPos.x, startPos.y, x, y);
    }
  };

  const drawArrow = (fromX, fromY, toX, toY) => {
    const headLength = 15;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(fromX, fromY);
    ctxRef.current.lineTo(toX, toY);
    ctxRef.current.stroke();
    
    // Draw arrow head
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(toX, toY);
    ctxRef.current.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctxRef.current.moveTo(toX, toY);
    ctxRef.current.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    if (ctxRef.current) {
      ctxRef.current.closePath();
    }
    setIsDrawing(false);
    if (ctxRef.current) {
      ctxRef.current.setLineDash([]);
    }
    saveToHistory();
    
    // Send update to other users
    if (socket && room?.id) {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL();
      
      socket.emit('whiteboard-update', {
        roomId: room.id,
        action: 'draw',
        data: dataUrl,
        from: socket.id
      });
    }
  };

  const insertText = () => {
    if (!textInput.trim() || !ctxRef.current) return;
    
    const x = startPos.x;
    const y = startPos.y;
    
    ctxRef.current.font = `${fontSize}px ${fontFamily}`;
    ctxRef.current.fillStyle = drawColor;
    ctxRef.current.fillText(textInput, x, y);
    
    setTextInput('');
    setShowTextModal(false);
    saveToHistory();
    
    if (socket && room?.id) {
      const dataUrl = canvasRef.current.toDataURL();
      socket.emit('whiteboard-update', {
        roomId: room.id,
        action: 'draw',
        data: dataUrl,
        from: socket.id
      });
    }
  };

  const exportWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${room?.name || 'whiteboard'}.png`;
    a.click();
  };

  const saveWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !room?.id) return;
    
    const dataUrl = canvas.toDataURL();
    localStorage.setItem(`whiteboard_${room.id}`, dataUrl);
    alert('Whiteboard saved locally!');
  };

  const changeBackgroundColor = (color) => {
    setCanvasBackground(color);
    if (ctxRef.current && canvasRef.current) {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      const currentImage = canvas.toDataURL();
      
      // Clear with new background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
      
      // Redraw existing content
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = currentImage;
    }
  };

  const toggleGrid = () => {
    setGridEnabled(!gridEnabled);
    if (ctxRef.current && canvasRef.current) {
      clearCanvas();
      if (historyRef.current[historyIndexRef.current]) {
        const img = new Image();
        img.src = historyRef.current[historyIndexRef.current];
        ctxRef.current.drawImage(img, 0, 0);
      }
    }
  };

  return (
    <div className="whiteboard-container">
      <div className="whiteboard-toolbar">
        <div className="tool-group">
          <h4>Drawing Tools</h4>
          <div className="tool-buttons">
            <button 
              className={`tool-btn ${drawingTool === 'pen' ? 'active' : ''}`}
              onClick={() => setDrawingTool('pen')}
              title="Pen"
            >
              ✏️ Pen
            </button>
            <button 
              className={`tool-btn ${drawingTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setDrawingTool('eraser')}
              title="Eraser"
            >
              🧽 Eraser
            </button>
            <button 
              className={`tool-btn ${drawingTool === 'line' ? 'active' : ''}`}
              onClick={() => setDrawingTool('line')}
              title="Line"
            >
              📏 Line
            </button>
            <button 
              className={`tool-btn ${drawingTool === 'arrow' ? 'active' : ''}`}
              onClick={() => setDrawingTool('arrow')}
              title="Arrow"
            >
              ➡️ Arrow
            </button>
            <button 
              className={`tool-btn ${drawingTool === 'rectangle' ? 'active' : ''}`}
              onClick={() => setDrawingTool('rectangle')}
              title="Rectangle"
            >
              ⬜ Rectangle
            </button>
            <button 
              className={`tool-btn ${drawingTool === 'circle' ? 'active' : ''}`}
              onClick={() => setDrawingTool('circle')}
              title="Circle"
            >
              ⭕ Circle
            </button>
            <button 
              className={`tool-btn ${drawingTool === 'text' ? 'active' : ''}`}
              onClick={() => setDrawingTool('text')}
              title="Text"
            >
              🔤 Text
            </button>
          </div>
        </div>
        
        <div className="tool-group">
          <h4>Colors & Styles</h4>
          <div className="color-options">
            <div className="color-option">
              <label>Stroke:</label>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="color-picker"
                title="Stroke Color"
              />
              <span className="color-value">{drawColor}</span>
            </div>
            
            <div className="color-option">
              <label>Fill:</label>
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="color-picker"
                title="Fill Color"
                disabled={!fillShape}
              />
              <label className="fill-checkbox">
                <input
                  type="checkbox"
                  checked={fillShape}
                  onChange={(e) => setFillShape(e.target.checked)}
                />
                Fill
              </label>
            </div>
          </div>
          
          <div className="style-options">
            <div className="style-option">
              <label>Brush Size: {brushSize}px</label>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="slider"
              />
            </div>
            
            <div className="style-option">
              <label>Line Style:</label>
              <select 
                value={lineMode}
                onChange={(e) => setLineMode(e.target.value)}
                className="style-select"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="tool-group">
          <h4>Canvas Settings</h4>
          <div className="canvas-options">
            <div className="canvas-option">
              <label>Background:</label>
              <div className="bg-colors">
                <button 
                  className={`bg-color-btn ${canvasBackground === '#ffffff' ? 'active' : ''}`}
                  onClick={() => changeBackgroundColor('#ffffff')}
                  title="White"
                  style={{ backgroundColor: '#ffffff' }}
                />
                <button 
                  className={`bg-color-btn ${canvasBackground === '#f0f0f0' ? 'active' : ''}`}
                  onClick={() => changeBackgroundColor('#f0f0f0')}
                  title="Light Gray"
                  style={{ backgroundColor: '#f0f0f0' }}
                />
                <button 
                  className={`bg-color-btn ${canvasBackground === '#ffffcc' ? 'active' : ''}`}
                  onClick={() => changeBackgroundColor('#ffffcc')}
                  title="Light Yellow"
                  style={{ backgroundColor: '#ffffcc' }}
                />
              </div>
            </div>
            
            <div className="canvas-option">
              <label className="grid-toggle">
                <input
                  type="checkbox"
                  checked={gridEnabled}
                  onChange={toggleGrid}
                />
                Show Grid
              </label>
              
              {gridEnabled && (
                <div className="grid-controls">
                  <label>Grid Size:</label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="slider"
                  />
                  <span>{gridSize}px</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="tool-group">
          <h4>History & Export</h4>
          <div className="action-buttons">
            <button 
              className="action-btn undo-btn" 
              onClick={undo}
              title="Undo"
              disabled={historyIndexRef.current <= 0}
            >
              ↩️ Undo
            </button>
            <button 
              className="action-btn redo-btn" 
              onClick={redo}
              title="Redo"
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
            >
              ↪️ Redo
            </button>
            <button 
              className="action-btn clear-btn" 
              onClick={clearWhiteboard} 
              title="Clear All"
            >
              🗑️ Clear
            </button>
            <button 
              className="action-btn save-btn" 
              onClick={saveWhiteboard} 
              title="Save Locally"
            >
              💾 Save
            </button>
            <button 
              className="action-btn export-btn" 
              onClick={exportWhiteboard} 
              title="Export as PNG"
            >
              📥 Export
            </button>
          </div>
        </div>
      </div>
      
      <div className="whiteboard-canvas-container">
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          style={{ backgroundColor: canvasBackground }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e.touches[0]);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e.touches[0]);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
        />
      </div>
      
      {showTextModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Insert Text</h3>
              <button className="close-btn" onClick={() => setShowTextModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text here..."
                className="modal-input"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && insertText()}
              />
              
              <div className="text-options">
                <div className="text-option">
                  <label>Font Size: {fontSize}px</label>
                  <input
                    type="range"
                    min="10"
                    max="72"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="slider"
                  />
                </div>
                
                <div className="text-option">
                  <label>Font:</label>
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="font-select"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowTextModal(false)}>
                  Cancel
                </button>
                <button className="modal-btn primary" onClick={insertText}>
                  Insert Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="whiteboard-status">
        <div className="status-item">
          <span className="status-label">Tool:</span>
          <span className="status-value">{drawingTool.charAt(0).toUpperCase() + drawingTool.slice(1)}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Color:</span>
          <span className="color-preview" style={{ backgroundColor: drawColor }}></span>
          <span className="status-value">{drawColor}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Size:</span>
          <span className="status-value">{brushSize}px</span>
        </div>
        {socket && (
          <div className="status-item">
            <span className="status-label">Online:</span>
            <span className="status-value">{room?.members?.length || 1} users</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;