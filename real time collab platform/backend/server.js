const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

// Import models
const User = require('./models/User');
const Room = require('./models/Room');
const Activity = require('./models/Activity');
const Meeting = require('./models/Meeting');

const app = express();
const server = http.createServer(app);

// ========== EMAIL CONFIGURATION ==========

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

const sendInvitationEmail = async (toEmail, inviterName, workspaceName, inviteLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'CollabSpace <collabspace@example.com>',
      to: toEmail,
      subject: `You're invited to join "${workspaceName}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
            <p style="margin-top: 10px; font-size: 16px;">Join "${workspaceName}" on CollabSpace</p>
          </div>
          
          <div style="padding: 30px 20px; background: #f9fafb;">
            <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                <strong>${inviterName}</strong> has invited you to join their workspace:
              </p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h2 style="color: #111827; margin: 0 0 10px 0;">${workspaceName}</h2>
                <p style="color: #6b7280; margin: 0;">Collaborative workspace</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold;
                          font-size: 16px;
                          display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="font-size: 14px; color: #6b7280; margin: 5px 0;">
                  This invitation will expire in 7 days
                </p>
                <p style="font-size: 14px; color: #6b7280; margin: 5px 0;">
                  Can't click the button? Copy and paste this link:
                </p>
                <p style="background: #f3f4f6; padding: 10px; border-radius: 6px; font-size: 12px; color: #374151; word-break: break-all;">
                  ${inviteLink}
                </p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated message from CollabSpace</p>
            <p>If you didn't expect this invitation, you can safely ignore this email</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invitation email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
    return false;
  }
};

// ========== SESSION & PASSPORT SETUP ==========

app.use(session({
  secret: process.env.SESSION_SECRET || 'collabspace-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    domain: 'localhost',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

// ========== REAL ONLINE USERS TRACKING ==========
const onlineUsers = new Map(); // userId -> {userData, socketIds[]}
const userSockets = new Map(); // socketId -> userId

// Helper functions
const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toLowerCase().replace(' ', '');
};

const createActivity = async (userId, activityType, description, workspace = null, status = 'success', metadata = {}) => {
  try {
    if (mongoose.connection.readyState === 1 && userId && userId.toString().startsWith('demo_') === false) {
      const activity = await Activity.create({
        user: userId,
        activityType,
        description,
        workspace,
        status,
        metadata
      });
      return activity;
    }
    return null;
  } catch (error) {
    console.error('Activity logging error:', error.message);
    return null;
  }
};

const getRandomColor = () => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collabspace';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('\n💡 Working in demo mode without database...');
  }
};

connectDB();

// ========== PASSPORT SETUP ==========

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ========== GOOGLE STRATEGY ==========

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google profile received:', profile.emails[0].value);
      const email = profile.emails[0].value;
      
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        console.log('✅ Google user found:', user.username);
        return done(null, user);
      }
      
      user = await User.findOne({ email: email });
      
      if (user) {
        console.log('🔗 Linking Google to existing user:', user.email);
        user.googleId = profile.id;
        user.profilePicture = user.profilePicture || profile.photos[0]?.value;
        await user.save();
        return done(null, user);
      }
      
      user = new User({
        googleId: profile.id,
        username: profile.displayName || email.split('@')[0],
        email: email,
        profilePicture: profile.photos[0]?.value,
        color: getRandomColor()
      });
      
      await user.save();
      console.log('✅ New Google user created:', user.username);
      
      return done(null, user);
      
    } catch (error) {
      console.error('❌ Google auth error:', error.message);
      
      if (error.code === 11000) {
        const existingUser = await User.findOne({ email: profile.emails[0].value });
        if (existingUser) {
          return done(null, existingUser);
        }
      }
      
      return done(error, null);
    }
  }));
} else {
  console.log('⚠️ Google OAuth credentials not found. Google login disabled.');
}

// ========== GITHUB STRATEGY ==========

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/github/callback",
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GitHub profile received:', profile.username);
      
      let email = profile.emails && profile.emails[0] 
        ? profile.emails[0].value 
        : `${profile.username}@github.com`;
      
      let user = await User.findOne({ githubId: profile.id });
      
      if (user) {
        console.log('✅ GitHub user found:', user.username);
        return done(null, user);
      }
      
      user = await User.findOne({ email: email });
      
      if (user) {
        console.log('🔗 Linking GitHub to existing user:', user.email);
        user.githubId = profile.id;
        user.profilePicture = user.profilePicture || profile.photos[0]?.value;
        await user.save();
        return done(null, user);
      }
      
      user = new User({
        githubId: profile.id,
        username: profile.username || profile.displayName || email.split('@')[0],
        email: email,
        profilePicture: profile.photos[0]?.value || '',
        color: getRandomColor()
      });
      
      await user.save();
      console.log('✅ New GitHub user created:', user.username);
      
      return done(null, user);
      
    } catch (error) {
      console.error('❌ GitHub auth error:', error.message);
      
      if (error.code === 11000) {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
          return done(null, existingUser);
        }
      }
      
      return done(error, null);
    }
  }));
} else {
  console.log('⚠️ GitHub OAuth credentials not found. GitHub login disabled.');
}

// ========== CODE EXECUTION SETUP ==========

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, 'temp');
const ensureTempDir = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.log('✅ Temp directory ready');
  } catch (error) {
    console.error('❌ Failed to create temp directory:', error.message);
  }
};
ensureTempDir();

// Cleanup old temp files (older than 1 hour)
const cleanupTempFiles = async () => {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > 3600000) { // 1 hour
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Temp cleanup error:', error.message);
  }
};
setInterval(cleanupTempFiles, 3600000); // Run every hour

// Execute JavaScript code
const executeJavaScript = (code, input, id) => {
  return new Promise(async (resolve) => {
    const filePath = path.join(TEMP_DIR, `${id}.js`);
    
    try {
      await fs.writeFile(filePath, code);
      
      const process = exec(`node ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
        // Cleanup
        fs.unlink(filePath).catch(console.error);
        
        if (error) {
          resolve({ output: null, error: stderr || error.message });
        } else {
          resolve({ output: stdout, error: null });
        }
      });
      
      if (input) {
        process.stdin.write(input);
        process.stdin.end();
      }
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute Python code
const executePython = (code, input, id) => {
  return new Promise(async (resolve) => {
    const filePath = path.join(TEMP_DIR, `${id}.py`);
    
    try {
      await fs.writeFile(filePath, code);
      
      const process = exec(`python ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
        fs.unlink(filePath).catch(console.error);
        
        if (error) {
          resolve({ output: null, error: stderr || error.message });
        } else {
          resolve({ output: stdout, error: null });
        }
      });
      
      if (input) {
        process.stdin.write(input);
        process.stdin.end();
      }
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute Java code
const executeJava = (code, input, id) => {
  return new Promise(async (resolve) => {
    const fileName = `Main${id}`;
    const filePath = path.join(TEMP_DIR, `${fileName}.java`);
    
    try {
      // Extract class name or use default
      const classNameMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classNameMatch ? classNameMatch[1] : fileName;
      
      // Replace class name if needed
      let javaCode = code;
      if (classNameMatch && classNameMatch[1] !== className) {
        javaCode = code.replace(/public\s+class\s+\w+/, `public class ${className}`);
      }
      
      await fs.writeFile(filePath, javaCode);
      
      // Compile
      exec(`javac ${filePath}`, { timeout: 10000 }, (compileError, stdout, stderr) => {
        if (compileError) {
          fs.unlink(filePath).catch(console.error);
          resolve({ output: null, error: stderr || compileError.message });
          return;
        }
        
        // Run
        exec(`java -cp ${TEMP_DIR} ${className}`, { timeout: 10000 }, (runError, stdout, stderr) => {
          // Cleanup
          fs.unlink(filePath).catch(console.error);
          fs.unlink(path.join(TEMP_DIR, `${className}.class`)).catch(console.error);
          
          if (runError) {
            resolve({ output: null, error: stderr || runError.message });
          } else {
            resolve({ output: stdout, error: null });
          }
        }).stdin.end(input);
      });
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute C++ code
const executeCpp = (code, input, id) => {
  return new Promise(async (resolve) => {
    const sourcePath = path.join(TEMP_DIR, `${id}.cpp`);
    const exePath = path.join(TEMP_DIR, `${id}${process.platform === 'win32' ? '.exe' : ''}`);
    
    try {
      await fs.writeFile(sourcePath, code);
      
      // Compile
      exec(`g++ ${sourcePath} -o ${exePath}`, { timeout: 10000 }, (compileError, stdout, stderr) => {
        if (compileError) {
          fs.unlink(sourcePath).catch(console.error);
          resolve({ output: null, error: stderr || compileError.message });
          return;
        }
        
        // Run
        const runProcess = exec(exePath, { timeout: 10000 }, (runError, stdout, stderr) => {
          // Cleanup
          fs.unlink(sourcePath).catch(console.error);
          fs.unlink(exePath).catch(console.error);
          
          if (runError) {
            resolve({ output: null, error: stderr || runError.message });
          } else {
            resolve({ output: stdout, error: null });
          }
        });
        
        if (input) {
          runProcess.stdin.write(input);
          runProcess.stdin.end();
        }
      });
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute C code
const executeC = (code, input, id) => {
  return new Promise(async (resolve) => {
    const sourcePath = path.join(TEMP_DIR, `${id}.c`);
    const exePath = path.join(TEMP_DIR, `${id}${process.platform === 'win32' ? '.exe' : ''}`);
    
    try {
      await fs.writeFile(sourcePath, code);
      
      // Compile
      exec(`gcc ${sourcePath} -o ${exePath}`, { timeout: 10000 }, (compileError, stdout, stderr) => {
        if (compileError) {
          fs.unlink(sourcePath).catch(console.error);
          resolve({ output: null, error: stderr || compileError.message });
          return;
        }
        
        // Run
        const runProcess = exec(exePath, { timeout: 10000 }, (runError, stdout, stderr) => {
          // Cleanup
          fs.unlink(sourcePath).catch(console.error);
          fs.unlink(exePath).catch(console.error);
          
          if (runError) {
            resolve({ output: null, error: stderr || runError.message });
          } else {
            resolve({ output: stdout, error: null });
          }
        });
        
        if (input) {
          runProcess.stdin.write(input);
          runProcess.stdin.end();
        }
      });
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute HTML (simulated)
const executeHTML = (code) => {
  return Promise.resolve({
    output: 'HTML cannot be executed directly. Use the preview feature to view HTML.',
    error: null
  });
};

// Execute CSS (simulated)
const executeCSS = (code) => {
  return Promise.resolve({
    output: 'CSS cannot be executed directly. Use the preview feature to see styles.',
    error: null
  });
};

// Execute SQL (simulated)
const executeSQL = (code) => {
  return Promise.resolve({
    output: 'SQL execution simulation:\nQuery executed successfully!\n3 rows affected.',
    error: null
  });
};

// Execute TypeScript (transpile to JS first)
const executeTypeScript = (code, input, id) => {
  return new Promise(async (resolve) => {
    const tsPath = path.join(TEMP_DIR, `${id}.ts`);
    const jsPath = path.join(TEMP_DIR, `${id}.js`);
    
    try {
      await fs.writeFile(tsPath, code);
      
      // Try to transpile with tsc if available, otherwise fallback to basic transpilation
      exec(`npx tsc ${tsPath} --target es2020 --outDir ${TEMP_DIR}`, { timeout: 10000 }, (tsError, stdout, stderr) => {
        if (tsError) {
          // Fallback: try to execute as JavaScript directly (remove TypeScript syntax)
          const jsCode = code
            .replace(/:\s*\w+/g, '') // Remove type annotations
            .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
            .replace(/export\s+/g, '') // Remove export keywords
            .replace(/import\s+.*?from\s+['"].*?['"]/g, ''); // Remove imports
          
          fs.writeFile(jsPath, jsCode).then(() => {
            exec(`node ${jsPath}`, { timeout: 10000 }, (runError, stdout, stderr) => {
              fs.unlink(tsPath).catch(console.error);
              fs.unlink(jsPath).catch(console.error);
              
              if (runError) {
                resolve({ output: null, error: stderr || runError.message });
              } else {
                resolve({ output: stdout, error: null });
              }
            }).stdin.end(input);
          });
        } else {
          // Successfully transpiled, run the JS
          exec(`node ${jsPath}`, { timeout: 10000 }, (runError, stdout, stderr) => {
            fs.unlink(tsPath).catch(console.error);
            fs.unlink(jsPath).catch(console.error);
            
            if (runError) {
              resolve({ output: null, error: stderr || runError.message });
            } else {
              resolve({ output: stdout, error: null });
            }
          }).stdin.end(input);
        }
      });
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute Go code
const executeGo = (code, input, id) => {
  return new Promise(async (resolve) => {
    const filePath = path.join(TEMP_DIR, `${id}.go`);
    
    try {
      await fs.writeFile(filePath, code);
      
      exec(`go run ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
        fs.unlink(filePath).catch(console.error);
        
        if (error) {
          resolve({ output: null, error: stderr || error.message });
        } else {
          resolve({ output: stdout, error: null });
        }
      }).stdin.end(input);
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute Rust code
const executeRust = (code, input, id) => {
  return new Promise(async (resolve) => {
    const filePath = path.join(TEMP_DIR, `${id}.rs`);
    
    try {
      await fs.writeFile(filePath, code);
      
      exec(`rustc ${filePath} -o ${TEMP_DIR}/${id} && ${TEMP_DIR}/${id}`, { timeout: 10000 }, (error, stdout, stderr) => {
        fs.unlink(filePath).catch(console.error);
        fs.unlink(path.join(TEMP_DIR, id)).catch(console.error);
        if (process.platform === 'win32') {
          fs.unlink(path.join(TEMP_DIR, `${id}.exe`)).catch(console.error);
          fs.unlink(path.join(TEMP_DIR, `${id}.pdb`)).catch(console.error);
        }
        
        if (error) {
          resolve({ output: null, error: stderr || error.message });
        } else {
          resolve({ output: stdout, error: null });
        }
      }).stdin.end(input);
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// Execute PHP code
const executePHP = (code, input, id) => {
  return new Promise(async (resolve) => {
    const filePath = path.join(TEMP_DIR, `${id}.php`);
    
    try {
      await fs.writeFile(filePath, code);
      
      exec(`php ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
        fs.unlink(filePath).catch(console.error);
        
        if (error) {
          resolve({ output: null, error: stderr || error.message });
        } else {
          resolve({ output: stdout, error: null });
        }
      }).stdin.end(input);
    } catch (err) {
      resolve({ output: null, error: err.message });
    }
  });
};

// ========== CODE EXECUTION ENDPOINT ==========

// --- Paiza.io proxy (avoids browser CORS issues) ---
const PAIZA_LANGUAGE_MAP = {
  javascript: 'javascript', python: 'python3', java: 'java',
  cpp: 'cpp', c: 'c', typescript: 'typescript', go: 'go',
  rust: 'rust', php: 'php', ruby: 'ruby', csharp: 'csharp',
  swift: 'swift', kotlin: 'kotlin', r: 'r', perl: 'perl',
  bash: 'bash', scala: 'scala', haskell: 'haskell',
};

const pollPaizaResult = async (id, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(
      `https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`
    );
    if (!resp.ok) throw new Error(`Paiza status check failed (${resp.status})`);
    const data = await resp.json();
    if (data.status === 'completed') {
      if (data.build_result === 'failure') {
        return { success: false, output: data.build_stdout || '', error: data.build_stderr || 'Compilation failed' };
      }
      const hasErr = data.stderr && data.stderr.trim().length > 0;
      const exitCode = parseInt(data.exit_code, 10);
      return {
        success: data.result === 'success' && exitCode === 0,
        output: data.stdout || '',
        error: hasErr ? data.stderr : (exitCode !== 0 ? `Process exited with code ${exitCode}` : null),
        language: data.language,
        time: data.time,
        memory: data.memory,
      };
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  throw new Error('Execution timed out');
};

app.post('/api/run', async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;
    if (!code || !language) {
      return res.status(400).json({ success: false, error: 'Code and language are required' });
    }
    const paizaLang = PAIZA_LANGUAGE_MAP[language.toLowerCase()];
    if (!paizaLang) {
      return res.status(400).json({ success: false, error: `Language '${language}' is not supported` });
    }

    const createResp = await fetch('https://api.paiza.io/runners/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_code: code, language: paizaLang, input, api_key: 'guest' }),
    });
    if (!createResp.ok) {
      const errText = await createResp.text();
      return res.status(502).json({ success: false, error: `Paiza.io error: ${errText}` });
    }
    const createData = await createResp.json();
    if (!createData.id) {
      return res.status(502).json({ success: false, error: 'Paiza.io did not return a job ID' });
    }

    const result = await pollPaizaResult(createData.id);
    res.json(result);
  } catch (error) {
    console.error('Online execution error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Online execution failed' });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    const executionId = uuidv4();
    
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required'
      });
    }
    
    let result;
    const lang = language.toLowerCase();
    
    switch (lang) {
      case 'javascript':
        result = await executeJavaScript(code, input, executionId);
        break;
      case 'python':
        result = await executePython(code, input, executionId);
        break;
      case 'java':
        result = await executeJava(code, input, executionId);
        break;
      case 'cpp':
      case 'c++':
        result = await executeCpp(code, input, executionId);
        break;
      case 'c':
        result = await executeC(code, input, executionId);
        break;
      case 'html':
        result = await executeHTML(code);
        break;
      case 'css':
        result = await executeCSS(code);
        break;
      case 'sql':
        result = await executeSQL(code);
        break;
      case 'typescript':
        result = await executeTypeScript(code, input, executionId);
        break;
      case 'go':
        result = await executeGo(code, input, executionId);
        break;
      case 'rust':
        result = await executeRust(code, input, executionId);
        break;
      case 'php':
        result = await executePHP(code, input, executionId);
        break;
      default:
        result = {
          output: null,
          error: `Language '${language}' is not supported for execution`
        };
    }
    
    // Log execution activity
    await createActivity(
      decoded.userId,
      'code_execution',
      `Executed ${language} code`,
      null,
      result.error ? 'failed' : 'success',
      { 
        language, 
        executionId,
        hasError: !!result.error 
      }
    );
    
    res.json({
      success: !result.error,
      output: result.output,
      error: result.error
    });
    
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Execution failed'
    });
  }
});

// ========== AI SUGGESTIONS ENDPOINT ==========

app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { code, context = {} } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }
    
    // Generate AI suggestions based on code analysis
    const suggestions = [];
    const lines = code.split('\n');
    const language = context.language || 'javascript';
    
    // Check for common patterns and suggest improvements
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for console.log
      if (line.includes('console.log')) {
        suggestions.push({
          type: 'info',
          message: 'Consider removing console.log statements in production code',
          line: lineNum
        });
      }
      
      // Check for long lines
      if (line.length > 80) {
        suggestions.push({
          type: 'style',
          message: 'Line is too long. Consider breaking it into multiple lines for better readability',
          line: lineNum
        });
      }
      
      // Check for TODO comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        suggestions.push({
          type: 'info',
          message: 'TODO/FIXME comment found. Consider addressing this before deployment',
          line: lineNum
        });
      }
      
      // Language specific suggestions
      if (language === 'javascript' || language === 'typescript') {
        // Check for var usage
        if (line.includes('var ')) {
          suggestions.push({
            type: 'modernization',
            message: 'Consider using let or const instead of var for better scoping',
            line: lineNum
          });
        }
        
        // Check for == instead of ===
        if (line.includes(' == ') && !line.includes('===')) {
          suggestions.push({
            type: 'best-practice',
            message: 'Use === for strict equality comparison to avoid type coercion',
            line: lineNum
          });
        }
        
        // Check for missing semicolons
        if (line.trim() && 
            !line.trim().endsWith(';') && 
            !line.trim().endsWith('{') && 
            !line.trim().endsWith('}') && 
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('if') &&
            !line.trim().startsWith('for') &&
            !line.trim().startsWith('while') &&
            !line.trim().startsWith('function')) {
          suggestions.push({
            type: 'style',
            message: 'Missing semicolon',
            line: lineNum
          });
        }
      }
      
      if (language === 'python') {
        // Check for print statements
        if (line.includes('print(')) {
          suggestions.push({
            type: 'info',
            message: 'Consider using logging instead of print for production code',
            line: lineNum
          });
        }
        
        // Check for proper indentation (simplified check)
        if (line.startsWith('    ') && line.trim().startsWith('return')) {
          suggestions.push({
            type: 'style',
            message: 'Consider consistent indentation (4 spaces recommended)',
            line: lineNum
          });
        }
      }
      
      if (language === 'java' || language === 'cpp' || language === 'c') {
        // Check for missing braces
        if (line.includes('if') && !line.includes('{') && !line.trim().endsWith(';')) {
          suggestions.push({
            type: 'style',
            message: 'Consider using braces even for single-line if statements',
            line: lineNum
          });
        }
      }
    });
    
    // Check for common code patterns
    if (code.includes('function') && !code.includes('return')) {
      suggestions.push({
        type: 'warning',
        message: 'Functions should typically return a value',
        line: 1
      });
    }
    
    if (code.includes('try') && !code.includes('catch')) {
      suggestions.push({
        type: 'error',
        message: 'try block should be followed by catch or finally',
        line: 1
      });
    }
    
    // Security suggestions
    if (code.includes('eval(')) {
      suggestions.push({
        type: 'security',
        message: 'Avoid using eval() as it can lead to security vulnerabilities',
        line: 1
      });
    }
    
    if (code.includes('innerHTML')) {
      suggestions.push({
        type: 'security',
        message: 'Be cautious with innerHTML to prevent XSS attacks. Consider using textContent instead',
        line: 1
      });
    }
    
    // Performance suggestions
    if (code.includes('for (') && code.includes('length')) {
      suggestions.push({
        type: 'performance',
        message: 'Cache array length in for loops for better performance: for (let i = 0, len = arr.length; i < len; i++)',
        line: 1
      });
    }
    
    // Check for nested loops (potential performance issue)
    const loopCount = (code.match(/for\s*\(/g) || []).length;
    if (loopCount > 2) {
      suggestions.push({
        type: 'performance',
        message: 'Multiple nested loops detected. Consider optimizing for better performance',
        line: 1
      });
    }
    
    // Check for commented code
    if (code.includes('//') && code.split('\n').filter(l => l.trim().startsWith('//')).length > 5) {
      suggestions.push({
        type: 'maintainability',
        message: 'Large amount of commented code. Consider removing unused code',
        line: 1
      });
    }
    
    // Check for magic numbers
    const magicNumbers = code.match(/\b[0-9]{2,}\b/g);
    if (magicNumbers && magicNumbers.length > 3) {
      suggestions.push({
        type: 'maintainability',
        message: 'Consider defining magic numbers as named constants',
        line: 1
      });
    }
    
    // Log AI suggestion activity
    await createActivity(
      decoded.userId,
      'ai_suggestion',
      `Generated ${suggestions.length} AI suggestions`,
      null,
      'success',
      { suggestionCount: suggestions.length }
    );
    
    res.json({
      success: true,
      suggestions: suggestions.slice(0, 15) // Limit to 15 suggestions
    });
    
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate suggestions'
    });
  }
});

// ========== SOCKET.IO REAL-TIME TRACKING ==========

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // User goes online - REAL tracking
  socket.on('user-online', async (data) => {
    try {
      const { userId, token, username } = data;
      
      if (!userId || !token) return;
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
      
      let user;
      if (mongoose.connection.readyState === 1 && !userId.toString().startsWith('demo_')) {
        user = await User.findById(userId);
      }
      
      if (!user && !userId.toString().startsWith('demo_')) return;
      
      // Store socket info
      userSockets.set(socket.id, userId);
      
      // Update online users map
      if (onlineUsers.has(userId)) {
        const userData = onlineUsers.get(userId);
        userData.socketIds.push(socket.id);
        userData.lastSeen = new Date();
      } else {
        onlineUsers.set(userId, {
          userData: user || { 
            _id: userId, 
            username: username || 'User',
            email: userId.toString().startsWith('demo_') ? 'demo@example.com' : 'user@example.com',
            profilePicture: '',
            color: getRandomColor()
          },
          socketIds: [socket.id],
          lastSeen: new Date(),
          connectedAt: new Date()
        });
        
        // Log login activity
        const activity = await createActivity(
          userId,
          'login',
          `${username || 'User'} logged in`,
          null,
          'success',
          { 
            isDemo: userId.toString().startsWith('demo_'),
            socketId: socket.id 
          }
        );
        
        // Emit new activity to all clients
        if (activity) {
          io.emit('new-activity', {
            time: formatTime(activity.createdAt),
            user: username || 'User',
            activity: 'User logged in',
            workspace: 'General',
            status: 'joined',
            _id: activity._id,
            createdAt: activity.createdAt
          });
        }
        
        // Broadcast new user is online
        io.emit('user-connected', {
          userId: userId,
          username: username || 'User',
          timestamp: new Date(),
          totalOnline: onlineUsers.size
        });
      }
      
      // Broadcast updated online count to ALL clients
      io.emit('online-users-update', {
        count: onlineUsers.size,
        users: Array.from(onlineUsers.values()).map(u => ({
          _id: u.userData._id,
          username: u.userData.username,
          email: u.userData.email,
          profilePicture: u.userData.profilePicture,
          color: u.userData.color,
          lastSeen: u.lastSeen
        }))
      });
      
      console.log(`👤 ${username || 'User'} is online. Total online: ${onlineUsers.size}`);
      
    } catch (error) {
      console.error('User online error:', error.message);
    }
  });

  socket.on('join-room', async (data) => {
    try {
      const { roomId, userId, username, token } = data;
      
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
      
      // Get room users in this room
      const clients = await io.in(roomId).fetchSockets();
      const roomUsers = clients.map(client => ({
        id: client.id,
        username: client.data.username || 'User',
        userId: client.data.userId
      }));
      
      // Join the room
      socket.join(roomId);
      socket.data.username = username;
      socket.data.userId = userId;
      
      console.log(`👤 User ${username} joined room: ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId: userId,
        username: username,
        users: [...roomUsers, { id: socket.id, username, userId }]
      });
      
      // Send current users to the new user
      socket.emit('room-users', {
        users: roomUsers
      });
      
      // Log room join activity
      if (mongoose.connection.readyState === 1) {
        const room = await Room.findById(roomId);
        if (room) {
          await createActivity(
            userId,
            'room_joined',
            `${username} joined "${room.name}"`,
            roomId,
            'joined',
            { roomName: room.name }
          );
        }
      }
      
    } catch (error) {
      console.error('Join room socket error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle code changes
  socket.on('code-change', (data) => {
    const { roomId, code, language } = data;
    socket.to(roomId).emit('code-update', {
      code,
      language,
      userId: socket.data.userId
    });
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    const { roomId, position, username } = data;
    socket.to(roomId).emit('cursor-update', {
      userId: socket.data.userId,
      position,
      username
    });
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { roomId, message, username } = data;
    io.to(roomId).emit('new-message', {
      userId: socket.data.userId,
      username,
      message,
      timestamp: new Date()
    });
  });

  // Handle AI chat
  socket.on('ai-chat', (data) => {
    const { roomId, message, username } = data;
    
    // Simulate AI response (in production, integrate with actual AI)
    setTimeout(() => {
      const responses = [
        "I can help you with that! Here's a suggestion...",
        "Based on your code, I recommend adding error handling.",
        "Consider using async/await for better asynchronous flow.",
        "Your code looks good! One optimization tip: cache frequently used values.",
        "I notice you're missing input validation. Add checks for edge cases.",
        "Great job! Consider adding comments for complex logic.",
        "You might want to break this function into smaller, reusable functions.",
        "This code could benefit from using modern ES6+ features.",
        "Consider adding unit tests to ensure code reliability.",
        "I see a potential memory leak here. Make sure to clean up event listeners."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      io.to(roomId).emit('ai-response', {
        userId: 'ai',
        username: 'AI Assistant',
        message: randomResponse,
        timestamp: new Date()
      });
    }, 2000);
  });

  // Handle document changes
  socket.on('document-change', async (data) => {
    const { roomId, userId, content, token } = data;
    
    try {
      if (!token) return;
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
      const room = await Room.findById(roomId);
      if (!room) return;
      
      let user;
      if (mongoose.connection.readyState === 1 && !userId.toString().startsWith('demo_')) {
        user = await User.findById(userId);
      }
      
      if (!user && !userId.toString().startsWith('demo_')) return;
      
      const canEdit = 
        room.createdBy.toString() === userId ||
        room.members.some(member => 
          member.userId.toString() === userId && 
          ['owner', 'editor'].includes(member.role)
        );
      
      if (!canEdit) {
        socket.emit('error', { message: 'No permission to edit' });
        return;
      }
      
      socket.to(roomId).emit('document-update', {
        content: content,
        userId: userId,
        username: user?.username || 'User',
        timestamp: new Date()
      });
      
      if (mongoose.connection.readyState === 1 && !userId.toString().startsWith('demo_')) {
        await Room.findByIdAndUpdate(roomId, { content: content });
        
        // Log document edit activity
        const activity = await createActivity(
          userId,
          'document_edited',
          `${user?.username || 'User'} edited "${room.name}"`,
          roomId,
          'success',
          { roomName: room.name, contentLength: content.length }
        );
        
        if (activity) {
          io.emit('new-activity', {
            time: formatTime(activity.createdAt),
            user: user?.username || 'User',
            activity: 'Document edited',
            workspace: room.name,
            status: 'completed',
            _id: activity._id,
            createdAt: activity.createdAt
          });
        }
      }
      
    } catch (error) {
      console.error('Document change error:', error);
    }
  });

  // Handle leave room
  socket.on('leave-room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    
    // Notify others
    socket.to(roomId).emit('user-left', {
      userId: socket.data.userId,
      username: socket.data.username
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    
    const userId = userSockets.get(socket.id);
    if (userId) {
      userSockets.delete(socket.id);
      
      const userData = onlineUsers.get(userId);
      if (userData) {
        userData.socketIds = userData.socketIds.filter(id => id !== socket.id);
        
        if (userData.socketIds.length === 0) {
          onlineUsers.delete(userId);
          
          // Emit user disconnected event
          io.emit('user-disconnected', {
            userId: userId,
            username: userData.userData.username,
            timestamp: new Date(),
            totalOnline: onlineUsers.size
          });
          
          // Log logout activity
          if (mongoose.connection.readyState === 1 && !userId.toString().startsWith('demo_')) {
            createActivity(
              userId,
              'logout',
              `${userData.userData.username} went offline`,
              null,
              'success'
            );
          }
        }
      }
      
      // Broadcast updated online count
      io.emit('online-users-update', {
        count: onlineUsers.size,
        users: Array.from(onlineUsers.values()).map(u => ({
          _id: u.userData._id,
          username: u.userData.username,
          email: u.userData.email,
          profilePicture: u.userData.profilePicture,
          color: u.userData.color,
          lastSeen: u.lastSeen
        }))
      });
      
      console.log(`👤 User ${userId} went offline. Total online: ${onlineUsers.size}`);
    }
  });
});

function generateShareLink() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ========== API ROUTES ==========

app.get('/', (req, res) => {
  res.json({
    message: 'CollabSpace API',
    status: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    onlineUsers: onlineUsers.size,
    oauth: {
      google: !!(process.env.GOOGLE_CLIENT_ID),
      github: !!(process.env.GITHUB_CLIENT_ID)
    },
    timestamp: new Date().toISOString()
  });
});

// ========== MEETING ROUTES ==========

// @route   GET /api/meetings
// @desc    Get all meetings for a user
// @access  Private
app.get('/api/meetings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    let meetings = [];
    
    if (mongoose.connection.readyState === 1) {
      // Find meetings where user is a participant or creator
      meetings = await Meeting.find({
        $or: [
          { createdBy: decoded.userId },
          { 'participants.userId': decoded.userId }
        ]
      }).sort({ date: -1, time: -1 });
    }
    
    res.json({
      success: true,
      meetings
    });
    
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meetings'
    });
  }
});

// @route   POST /api/meetings
// @desc    Create a new meeting
// @access  Private
app.post('/api/meetings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    const { title, description, workspaceId, date, time, duration } = req.body;

    // Validate required fields
    if (!title || !date || !time || !workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Get user info
    let username = decoded.username || 'User';
    let email = decoded.email || 'user@example.com';
    
    if (mongoose.connection.readyState === 1 && !decoded.userId.toString().startsWith('demo_')) {
      try {
        const user = await User.findById(decoded.userId);
        if (user) {
          username = user.username;
          email = user.email;
        }
      } catch (err) {
        console.log('User fetch error:', err.message);
      }
    }

    // Create new meeting - workspaceId is stored as string
    const newMeeting = new Meeting({
      title,
      description: description || '',
      workspaceId: workspaceId.toString(), // Ensure it's a string
      date,
      time,
      duration: duration || 60,
      createdBy: decoded.userId.toString(),
      participants: [{
        userId: decoded.userId.toString(),
        username: username,
        email: email,
        status: 'accepted',
        joinedAt: new Date()
      }]
    });

    let meeting;
    
    if (mongoose.connection.readyState === 1) {
      meeting = await newMeeting.save();
      
      // Log meeting creation activity
      try {
        await createActivity(
          decoded.userId,
          'meeting_created',
          `${username} scheduled meeting "${title}"`,
          workspaceId,
          'success',
          { meetingTitle: title, meetingId: meeting._id }
        );
      } catch (activityErr) {
        console.log('Activity logging error:', activityErr.message);
      }
    } else {
      // For demo mode, just return the meeting object with an ID
      meeting = {
        ...newMeeting.toObject(),
        _id: 'demo_' + Date.now()
      };
    }
    
    res.status(201).json({
      success: true,
      meeting
    });
    
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

// @route   GET /api/meetings/:id
// @desc    Get a single meeting by ID
// @access  Private
app.get('/api/meetings/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    let meeting;
    
    if (mongoose.connection.readyState === 1) {
      meeting = await Meeting.findById(req.params.id);
    }
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Check if user has access
    const hasAccess = 
      meeting.createdBy === decoded.userId ||
      meeting.participants.some(p => p.userId === decoded.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this meeting'
      });
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT /api/meetings/:id
// @desc    Update a meeting
// @access  Private
app.put('/api/meetings/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    let meeting;
    
    if (mongoose.connection.readyState === 1) {
      meeting = await Meeting.findById(req.params.id);
    }
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Check if user is the creator
    if (meeting.createdBy !== decoded.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this meeting'
      });
    }

    let updatedMeeting;
    if (mongoose.connection.readyState === 1) {
      updatedMeeting = await Meeting.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );
    } else {
      updatedMeeting = { ...meeting, ...req.body };
    }

    res.json({
      success: true,
      meeting: updatedMeeting
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   DELETE /api/meetings/:id
// @desc    Delete a meeting
// @access  Private
app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    let meeting;
    
    if (mongoose.connection.readyState === 1) {
      meeting = await Meeting.findById(req.params.id);
    }
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Check if user is the creator
    if (meeting.createdBy !== decoded.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this meeting'
      });
    }

    if (mongoose.connection.readyState === 1) {
      await Meeting.findByIdAndDelete(req.params.id);
    }

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/meetings/:id/join
// @desc    Join a meeting
// @access  Private
app.post('/api/meetings/:id/join', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    let meeting;
    
    if (mongoose.connection.readyState === 1) {
      meeting = await Meeting.findById(req.params.id);
    }
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Get user info
    let username = decoded.username || 'User';
    let email = decoded.email || 'user@example.com';
    
    if (mongoose.connection.readyState === 1 && !decoded.userId.toString().startsWith('demo_')) {
      try {
        const user = await User.findById(decoded.userId);
        if (user) {
          username = user.username;
          email = user.email;
        }
      } catch (err) {
        console.log('User fetch error:', err.message);
      }
    }

    // Check if user is already a participant
    const alreadyParticipant = meeting.participants.some(
      p => p.userId === decoded.userId
    );

    if (!alreadyParticipant && mongoose.connection.readyState === 1) {
      meeting.participants.push({
        userId: decoded.userId,
        username: username,
        email: email,
        status: 'accepted',
        joinedAt: new Date()
      });
      await meeting.save();
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ========== ACTIVITY STREAM ROUTES ==========

// Get recent activities - REAL DATA ONLY
app.get('/api/activities', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated',
        activities: [],
        onlineUsers: onlineUsers.size
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    let activities = [];
    
    if (mongoose.connection.readyState === 1) {
      // Get REAL activities from database
      activities = await Activity.find({})
        .populate('user', 'username email profilePicture color')
        .populate('workspace', 'name')
        .sort({ createdAt: -1 })
        .limit(20);
    }
    
    // Format activities
    const formattedActivities = activities.map(activity => ({
      time: formatTime(activity.createdAt),
      user: activity.user?.username || 'User',
      activity: getActivityDescription(activity.activityType),
      workspace: activity.workspace?.name || 'General',
      status: activity.status,
      _id: activity._id,
      createdAt: activity.createdAt,
      isReal: true
    }));
    
    res.json({
      success: true,
      activities: formattedActivities,
      count: formattedActivities.length,
      onlineUsers: onlineUsers.size,
      message: `Showing ${formattedActivities.length} activities`
    });
    
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities',
      activities: [],
      onlineUsers: onlineUsers.size
    });
  }
});

// Get online users count - REAL COUNT
app.get('/api/online-users', (req, res) => {
  const onlineUsersList = Array.from(onlineUsers.values()).map(u => ({
    _id: u.userData._id,
    username: u.userData.username,
    email: u.userData.email,
    profilePicture: u.userData.profilePicture,
    color: u.userData.color,
    lastSeen: u.lastSeen,
    connectedAt: u.connectedAt
  }));
  
  res.json({
    success: true,
    count: onlineUsers.size,
    users: onlineUsersList,
    timestamp: new Date()
  });
});

// Helper function for activity descriptions
function getActivityDescription(type) {
  const descriptions = {
    'login': 'User logged in',
    'logout': 'User logged out',
    'file_upload': 'File uploaded',
    'meeting_started': 'Meeting started',
    'meeting_created': 'Meeting scheduled',
    'branch_merged': 'Branch merged',
    'code_review': 'Code review completed',
    'task_completed': 'Task completed',
    'room_created': 'Workspace created',
    'room_joined': 'Joined workspace',
    'room_deleted': 'Workspace deleted',
    'room_left': 'Left workspace',
    'user_invited': 'User invited',
    'document_edited': 'Document edited',
    'api_call_failed': 'API call failed',
    'workspace_created': 'New room created',
    'workspace_deleted': 'Workspace deleted',
    'comment_added': 'Comment added',
    'deployment_successful': 'Deployment successful',
    'user_joined_workspace': 'User joined workspace',
    'code_execution': 'Code executed',
    'ai_suggestion': 'AI suggestions generated'
  };
  
  return descriptions[type] || type.replace('_', ' ');
}

// ========== AUTH ROUTES ==========

app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login?error=google_failed' }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { 
          userId: req.user._id, 
          username: req.user.username, 
          email: req.user.email 
        },
        process.env.JWT_SECRET || 'collabspace-secret-key',
        { expiresIn: '30d' }
      );
      
      res.redirect(`http://localhost:3000/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        color: req.user.color
      }))}`);
      
    } catch (error) {
      res.redirect(`http://localhost:3000/login?error=oauth_failed`);
    }
  }
);

