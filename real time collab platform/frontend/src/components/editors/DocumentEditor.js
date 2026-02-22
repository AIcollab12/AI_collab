import React, { useState, useRef, useEffect } from 'react';
import './DocumentEditor.css';

const DocumentEditor = ({ room, socket }) => {
  const [content, setContent] = useState('<h1>Welcome to CollabSpace Docs</h1><p>Start typing your document here...</p>');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('3');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentHighlight, setCurrentHighlight] = useState('#ffff00');
  const editorRef = useRef(null);

  const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact'];
  const fontSizes = ['8', '10', '12', '14', '16', '18', '24', '32', '48'];

  useEffect(() => {
    if (socket) {
      socket.on('document-update', ({ content: newContent, from }) => {
        if (from !== socket.id) {
          setContent(newContent);
          if (editorRef.current) {
            editorRef.current.innerHTML = newContent;
          }
        }
      });

      return () => {
        socket.off('document-update');
      };
    }
  }, [socket]);

  const handleContentChange = (e) => {
    const newContent = e.target.innerHTML;
    setContent(newContent);
    
    if (socket && room?._id) {
      socket.emit('document-change', {
        roomId: room._id,
        content: newContent,
        from: socket.id
      });
    }
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertTable = (rows, cols) => {
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>`;
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</table>';
    
    formatText('insertHTML', tableHTML);
    setShowTableModal(false);
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    
    const imgHTML = `<img src="${imageUrl}" alt="Image" style="max-width: 100%; height: auto; margin: 10px 0;" onerror="this.style.display='none'" />`;
    formatText('insertHTML', imgHTML);
    setImageUrl('');
    setShowImageModal(false);
  };

  const insertLink = () => {
    if (!linkUrl.trim() || !linkText.trim()) return;
    
    const linkHTML = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none;">${linkText}</a>`;
    formatText('insertHTML', linkHTML);
    setLinkUrl('');
    setLinkText('');
    setShowLinkModal(false);
  };

  const insertList = (type) => {
    if (type === 'ordered') {
      formatText('insertOrderedList');
    } else {
      formatText('insertUnorderedList');
    }
  };

  const changeFont = (font) => {
    setCurrentFont(font);
    formatText('fontName', font);
  };

  const changeFontSize = (size) => {
    setCurrentFontSize(size);
    formatText('fontSize', size);
  };

  const changeColor = (color) => {
    setCurrentColor(color);
    formatText('foreColor', color);
  };

  const changeHighlight = (color) => {
    setCurrentHighlight(color);
    formatText('hiliteColor', color);
  };

  const insertHorizontalLine = () => {
    formatText('insertHorizontalRule');
  };

  const alignText = (alignment) => {
    formatText('justify' + alignment.charAt(0).toUpperCase() + alignment.slice(1));
  };

  const clearFormatting = () => {
    formatText('removeFormat');
  };

  const exportDocument = (format = 'txt') => {
    const editor = editorRef.current;
    if (!editor) return;
    
    let contentToExport = '';
    let extension = '';
    let mimeType = '';

    switch (format) {
      case 'html':
        contentToExport = editor.innerHTML;
        extension = 'html';
        mimeType = 'text/html';
        break;
      case 'pdf':
        // In production, use a PDF library like jsPDF
        alert('PDF export requires additional setup. Exporting as HTML instead.');
        contentToExport = editor.innerHTML;
        extension = 'html';
        mimeType = 'text/html';
        break;
      default:
        contentToExport = editor.innerText;
        extension = 'txt';
        mimeType = 'text/plain';
    }

    const blob = new Blob([contentToExport], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${room?.name || 'document'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${room?.name || 'Document'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          img { max-width: 100%; }
          table { border-collapse: collapse; width: 100%; }
          table, th, td { border: 1px solid #ddd; padding: 8px; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        ${editorRef.current?.innerHTML || ''}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const wordCount = () => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const characters = text.length;
    alert(`Words: ${words.length}\nCharacters: ${characters}`);
  };

  const insertDateTime = () => {
    const now = new Date();
    const dateTime = now.toLocaleString();
    formatText('insertText', dateTime);
  };

  const insertPlaceholder = (type) => {
    const placeholders = {
      heading: '<h2>Section Heading</h2>',
      paragraph: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
      code: '<pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace;"><code>// Your code here</code></pre>',
      quote: '<blockquote style="border-left: 4px solid #ccc; margin: 10px 0; padding-left: 16px; font-style: italic;">"Your quote here"</blockquote>'
    };
    
    formatText('insertHTML', placeholders[type] || placeholders.paragraph);
  };

  return (
    <div className="document-editor-container">
      {/* Toolbar */}
      <div className="document-toolbar">
        {/* File Operations */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => exportDocument('txt')} title="Export as Text">
            📝 Text
          </button>
          <button className="toolbar-btn" onClick={() => exportDocument('html')} title="Export as HTML">
            🌐 HTML
          </button>
          <button className="toolbar-btn" onClick={printDocument} title="Print">
            🖨️ Print
          </button>
        </div>

        {/* Font Controls */}
        <div className="toolbar-group">
          <select 
            value={currentFont}
            onChange={(e) => changeFont(e.target.value)}
            className="font-selector"
            title="Font Family"
          >
            {fonts.map(font => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>

          <select 
            value={currentFontSize}
            onChange={(e) => changeFontSize(e.target.value)}
            className="font-size-selector"
            title="Font Size"
          >
            {fontSizes.map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>

        {/* Text Formatting */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => formatText('bold')} title="Bold">
            <b>B</b>
          </button>
          <button className="toolbar-btn" onClick={() => formatText('italic')} title="Italic">
            <i>I</i>
          </button>
          <button className="toolbar-btn" onClick={() => formatText('underline')} title="Underline">
            <u>U</u>
          </button>
          <button className="toolbar-btn" onClick={() => formatText('strikeThrough')} title="Strikethrough">
            <s>S</s>
          </button>
          
          <div className="color-picker">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => changeColor(e.target.value)}
              title="Text Color"
            />
            <span style={{ color: currentColor }}>A</span>
          </div>
          
          <div className="color-picker">
            <input
              type="color"
              value={currentHighlight}
              onChange={(e) => changeHighlight(e.target.value)}
              title="Highlight Color"
            />
            <span style={{ backgroundColor: currentHighlight, padding: '2px' }}>H</span>
          </div>
        </div>

        {/* Alignment */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => alignText('left')} title="Align Left">
            ⬅️
          </button>
          <button className="toolbar-btn" onClick={() => alignText('center')} title="Align Center">
            ↔️
          </button>
          <button className="toolbar-btn" onClick={() => alignText('right')} title="Align Right">
            ➡️
          </button>
          <button className="toolbar-btn" onClick={() => alignText('full')} title="Justify">
            ⬌
          </button>
        </div>

        {/* Lists */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => insertList('unordered')} title="Bulleted List">
            • List
          </button>
          <button className="toolbar-btn" onClick={() => insertList('ordered')} title="Numbered List">
            1. List
          </button>
        </div>

        {/* Insert Elements */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => setShowTableModal(true)} title="Insert Table">
            📊 Table
          </button>
          <button className="toolbar-btn" onClick={() => setShowImageModal(true)} title="Insert Image">
            🖼️ Image
          </button>
          <button className="toolbar-btn" onClick={() => setShowLinkModal(true)} title="Insert Link">
            🔗 Link
          </button>
          <button className="toolbar-btn" onClick={insertHorizontalLine} title="Horizontal Line">
            ➖ Line
          </button>
          <button className="toolbar-btn" onClick={insertDateTime} title="Insert Date & Time">
            🕒 Date
          </button>
        </div>

        {/* Placeholders */}
        <div className="toolbar-group">
          <select 
            onChange={(e) => insertPlaceholder(e.target.value)}
            className="placeholder-selector"
            title="Insert Placeholder"
            defaultValue=""
          >
            <option value="" disabled>Insert...</option>
            <option value="heading">📋 Heading</option>
            <option value="paragraph">📝 Paragraph</option>
            <option value="code">💻 Code Block</option>
            <option value="quote">💬 Quote</option>
          </select>
        </div>

        {/* Tools */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={clearFormatting} title="Clear Formatting">
            🧹 Clear
          </button>
          <button className="toolbar-btn" onClick={wordCount} title="Word Count">
            📊 Count
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="document-editor"
        contentEditable
        dangerouslySetInnerHTML={{ __html: content }}
        onInput={handleContentChange}
        suppressContentEditableWarning={true}
        placeholder="Start typing your document here..."
      />

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-item">📄 {room?.name || 'Untitled Document'}</span>
        <span className="status-item">🔄 Real-time</span>
        <span className="status-item" onClick={wordCount} style={{ cursor: 'pointer' }}>
          📝 {editorRef.current?.innerText?.split(/\s+/).filter(w => w.length > 0).length || 0} words
        </span>
      </div>

      {/* Table Modal */}
      {showTableModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Insert Table</h3>
              <button className="close-btn" onClick={() => setShowTableModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="table-grid">
                {Array.from({ length: 6 }, (_, row) => (
                  <div key={row} className="table-row">
                    {Array.from({ length: 6 }, (_, col) => (
                      <button
                        key={col}
                        className="table-cell-btn"
                        onClick={() => insertTable(row + 1, col + 1)}
                        title={`${row + 1} × ${col + 1}`}
                      >
                        {row + 1} × {col + 1}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <p className="modal-hint">Click to insert table with selected dimensions</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Insert Image</h3>
              <button className="close-btn" onClick={() => setShowImageModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter image URL"
                className="modal-input"
                onKeyDown={(e) => e.key === 'Enter' && insertImage()}
              />
              <div className="image-preview">
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="preview-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<span style="color: #999;">Invalid image URL</span>';
                    }}
                  />
                )}
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowImageModal(false)}>
                  Cancel
                </button>
                <button className="modal-btn primary" onClick={insertImage}>
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Insert Link</h3>
              <button className="close-btn" onClick={() => setShowLinkModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
                className="modal-input"
                onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="modal-input"
                onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              />
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowLinkModal(false)}>
                  Cancel
                </button>
                <button className="modal-btn primary" onClick={insertLink}>
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;