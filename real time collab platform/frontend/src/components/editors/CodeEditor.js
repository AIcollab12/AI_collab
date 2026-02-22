// src/components/editors/CodeEditor.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { executeCode, getAISuggestions } from '../../services/api';
import socketService from '../../services/socket';
import './CodeEditor.css';

const CodeEditor = ({ roomId, user, token, onError }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [theme, setTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [problems, setProblems] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [breakpoints, setBreakpoints] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stdinInput, setStdinInput] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const editorRef = useRef(null);
  const chatRef = useRef(null);
  const cursorTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token || !user) return;

    // Connect to socket
    socketService.connect(token);
    
    const handleConnect = () => {
      setIsConnected(true);
      // Join the room
      socketService.joinRoom(roomId, user._id, user.username);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleCodeUpdate = ({ code: newCode, userId }) => {
      if (userId !== user._id) {
        setCode(newCode);
      }
    };

    const handleCursorUpdate = ({ userId, position, username }) => {
      if (userId !== user._id) {
        setRemoteCursors(prev => ({
          ...prev,
          [userId]: { position, username }
        }));
      }
    };

    const handleNewMessage = ({ userId, username, message, timestamp }) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        userId,
        username,
        message,
        timestamp: new Date(timestamp)
      }]);
      
      // Scroll to bottom
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 100);
    };

    const handleAIResponse = ({ message }) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        userId: 'ai',
        username: 'AI Assistant',
        message,
        timestamp: new Date()
      }]);
      setAiResponse(message);
      setAiLoading(false);
    };

    const handleUserJoined = ({ userId, username, users }) => {
      setActiveUsers(users || []);
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        userId: 'system',
        username: 'System',
        message: `${username} joined the room`,
        timestamp: new Date(),
        system: true
      }]);
    };

    const handleUserLeft = ({ userId, username, users }) => {
      setActiveUsers(users || []);
      setRemoteCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        userId: 'system',
        username: 'System',
        message: `${username} left the room`,
        timestamp: new Date(),
        system: true
      }]);
    };

    const handleRoomUsers = ({ users }) => {
      setActiveUsers(users);
    };

    // Register event listeners
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('code-update', handleCodeUpdate);
    socketService.on('cursor-update', handleCursorUpdate);
    socketService.on('new-message', handleNewMessage);
    socketService.on('ai-response', handleAIResponse);
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('room-users', handleRoomUsers);

    return () => {
      // Remove event listeners
      socketService.off('connect');
      socketService.off('disconnect');
      socketService.off('code-update');
      socketService.off('cursor-update');
      socketService.off('new-message');
      socketService.off('ai-response');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('room-users');
      
      // Leave room and disconnect
      socketService.leaveRoom(roomId);
      socketService.disconnect();
    };
  }, [roomId, user, token]);

  // Clear editor when language changes
  useEffect(() => {
    setCode('');
    setOutput('');
  }, [language]);

  // Handle code changes
  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);

    // Send code change to other users
    if (isConnected) {
      socketService.sendCodeChange(roomId, newCode, language);
    }

    // Real-time linting
    lintCode(newCode);
  };

  // Handle cursor movement
  const handleCursorMove = useCallback(() => {
    if (!editorRef.current || !isConnected) return;

    const textarea = editorRef.current;
    const text = textarea.value;
    const start = textarea.selectionStart;
    
    // Calculate line and column
    const lines = text.substring(0, start).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length;

    const position = {
      line,
      column
    };

    // Debounce cursor updates
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }

    cursorTimeoutRef.current = setTimeout(() => {
      socketService.sendCursorMove(roomId, position, user.username);
    }, 100);
  }, [roomId, user, isConnected]);

  // Execute code - ACTUAL EXECUTION via Piston API
  const executeCodeHandler = async () => {
    if (!code.trim()) return;

    // For HTML, show preview
    if (language === 'html') {
      setShowPreview(true);
      setOutput('✅ HTML preview opened below.');
      return;
    }

    setExecuting(true);
    setExecutionTime(null);
    setOutput('⏳ Executing code...\n');

    const startTime = Date.now();
    try {
      const result = await executeCode(code, language, stdinInput);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      setExecutionTime(elapsed);

      if (result.error) {
        setOutput(`❌ Error:\n${result.error}${result.output ? '\n\nPartial output:\n' + result.output : ''}`);
      } else {
        const meta = `[${language.toUpperCase()}${result.version ? ' v' + result.version : ''}] Executed in ${elapsed}s\n${'─'.repeat(50)}\n`;
        setOutput(`✅ ${meta}${result.output || '(no output)'}`);
      }
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      setExecutionTime(elapsed);
      const errMsg = error.error || error.message || JSON.stringify(error);
      const details = error.details ? `\n\n💡 ${error.details}` : '';
      setOutput(`❌ Execution failed (${elapsed}s):\n${errMsg}${details}`);
    } finally {
      setExecuting(false);
    }
  };

  // Get AI suggestions - ACTUAL AI SUGGESTIONS
  const getAISuggestionsHandler = async () => {
    setAiLoading(true);
    
    try {
      const response = await getAISuggestions(code, { language });
      setSuggestions(response.suggestions || []);
      setAiResponse('Suggestions loaded! Check the suggestions panel.');
    } catch (error) {
      setAiResponse(`❌ Failed to get suggestions: ${error.message || error}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Send chat message
  const sendChatMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;

    socketService.sendChatMessage(roomId, newMessage, user.username);
    setNewMessage('');
  };

  // Ask AI chat
  const askAIChat = () => {
    if (!aiPrompt.trim() || !isConnected) return;

    setAiLoading(true);
    
    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      userId: user._id,
      username: user.username,
      message: aiPrompt,
      timestamp: new Date()
    }]);

    socketService.sendAIChat(roomId, aiPrompt, user.username);
    setAiPrompt('');
  };

  // Save code to file
  const saveCode = () => {
    const extensions = {
      javascript: 'js',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      html: 'html',
      css: 'css',
      php: 'php',
      go: 'go',
      rust: 'rs',
      sql: 'sql',
      json: 'json',
      typescript: 'ts'
    };
    
    const extension = extensions[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share code
  const shareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Shared Code',
        text: `Check out this ${language} code from ${user.username}`,
        url: window.location.href
      }).catch(() => {
        navigator.clipboard.writeText(code);
      });
    } else {
      navigator.clipboard.writeText(code).catch(() => {
        // Fallback for non-HTTPS contexts
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    }
  };

  // Format code — language-aware
  const formatCode = () => {
    if (!code.trim()) return;

    try {
      let formatted;

      if (language === 'json') {
        // JSON: parse and re-serialize with indentation
        formatted = JSON.stringify(JSON.parse(code), null, 2);
      } else if (language === 'html') {
        formatted = formatHTML(code);
      } else if (language === 'css') {
        formatted = formatCSS(code);
      } else if (language === 'python') {
        formatted = formatPython(code);
      } else if (language === 'sql') {
        formatted = formatSQL(code);
      } else {
        // C-style languages: JS, TS, Java, C, C++, Go, Rust, PHP, C#, Kotlin, Swift
        formatted = formatCStyle(code);
      }

      setCode(formatted);
    } catch (err) {
      // If formatting fails, fall back to basic indent fix
      setCode(formatCStyle(code));
    }
  };

  // C-style language formatter (JS, TS, Java, C, C++, Go, Rust, PHP, etc.)
  const formatCStyle = (src) => {
    const lines = src.split('\n');
    let indent = 0;
    const result = [];
    const indentStr = '    '; // 4 spaces

    for (let rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) { result.push(''); continue; }

      // Decrease indent for closing braces/brackets at line start
      const closingStart = /^[}\])]/.test(trimmed);
      if (closingStart) indent = Math.max(0, indent - 1);

      result.push(indentStr.repeat(indent) + trimmed);

      // Increase indent for opening braces/brackets at line end
      const openCount = (trimmed.match(/[{([]/g) || []).length;
      const closeCount = (trimmed.match(/[})\]]/g) || []).length;
      const net = openCount - closeCount;
      if (!closingStart) {
        indent = Math.max(0, indent + net);
      } else {
        // Line started with closing brace but may also have an opening
        indent = Math.max(0, indent + Math.max(0, net));
      }
    }
    return result.join('\n');
  };

  // HTML formatter
  const formatHTML = (src) => {
    // Normalize to single line, then re-indent
    let html = src.replace(/>\s+</g, '>\n<');
    const lines = html.split('\n');
    let indent = 0;
    const result = [];
    const selfClosing = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;
    const indentStr = '    ';

    for (let raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // Closing tag
      const isClose = /^<\//.test(trimmed);
      // Opening tag (not self-closing, not void)
      const isOpen = /^<[a-zA-Z]/.test(trimmed) && !selfClosing.test(trimmed) && !/\/>$/.test(trimmed) && !isClose;
      if (isClose) indent = Math.max(0, indent - 1);

      result.push(indentStr.repeat(indent) + trimmed);

      if (isOpen) indent++;
    }
    return result.join('\n');
  };

  // CSS formatter
  const formatCSS = (src) => {
    // Normalize braces and semicolons to separate lines
    let css = src
      .replace(/\{/g, ' {\n')
      .replace(/\}/g, '\n}\n')
      .replace(/;\s*/g, ';\n');

    const lines = css.split('\n');
    let indent = 0;
    const result = [];
    const indentStr = '    ';

    for (let raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      if (trimmed === '}') indent = Math.max(0, indent - 1);

      result.push(indentStr.repeat(indent) + trimmed);

      if (trimmed.endsWith('{')) indent++;
    }
    return result.join('\n');
  };

  // Python formatter (fix indentation consistency)
  const formatPython = (src) => {
    const lines = src.split('\n');
    let indent = 0;
    const result = [];
    const indentStr = '    ';
    const increaseKeywords = /^(def |class |if |elif |else:|for |while |with |try:|except|finally:|async def |async for |async with )/;
    const decreaseKeywords = /^(elif |else:|except|finally:|return|break|continue|pass)\b/;

    for (let raw of lines) {
      const trimmed = raw.trim();

      // Blank lines preserved
      if (!trimmed) { result.push(''); continue; }

      // Comments
      if (trimmed.startsWith('#')) {
        result.push(indentStr.repeat(indent) + trimmed);
        continue;
      }

      // Decrease indent for dedent keywords
      if (decreaseKeywords.test(trimmed) && indent > 0) {
        indent = Math.max(0, indent - 1);
      }

      result.push(indentStr.repeat(indent) + trimmed);

      // Increase indent after block-opening keywords ending with ':'
      if (trimmed.endsWith(':') && increaseKeywords.test(trimmed)) {
        indent++;
      }
    }
    return result.join('\n');
  };

  // SQL formatter (uppercase keywords, basic indent)
  const formatSQL = (src) => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
      'HAVING', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'JOIN', 'LEFT JOIN',
      'RIGHT JOIN', 'INNER JOIN', 'ON', 'AS', 'DISTINCT', 'LIMIT',
      'OFFSET', 'UNION', 'NOT NULL', 'PRIMARY KEY', 'FOREIGN KEY',
      'DEFAULT', 'AUTO_INCREMENT', 'INDEX', 'UNIQUE', 'IN', 'LIKE',
      'BETWEEN', 'IS NULL', 'IS NOT NULL', 'EXISTS', 'CASE', 'WHEN',
      'THEN', 'ELSE', 'END', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    ];

    let formatted = src;
    // Uppercase SQL keywords (case-insensitive match, word boundaries)
    keywords.forEach(kw => {
      const regex = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
      formatted = formatted.replace(regex, kw);
    });

    // Add newlines before major clauses
    const newlineBefore = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY',
      'HAVING', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
      'CREATE TABLE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'UNION', 'LIMIT'];

    newlineBefore.forEach(kw => {
      const regex = new RegExp('(?<!^)\\b(' + kw.replace(/ /g, '\\s+') + ')\\b', 'gm');
      formatted = formatted.replace(regex, '\n$1');
    });

    // Clean up extra blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();

    // Indent lines after SELECT, etc.
    const lines = formatted.split('\n');
    const result = [];
    let indent = 0;
    const indentStr = '    ';

    for (let raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) { result.push(''); continue; }

      // Comments pass through
      if (trimmed.startsWith('--')) {
        result.push(indentStr.repeat(indent) + trimmed);
        continue;
      }

      result.push(indentStr.repeat(indent) + trimmed);
    }
    return result.join('\n');
  };

  // Lint code
  const lintCode = (codeToLint) => {
    const newProblems = [];
    const lines = codeToLint.split('\n');
    
    lines.forEach((line, index) => {
      if (language === 'javascript' && 
          line.trim() && 
          !line.trim().endsWith(';') && 
          !line.trim().endsWith('{') && 
          !line.trim().endsWith('}') && 
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('if') &&
          !line.trim().startsWith('for') &&
          !line.trim().startsWith('while')) {
        newProblems.push({
          line: index + 1,
          type: 'warning',
          message: 'Missing semicolon'
        });
      }
      
      if (line.includes('console.log')) {
        newProblems.push({
          line: index + 1,
          type: 'info',
          message: 'Consider removing console.log in production'
        });
      }

      if (line.length > 80) {
        newProblems.push({
          line: index + 1,
          type: 'style',
          message: 'Line too long (max 80 characters)'
        });
      }
    });
    
    setProblems(newProblems.slice(0, 10));
  };

  // Toggle breakpoint
  const toggleBreakpoint = (lineNumber) => {
    if (breakpoints.includes(lineNumber)) {
      setBreakpoints(breakpoints.filter(b => b !== lineNumber));
    } else {
      setBreakpoints([...breakpoints, lineNumber]);
    }
  };

  // Handle keyboard shortcuts (Tab, Enter auto-indent, bracket closing)
  const handleKeyDown = (e) => {
    const { selectionStart: start, selectionEnd: end } = e.target;

    // --- Tab: insert 4 spaces ---
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = '    ';
      const newCode = code.substring(0, start) + indent + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 4;
        }
      }, 0);
      return;
    }

    // --- Enter: auto-indent next line ---
    if (e.key === 'Enter') {
      e.preventDefault();
      const before = code.substring(0, start);
      const after = code.substring(end);
      const currentLine = before.split('\n').pop();

      // Match existing indentation of current line
      const currentIndent = currentLine.match(/^(\s*)/)[1];

      // Determine if we should increase indent
      const trimmed = currentLine.trim();
      let extraIndent = '';

      if (language === 'python') {
        // Python: indent after lines ending with ':'
        if (trimmed.endsWith(':')) {
          extraIndent = '    ';
        }
      } else {
        // C-style: indent after { [ (
        if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
          extraIndent = '    ';
        }
      }

      const newIndent = currentIndent + extraIndent;
      const newCode = before + '\n' + newIndent + after;
      const newCursor = start + 1 + newIndent.length;
      setCode(newCode);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = newCursor;
        }
      }, 0);
      return;
    }

    // --- Backspace: remove full indent (4 spaces) if cursor is at indent ---
    if (e.key === 'Backspace' && start === end && start > 0) {
      const before = code.substring(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const lineBeforeCursor = before.substring(lineStart);

      if (lineBeforeCursor.length >= 4 && lineBeforeCursor === ' '.repeat(lineBeforeCursor.length)) {
        // Cursor is inside whitespace-only prefix — remove 4 spaces at once
        e.preventDefault();
        const removeCount = ((lineBeforeCursor.length - 1) % 4) + 1; // snap to previous tab stop
        const newCode = code.substring(0, start - removeCount) + code.substring(end);
        const newCursor = start - removeCount;
        setCode(newCode);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = editorRef.current.selectionEnd = newCursor;
          }
        }, 0);
        return;
      }
    }

    // --- Auto-close brackets / quotes ---
    const pairs = { '{': '}', '[': ']', '(': ')', "'": "'", '"': '"', '`': '`' };
    if (pairs[e.key]) {
      const charAfter = code[start];
      // Only auto-close if next char is whitespace, newline, closing bracket, or end of code
      if (!charAfter || /[\s\n\r)\]}>]/.test(charAfter)) {
        e.preventDefault();
        const newCode = code.substring(0, start) + e.key + pairs[e.key] + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 1;
          }
        }, 0);
        return;
      }
    }

    // --- Skip over closing bracket/quote if already there ---
    const closers = [')', ']', '}', "'", '"', '`'];
    if (closers.includes(e.key) && code[start] === e.key) {
      e.preventDefault();
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 1;
        }
      }, 0);
      return;
    }
  };

  // Open HTML preview in new tab
  const openHtmlPreview = () => {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(code);
      previewWindow.document.close();
    }
  };

  const languages = [
    'javascript', 'python', 'java', 'cpp', 'c', 'html', 'css', 
    'sql', 'json', 'typescript', 'go', 'rust', 'php'
  ];

  return (
    <div className="code-editor-container">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '● Connected' : '○ Disconnected'}
      </div>

      {/* Top Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button 
            className={`toolbar-btn ${showFileExplorer ? 'active' : ''}`}
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            title="Toggle File Explorer"
          >
            📁 Files
          </button>
          
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="language-select"
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>

          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            className="theme-select"
          >
            <option value="vs-dark">Dark</option>
            <option value="vs-light">Light</option>
            <option value="hc-black">High Contrast</option>
            <option value="monokai">Monokai</option>
          </select>

          <div className="font-control">
            <button onClick={() => setFontSize(f => Math.max(10, f - 1))}>A-</button>
            <span>{fontSize}px</span>
            <button onClick={() => setFontSize(f => Math.min(24, f + 1))}>A+</button>
          </div>
        </div>

        <div className="toolbar-center">
          <span className="active-file">Workspace</span>
        </div>

        <div className="toolbar-right">
          <button 
            className="toolbar-btn run-btn"
            onClick={executeCodeHandler}
            disabled={executing}
          >
            {executing ? '⏳' : '▶'} Run
          </button>

          <button 
            className={`toolbar-btn ${showStdin ? 'active' : ''}`}
            onClick={() => setShowStdin(!showStdin)}
            title="Toggle Input Panel (stdin)"
          >
            ⌨️ Input
          </button>

          {language === 'html' && (
            <button 
              className="toolbar-btn preview-btn"
              onClick={openHtmlPreview}
              title="Preview HTML in new tab"
            >
              👁️ Preview
            </button>
          )}
          
          <button className="toolbar-btn" onClick={formatCode} title="Format Code">
            🛠️ Format
          </button>
          
          <button 
            className="toolbar-btn" 
            onClick={getAISuggestionsHandler}
            disabled={aiLoading}
            title="Get AI Suggestions"
          >
            🤖 AI
          </button>
          
          <button 
            className="toolbar-btn"
            onClick={() => setShowAIPanel(!showAIPanel)}
            title="AI Chat"
          >
            💬 AI Chat
          </button>
          
          <button 
            className="toolbar-btn"
            onClick={() => setShowChat(!showChat)}
            title="Team Chat"
          >
            👥 Chat ({activeUsers.length})
          </button>
          
          <button className="toolbar-btn" onClick={saveCode} title="Save">
            💾 Save
          </button>
          
          <button className="toolbar-btn" onClick={shareCode} title="Share">
            📤 Share
          </button>
          
          <button 
            className={`toolbar-btn ${debugMode ? 'active' : ''}`}
            onClick={() => setDebugMode(!debugMode)}
            title="Debug Mode"
          >
            🐛 Debug
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="editor-main">
        {/* File Explorer */}
        {showFileExplorer && (
          <div className="file-explorer">
            <div className="explorer-header">
              <h3>EXPLORER</h3>
              <button className="new-file-btn">+</button>
            </div>
            
            <div className="file-tree">
              <div className="folder">
                <div className="folder-name">📁 workspace</div>
                <div className="folder-children">
                  <div className="file-item active">
                    <span className="file-icon">📄</span>
                    {language}.{language === 'javascript' ? 'js' : 
                     language === 'python' ? 'py' : 
                     language === 'java' ? 'java' : 
                     language === 'cpp' ? 'cpp' : 'txt'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Active Users */}
            <div className="active-users">
              <h4>Online ({activeUsers.length})</h4>
              <div className="users-list">
                {activeUsers.map(u => (
                  <div key={u.id} className="user-item">
                    <span className="user-avatar" style={{ backgroundColor: u.color || '#3B82F6' }}>
                      {u.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                    <span className="username">
                      {u.username} {u.id === user?._id ? '(you)' : ''}
                    </span>
                    <span className="user-status online"></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Code Editor */}
        <div className={`editor-wrapper ${theme}`}>
          <div className="editor-header">
            <div className="editor-tabs">
              <div className="editor-tab active">
                {language}.{language === 'javascript' ? 'js' : 
                 language === 'python' ? 'py' : 
                 language === 'java' ? 'java' : 
                 language === 'cpp' ? 'cpp' : 'txt'}
              </div>
            </div>
          </div>
          
          <div className="editor-content">
            {/* Line Numbers */}
            <div className="line-numbers">
              {code.split('\n').map((_, i) => (
                <div 
                  key={i} 
                  className={`line-number ${breakpoints.includes(i + 1) ? 'breakpoint' : ''}`}
                  onClick={() => debugMode && toggleBreakpoint(i + 1)}
                >
                  {i + 1}
                  {breakpoints.includes(i + 1) && <span className="breakpoint-dot">●</span>}
                </div>
              ))}
            </div>
            
            {/* Textarea */}
            <textarea
              ref={editorRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              onMouseMove={handleCursorMove}
              onKeyUp={handleCursorMove}
              onClick={handleCursorMove}
              className="code-textarea"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                lineHeight: '1.5'
              }}
              spellCheck="false"
              placeholder={`Write your ${language} code here...`}
            />

            {/* Remote Cursors */}
            {Object.entries(remoteCursors).map(([userId, { position, username }]) => (
              position && (
                <div 
                  key={userId}
                  className="remote-cursor"
                  style={{
                    top: `${(position.line - 1) * fontSize * 1.5}px`,
                    left: `${position.column * 7.5}px`
                  }}
                >
                  <div className="cursor"></div>
                  <span className="cursor-label">{username}</span>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Right Side Panels */}
        <div className="editor-sidebar">
          {/* Problems Panel */}
          {problems.length > 0 && (
            <div className="problems-panel">
              <h4>⚠️ Problems ({problems.length})</h4>
              <div className="problems-list">
                {problems.map((p, i) => (
                  <div key={i} className={`problem-item ${p.type}`}>
                    <span className="problem-line">Ln {p.line}</span>
                    <span className="problem-message">{p.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Panel */}
          {suggestions.length > 0 && (
            <div className="suggestions-panel">
              <h4>💡 AI Suggestions</h4>
              <div className="suggestions-list">
                {suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item">
                    <span className="suggestion-type">{s.type}</span>
                    <p className="suggestion-message">{s.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stdin Input Panel */}
      {showStdin && (
        <div className="stdin-panel">
          <div className="stdin-header">
            <h3>⌨️ Input (stdin)</h3>
            <div className="stdin-controls">
              <button className="clear-output" onClick={() => setStdinInput('')}>
                Clear
              </button>
              <button className="close-btn" onClick={() => setShowStdin(false)}>✕</button>
            </div>
          </div>
          <textarea
            className="stdin-textarea"
            value={stdinInput}
            onChange={(e) => setStdinInput(e.target.value)}
            placeholder="Enter input for your program (stdin)... Each line will be read separately."
            spellCheck="false"
          />
        </div>
      )}

      {/* HTML Preview Panel */}
      {showPreview && language === 'html' && (
        <div className="preview-panel">
          <div className="preview-header">
            <h3>👁️ HTML Preview</h3>
            <div className="preview-controls">
              <button className="toolbar-btn preview-btn" onClick={openHtmlPreview}>
                Open in New Tab
              </button>
              <button className="close-btn" onClick={() => setShowPreview(false)}>✕</button>
            </div>
          </div>
          <iframe
            className="preview-iframe"
            srcDoc={code}
            title="HTML Preview"
            sandbox="allow-scripts allow-modals"
          />
        </div>
      )}

      {/* Output Panel */}
      <div className="output-panel">
        <div className="output-header">
          <h3>📟 Output</h3>
          <div className="output-controls">
            {executionTime && (
              <span className="execution-time">⏱️ {executionTime}s</span>
            )}
            <button className="clear-output" onClick={() => { setOutput(''); setExecutionTime(null); }}>
              Clear
            </button>
          </div>
        </div>
        <pre className="output-content">
          {output || '▶️ Run your code to see output...'}
        </pre>
      </div>

      {/* Team Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>👥 Team Chat</h3>
            <button className="close-btn" onClick={() => setShowChat(false)}>✕</button>
          </div>
          
          <div className="chat-messages" ref={chatRef}>
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`chat-message ${msg.userId === user?._id ? 'own' : ''} ${msg.system ? 'system' : ''}`}
              >
                <div className="message-header">
                  <span className="message-user">{msg.username}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}
          </div>
          
          <form className="chat-input" onSubmit={sendChatMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={!isConnected}
            />
            <button type="submit" disabled={!isConnected}>Send</button>
          </form>
        </div>
      )}

      {/* AI Chat Panel */}
      {showAIPanel && (
        <div className="ai-panel">
          <div className="ai-header">
            <h3>🤖 AI Assistant</h3>
            <button className="close-btn" onClick={() => setShowAIPanel(false)}>✕</button>
          </div>
          
          <div className="ai-content">
            <div className="ai-response">
              {aiLoading ? (
                <div className="ai-loading">
                  <div className="spinner"></div>
                  <p>AI is thinking...</p>
                </div>
              ) : (
                <p>{aiResponse || "Hi! I'm your AI assistant. Ask me anything about your code!"}</p>
              )}
            </div>
            
            <div className="ai-input">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask AI (e.g., 'How can I optimize this?')"
                rows="3"
                disabled={!isConnected}
              />
              <button 
                onClick={askAIChat}
                disabled={aiLoading || !aiPrompt.trim() || !isConnected}
              >
                Send to AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;