app.get('/api/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/login?error=github_failed' }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { 
          userId: req.user._id, 
          username: req.user.username, 
          email: req.user.email 
        },
        process.env.JWT_SECRET || 'collabspace-secret-key',
        { expiresIn: '30d' }
      );
      
      res.redirect(`http://localhost:3000/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        color: req.user.color
      }))}`);
      
    } catch (error) {
      res.redirect(`http://localhost:3000/login?error=oauth_failed`);
    }
  }
);

// ========== REGULAR AUTH ROUTES ==========

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', email);

    // Demo accounts
    const demoAccounts = {
      'demo@example.com': 'demo123',
      'test@example.com': 'test123',
      'user@example.com': 'password'
    };
    
    if (demoAccounts[email] && demoAccounts[email] === password) {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const demoUser = {
        _id: 'demo_' + Date.now(),
        username: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email: email,
        profilePicture: '',
        color: colors[Math.floor(Math.random() * colors.length)],
        createdAt: new Date(),
        isDemo: true
      };
      
      const token = jwt.sign(
        { userId: demoUser._id, username: demoUser.username, email: demoUser.email },
        process.env.JWT_SECRET || 'collabspace-secret-key',
        { expiresIn: '30d' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: demoUser
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const demoUser = {
        _id: 'user_' + Date.now(),
        username: email.split('@')[0] || 'User',
        email: email,
        profilePicture: '',
        color: colors[Math.floor(Math.random() * colors.length)],
        createdAt: new Date(),
        isDemo: true
      };
      
      const token = jwt.sign(
        { userId: demoUser._id, username: demoUser.username, email: demoUser.email },
        process.env.JWT_SECRET || 'collabspace-secret-key',
        { expiresIn: '30d' }
      );
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: demoUser
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'collabspace-secret-key',
      { expiresIn: '30d' }
    );
    
    // Log login activity
    await createActivity(
      user._id,
      'login',
      `${user.username} logged in`,
      null,
      'success'
    );
    
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        color: user.color
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        color: user.color
      }
    });
    
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    
    await createActivity(
      decoded.userId,
      'logout',
      'User logged out',
      null,
      'success'
    );
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// ========== ROOM ROUTES ==========

