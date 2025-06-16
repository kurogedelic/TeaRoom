const express = require('express');
const http = require('http');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

// Find available port
async function findAvailablePort(startPort = 8080) {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise((resolve, reject) => {
        const testServer = net.createServer();
        testServer.once('error', reject);
        testServer.once('listening', () => {
          testServer.close();
          resolve();
        });
        testServer.listen(port);
      });
      return port;
    } catch (e) {
      continue;
    }
  }
  throw new Error('No available ports found');
}

// Socket.io setup
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/wizard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wizard.html'));
});

app.get('/personas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'personas.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
  // Check if conversation is active by checking if we have active processes
  const conversationActive = global.teaRoomProcesses && global.teaRoomProcesses.length > 0;
  res.json({ conversationActive });
});

app.get('/api/personas', (req, res) => {
  const personasDir = path.join(__dirname, 'instances');
  const personas = [];
  
  try {
    const dirs = fs.readdirSync(personasDir);
    dirs.forEach(dir => {
      if (dir !== '.DS_Store' && fs.statSync(path.join(personasDir, dir)).isDirectory()) {
        // Try to read basic info from PROFILE.md
        let traits = '';
        let icon = '👤'; // Default icon
        try {
          const profilePath = path.join(personasDir, dir, 'PROFILE.md');
          const profile = fs.readFileSync(profilePath, 'utf8');
          
          // Extract personality type line
          const match = profile.match(/Generated from Big Five traits|\*\*Personality Type\*\*: (.+)/);
          if (match) traits = 'Big Five Personality';
          
          // Extract icon from profile
          const iconMatch = profile.match(/\*\*Icon\*\*:\s*(.+)/);
          if (iconMatch) {
            icon = iconMatch[1].trim();
          }
        } catch (e) {}
        
        personas.push({
          name: dir,
          traits: traits,
          icon: icon
        });
      }
    });
    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load personas' });
  }
});

// Helper function to get persona info
async function getPersonaInfo(personaName) {
  try {
    const profilePath = path.join(__dirname, 'instances', personaName, 'PROFILE.md');
    const profile = fs.readFileSync(profilePath, 'utf8');
    
    let icon = '👤'; // Default icon
    const iconMatch = profile.match(/\*\*Icon\*\*:\s*(.+)/);
    if (iconMatch) {
      icon = iconMatch[1].trim();
    }
    
    return { icon };
  } catch (error) {
    return { icon: '👤' };
  }
}

