// File: src/services/api.js
// Purpose: Handles all HTTP requests to the backend

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== CODE EXECUTION ==========

// Supported languages for online execution
const SUPPORTED_LANGUAGES = [
  'javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go',
  'rust', 'php', 'ruby', 'csharp', 'swift', 'kotlin', 'r',
  'perl', 'bash', 'scala', 'haskell',
];

// Execute code via backend proxy to Paiza.io (avoids CORS)
const executeOnline = async (code, language, input = '') => {
  const response = await api.post('/run', { code, language, input });
  return response.data;
};

// Execute JavaScript in the browser (instant, always works offline)
const executeInBrowser = (code) => {
  const logs = [];
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  const capture =
    (type) =>
    (...args) => {
      const line = args
        .map((a) =>
          typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
        )
        .join(' ');
      logs.push(type === 'error' ? `[ERROR] ${line}` : line);
    };

  console.log = capture('log');
  console.error = capture('error');
  console.warn = capture('warn');
  console.info = capture('info');

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(code);
    const result = fn();
    if (result !== undefined) {
      logs.push(
        typeof result === 'object'
          ? JSON.stringify(result, null, 2)
          : String(result)
      );
    }
    return {
      success: true,
      output: logs.join('\n') || '(no output)',
      error: null,
      language: 'javascript',
      version: 'Browser',
    };
  } catch (err) {
    return {
      success: false,
      output: logs.join('\n'),
      error: `${err.name}: ${err.message}`,
      language: 'javascript',
      version: 'Browser',
    };
  } finally {
    Object.assign(console, originalConsole);
  }
};

// Execute code using the local backend exec (fallback if Paiza.io is down)
const executeWithBackend = async (code, language, input = '') => {
  const response = await api.post('/execute', { code, language, input });
  return response.data;
};

// Main execute function
export const executeCode = async (code, language, input = '') => {
  // HTML — handle locally with preview
  if (language === 'html' || language === 'css') {
    return {
      success: true,
      output:
        language === 'html'
          ? 'HTML preview is shown below. Click "Preview" to see it in a new tab.'
          : 'CSS cannot be executed. Use a preview feature to see styles applied.',
      error: null,
    };
  }

  // JSON — validate locally
  if (language === 'json') {
    try {
      JSON.parse(code);
      return { success: true, output: 'Valid JSON ✓', error: null };
    } catch (e) {
      return { success: false, output: '', error: `Invalid JSON: ${e.message}` };
    }
  }

  // SQL — simulated
  if (language === 'sql') {
    return {
      success: true,
      output:
        'SQL execution simulation:\nQuery executed successfully.\n(Note: Connect a real database for actual SQL execution)',
      error: null,
    };
  }

  // Check if language is supported
  if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
    return {
      success: false,
      output: '',
      error: `Language '${language}' is not supported for execution.`,
    };
  }

  try {
    // Primary: Backend proxy → Paiza.io (no CORS issues)
    return await executeOnline(code, language, input);
  } catch (onlineError) {
    console.warn('Online execution failed:', onlineError.message || onlineError);

    // For JavaScript, fall back to in-browser execution (always works)
    if (language === 'javascript') {
      console.info('Using browser-based JavaScript execution');
      return executeInBrowser(code);
    }

    try {
      // Fallback: local backend exec (requires compilers on server)
      return await executeWithBackend(code, language, input);
    } catch (backendError) {
      console.error('All execution methods failed');
      const msg =
        onlineError?.response?.data?.error ||
        onlineError.message ||
        'Unknown error';
      const err = new Error(`Execution failed: ${msg}`);
      err.details =
        'Online execution service is unavailable. Please ensure the backend server is running and you have internet connectivity.';
      throw err;
    }
  }
};

// Get AI suggestions function
export const getAISuggestions = async (code, context = {}) => {
  try {
    const response = await api.post('/ai/suggest', { code, context });
    return response.data;
  } catch (error) {
    console.error('AI suggestions error:', error);
    throw error.response?.data || { error: error.message };
  }
};

export default api;