app.post('/api/rooms/create', async (req, res) => {
  try {
    const { name, description, type, visibility, invitedEmails = [] } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const shareLink = generateShareLink();
    
    const room = new Room({
      name: name || `${user.username}'s Workspace`,
      description: description || '',
      type: type || 'code',
      createdBy: user._id,
      visibility: visibility || 'private',
      shareLink: shareLink,
      members: [{
        userId: user._id,
        role: 'owner',
        joinedAt: new Date()
      }],
      content: '// Welcome to your code workspace!\n// Start coding here...'
    });
    
    await room.save();
    
    // Log workspace creation activity
    await createActivity(
      user._id,
      'workspace_created',
      `${user.username} created workspace "${room.name}"`,
      room._id,
      'created',
      { roomName: room.name, type: room.type }
    );
    
    // Send invitations if any
    if (invitedEmails && invitedEmails.length > 0) {
      const sentEmails = [];
      for (const email of invitedEmails) {
        const cleanEmail = email.toLowerCase().trim();
        
        const invitationToken = jwt.sign(
          { 
            email: cleanEmail,
            roomId: room._id,
            inviterId: user._id,
            role: 'editor',
            timestamp: Date.now()
          },
          process.env.JWT_SECRET || 'collabspace-secret-key',
          { expiresIn: '7d' }
        );
        
        const inviteLink = `http://localhost:3000/accept-invite/${invitationToken}`;
        
        room.invitations.push({
          email: cleanEmail,
          token: invitationToken,
          role: 'editor',
          status: 'pending',
          invitedBy: user._id,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        
        const emailSent = await sendInvitationEmail(
          cleanEmail,
          user.username || user.email.split('@')[0],
          room.name,
          inviteLink
        );
        
        if (emailSent) {
          sentEmails.push(cleanEmail);
          
          await createActivity(
            user._id,
            'user_invited',
            `${user.username} invited ${cleanEmail} to "${room.name}"`,
            room._id,
            'success',
            { inviteeEmail: cleanEmail }
          );
        }
      }
      await room.save();
    }
    
    // Emit socket event for real-time activity
    io.emit('new-activity', {
      time: formatTime(new Date()),
      user: user.username,
      activity: 'New room created',
      workspace: room.name,
      status: 'created',
      _id: room._id,
      createdAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        type: room.type,
        visibility: room.visibility,
        shareLink: room.shareLink,
        createdBy: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        memberCount: room.members.length,
        invitationCount: invitedEmails.length,
        createdAt: room.createdAt
      }
    });
    
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workspace'
    });
  }
});