// Start TeaRoom API
app.post('/api/start', async (req, res) => {
  const { language, persona1, persona2, topic } = req.body;
  
  try {
    // Get the server port
    const serverPortFile = path.join(__dirname, '.server-port');
    let serverPort = '3000';
    if (fs.existsSync(serverPortFile)) {
      serverPort = fs.readFileSync(serverPortFile, 'utf8').trim();
    }
    
    // Store active personas globally with their icons
    const persona1Info = await getPersonaInfo(persona1);
    const persona2Info = await getPersonaInfo(persona2);
    
    global.activePersonas = [persona1, persona2];
    global.personaIcons = {
      [persona1]: persona1Info.icon,
      [persona2]: persona2Info.icon
    };
    
    // Start persona 1
    const env1 = { 
      ...process.env, 
      LANGUAGE: language, 
      TOPIC: topic || '',
      VERBOSE: process.env.VERBOSE || 'false',
      OTHER_PERSONA: persona2,  // Tell persona1 who to talk to
      START_DELAY: '0'  // Start immediately
    };
    const persona1Process = spawn('bash', [
      path.join(__dirname, 'claude-oneshot.sh')
    ], {
      cwd: path.join(__dirname, 'instances', persona1),
      env: env1,
      detached: true,
      stdio: process.env.VERBOSE === 'true' ? 'inherit' : 'ignore'
    });
    
    // Unref to allow parent to exit
    persona1Process.unref();
    
    // Start persona 2 with delay
    const env2 = { 
      ...process.env, 
      LANGUAGE: language, 
      TOPIC: topic || '',
      VERBOSE: process.env.VERBOSE || 'false',
      OTHER_PERSONA: persona1,  // Tell persona2 who to talk to
      START_DELAY: '5'  // Wait 5 seconds before starting
    };
    const persona2Process = spawn('bash', [
      path.join(__dirname, 'claude-oneshot.sh')
    ], {
      cwd: path.join(__dirname, 'instances', persona2),
      env: env2,
      detached: true,
      stdio: process.env.VERBOSE === 'true' ? 'inherit' : 'ignore'
    });
    
    // Unref to allow parent to exit
    persona2Process.unref();
    
    // Store process IDs for cleanup
    global.teaRoomProcesses = [
      persona1Process.pid,
      persona2Process.pid
    ];
    
    res.json({ 
      success: true, 
      message: 'TeaRoom started successfully',
      chatUrl: `http://localhost:${serverPort}`
    });
    
  } catch (error) {
    console.error('Failed to start TeaRoom:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Stop conversation API
app.post('/api/stop', (req, res) => {
  if (global.teaRoomProcesses) {
    console.log('Stopping conversation, killing processes:', global.teaRoomProcesses);
    
    global.teaRoomProcesses.forEach(pid => {
      try {
        // Try multiple kill methods to ensure processes are terminated
        console.log(`Attempting to kill process ${pid}`);
        
        // First try SIGTERM
        process.kill(pid, 'SIGTERM');
        
        // Wait a moment and then force kill if still running
        setTimeout(() => {
          try {
            process.kill(pid, 0); // Check if process is still running
            console.log(`Process ${pid} still running, force killing...`);
            process.kill(pid, 'SIGKILL');
          } catch (e) {
            // Process is already dead, which is good
          }
        }, 2000);
        
      } catch (e) {
        console.error('Failed to kill process:', pid, e.message);
      }
    });
    
    // Also try to kill any remaining claude processes
    setTimeout(() => {
      const { spawn } = require('child_process');
      spawn('pkill', ['-f', 'claude-oneshot.sh'], { stdio: 'ignore' });
      spawn('pkill', ['-f', 'claude.*TeaRoom'], { stdio: 'ignore' });
    }, 1000);
    
    global.teaRoomProcesses = [];
    global.activePersonas = [];
  }
  res.json({ success: true });
});

// Image upload API
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get persona icons API
app.get('/api/persona-icons', (req, res) => {
  const icons = global.personaIcons || {};
  res.json(icons);
});

// Create/Update persona API
app.post('/api/personas', (req, res) => {
  const { name, gender, icon, iconType, introduction, traits } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }
  
  try {
    const personaDir = path.join(__dirname, 'instances', name);
    
    // Create persona directory if it doesn't exist
    if (!fs.existsSync(personaDir)) {
      fs.mkdirSync(personaDir, { recursive: true });
    }
    
    // Generate personality description based on Big Five traits
    const traitDescriptions = {
      extraversion: ['reserved', 'moderate', 'social', 'very social', 'extremely social'],
      agreeableness: ['analytical', 'somewhat analytical', 'balanced', 'cooperative', 'very cooperative'],
      conscientiousness: ['spontaneous', 'somewhat spontaneous', 'balanced', 'organized', 'very organized'],
      neuroticism: ['very stable', 'stable', 'balanced', 'sensitive', 'very sensitive'],
      openness: ['practical', 'somewhat practical', 'balanced', 'creative', 'very creative']
    };
    
    // Create PROFILE.md content
    const profileContent = `# ${name}

**Gender**: ${gender}
**Icon**: ${icon}

## Introduction
${introduction || 'No introduction provided.'}

## Big Five Personality Traits

Generated from Big Five traits:
- **Extraversion**: ${traits.extraversion}/5 (${traitDescriptions.extraversion[traits.extraversion - 1]})
- **Agreeableness**: ${traits.agreeableness}/5 (${traitDescriptions.agreeableness[traits.agreeableness - 1]})
- **Conscientiousness**: ${traits.conscientiousness}/5 (${traitDescriptions.conscientiousness[traits.conscientiousness - 1]})
- **Neuroticism**: ${traits.neuroticism}/5 (${traitDescriptions.neuroticism[traits.neuroticism - 1]})
- **Openness**: ${traits.openness}/5 (${traitDescriptions.openness[traits.openness - 1]})

## Personality Description

Based on your Big Five personality traits, you are ${name}, a ${gender.toLowerCase()} with the following characteristics:

**Social Style**: You are ${traitDescriptions.extraversion[traits.extraversion - 1]} in social situations.
**Approach**: You tend to be ${traitDescriptions.agreeableness[traits.agreeableness - 1]} in your interactions.
**Organization**: You are ${traitDescriptions.conscientiousness[traits.conscientiousness - 1]} in your approach to tasks.
**Emotional Style**: You are ${traitDescriptions.neuroticism[traits.neuroticism - 1]} emotionally.
**Thinking Style**: You are ${traitDescriptions.openness[traits.openness - 1]} in your thinking.

${introduction ? `\n## Personal Introduction\n${introduction}` : ''}

Remember to stay in character as ${name} during conversations, reflecting these personality traits in your responses.
`;
    
    // Write PROFILE.md
    fs.writeFileSync(path.join(personaDir, 'PROFILE.md'), profileContent);
    
    res.json({ success: true, message: 'Persona created successfully' });
    
  } catch (error) {
    console.error('Error creating persona:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete persona API
app.delete('/api/personas/:name', (req, res) => {
  const { name } = req.params;
  
  try {
    const personaDir = path.join(__dirname, 'instances', name);
    
    if (fs.existsSync(personaDir)) {
      // Remove directory and all contents
      fs.rmSync(personaDir, { recursive: true, force: true });
      res.json({ success: true, message: 'Persona deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Persona not found' });
    }
  } catch (error) {
    console.error('Error deleting persona:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get individual persona API
app.get('/api/persona/:name', (req, res) => {
  const { name } = req.params;
  
  try {
    const profilePath = path.join(__dirname, 'instances', name, 'PROFILE.md');
    
    if (fs.existsSync(profilePath)) {
      const profile = fs.readFileSync(profilePath, 'utf8');
      res.json({ success: true, profile });
    } else {
      res.status(404).json({ success: false, error: 'Persona profile not found' });
    }
  } catch (error) {
    console.error('Error loading persona:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User message API
app.post('/api/user-message', async (req, res) => {
  const { message } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  
  try {
    // Get the server port
    const serverPortFile = path.join(__dirname, '.server-port');
    let serverPort = '3000';
    if (fs.existsSync(serverPortFile)) {
      serverPort = fs.readFileSync(serverPortFile, 'utf8').trim();
    }
    
    // Get active personas
    const activePersonas = global.activePersonas || [];
    if (activePersonas.length < 2) {
      return res.status(400).json({ success: false, error: 'No active conversation found' });
    }
    
    // Send message to both personas as if from "User"
    const messageData = {
      from: 'User',
      to: 'all', // Send to all participants
      message: message.trim()
    };
    
    const response = await axios.post(`http://localhost:${serverPort}/send`, messageData);
    
    // Handle both single message and multiple messages response
    const messageId = response.data.message ? response.data.message.id : 
                      (response.data.messages && response.data.messages.length > 0 ? response.data.messages[0].id : null);
    
    res.json({ success: true, messageId: messageId });
    
  } catch (error) {
    console.error('Failed to send user message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fetch messages from chat server
const axios = require('axios');
let messages = [];
let serverPort = 3000;

// Read server port from file
function getServerPort() {
  try {
    if (fs.existsSync('.server-port')) {
      serverPort = parseInt(fs.readFileSync('.server-port', 'utf8'));
    }
  } catch (error) {
    console.error('Could not read server port, using default:', error.message);
  }
  return serverPort;
}

async function fetchMessages() {
  try {
    const port = getServerPort();
    const response = await axios.get(`http://localhost:${port}/history`);
    messages = response.data;
    io.emit('messages', messages);
  } catch (error) {
    console.error('Error fetching messages:', error.message);
  }
}

// Update messages every second
setInterval(fetchMessages, 1000);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('messages', messages);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Cleanup function to kill all child processes
function cleanup() {
  console.log('Cleaning up processes...');
  
  if (global.teaRoomProcesses) {
    global.teaRoomProcesses.forEach(pid => {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (e) {
        // Process already dead
      }
    });
  }
  
  // Kill any remaining claude processes
  const { spawn } = require('child_process');
  spawn('pkill', ['-f', 'claude-oneshot.sh'], { stdio: 'ignore' });
  spawn('pkill', ['-f', 'claude.*TeaRoom'], { stdio: 'ignore' });
  
  // Clean up port files
  try {
    fs.unlinkSync('.preview-port');
    fs.unlinkSync('.server-port');
  } catch (e) {
    // Files might not exist
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Start server on available port
(async () => {
  try {
    const port = await findAvailablePort(process.env.PREVIEW_PORT || 8080);
    server.listen(port, () => {
      console.log(`Web preview running at: http://localhost:${port}`);
      // Write port to file for script to read
      require('fs').writeFileSync('.preview-port', port.toString());
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