// Get Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collabspace-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    let rooms = [];
    
    if (mongoose.connection.readyState === 1) {
      rooms = await Room.find({
        $or: [
          { createdBy: user._id },
          { 'members.userId': user._id },
          { visibility: 'public' }
        ]
      })
      .populate('createdBy', 'username email profilePicture')
      .populate('members.userId', 'username email profilePicture')
      .sort({ createdAt: -1 });
    } else {
      rooms = [];
    }
    
    res.json({
      success: true,
      rooms: rooms,
      count: rooms.length
    });
    
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rooms'
    });
  }
});

// ========== HEALTH CHECK ==========

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    onlineUsers: onlineUsers.size,
    oauth: {
      google: !!(process.env.GOOGLE_CLIENT_ID),
      github: !!(process.env.GITHUB_CLIENT_ID)
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/auth/urls', (req, res) => {
  res.json({
    google: process.env.GOOGLE_CLIENT_ID ? 'http://localhost:5000/api/auth/google' : null,
    github: process.env.GITHUB_CLIENT_ID ? 'http://localhost:5000/api/auth/github' : null
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 CollabSpace Server Started!');
  console.log('='.repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📊 DB Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`👥 Online Users: ${onlineUsers.size} (REAL COUNT)`);
  console.log('');
  console.log('🔐 OAuth Login URLs:');
  if (process.env.GOOGLE_CLIENT_ID) {
    console.log(`   Google: http://localhost:${PORT}/api/auth/google`);
  }
  if (process.env.GITHUB_CLIENT_ID) {
    console.log(`   GitHub: http://localhost:${PORT}/api/auth/github`);
  }
  console.log('');
  console.log('💻 Code Execution:');
  console.log(`   POST   /api/execute`);
  console.log(`   Supported Languages: JavaScript, Python, Java, C++, C, HTML, CSS, SQL, TypeScript, Go, Rust, PHP`);
  console.log('');
  console.log('🤖 AI Suggestions:');
  console.log(`   POST   /api/ai/suggest`);
  console.log('');
  console.log('📅 Meeting Routes:');
  console.log(`   GET    /api/meetings`);
  console.log(`   POST   /api/meetings`);
  console.log(`   GET    /api/meetings/:id`);
  console.log(`   PUT    /api/meetings/:id`);
  console.log(`   DELETE /api/meetings/:id`);
  console.log(`   POST   /api/meetings/:id/join`);
  console.log('');
  console.log('💡 Features:');
  console.log('   ✅ REAL Online Users Tracking');
  console.log('   ✅ REAL Activity Stream');
  console.log('   ✅ Code Execution (12+ Languages)');
  console.log('   ✅ AI Code Suggestions');
  console.log('   ✅ Meeting Scheduling');
  console.log('   ✅ Private workspaces');
  console.log('   ✅ Email invitations');
  console.log('   ✅ Real-time collaboration');
  console.log('='.repeat(50) + '\n');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Working in demo mode...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB reconnected!');
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await cleanupTempFiles();
  process.exit();
});