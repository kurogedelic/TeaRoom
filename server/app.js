const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const net = require('net');
const multer = require('multer');

// Database
const database = require('./database/database');

// Services
const claudeSDK = require('./services/claude-sdk');
const healthCheck = require('./services/health-check');
const performanceOptimizer = require('./services/performance-optimizer');
const VoiceWebSocketHandler = require('./services/voice-websocket');

// Data paths
const dataPaths = require('./utils/data-paths');

// Routes
const roomsRouter = require('./routes/rooms');
const personasRouter = require('./routes/personas');
const messagesRouter = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// Increase max listeners to prevent warning
server.setMaxListeners(20);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploads from Application Support directory
app.use('/uploads', express.static(dataPaths.getUploadsPath()));

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = dataPaths.getUploadsPath();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
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
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// API Routes
app.use('/api/rooms', roomsRouter);
app.use('/api/personas', personasRouter);
app.use('/api/rooms', messagesRouter); // /api/rooms/:roomId/messages
app.use('/api/ai-insights', require('./routes/ai-insights'));

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await database.getAllSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Key and value are required'
      });
    }
    
    await database.setSetting(key, value);
    
    res.json({
      success: true,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update setting'
    });
  }
});

// Avatar upload endpoint
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload avatar'
    });
  }
});

// Health check endpoint
// Comprehensive health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const healthStatus = healthCheck.getHealthResponse();
    const httpStatus = healthStatus.healthy ? 200 : 503;
    
    res.status(httpStatus).json({
      success: healthStatus.healthy,
      data: healthStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check service unavailable',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {},
        version: '2.0.0'
      }
    });
  }
});

// Simple health check for load balancers
app.get('/api/ping', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'pong',
    timestamp: new Date().toISOString() 
  });
});

// Claude SDK test endpoint
app.get('/api/test-claude', async (req, res) => {
  try {
    const result = await claudeSDK.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-conversation control
app.post('/api/auto-conversation/toggle', (req, res) => {
  const { enabled } = req.body;
  claudeSDK.autoConversationEnabled = Boolean(enabled);
  
  if (!claudeSDK.autoConversationEnabled) {
    // Stop all auto-conversations
    for (const roomId of claudeSDK.roomTimers.keys()) {
      claudeSDK.stopAutoConversation(roomId);
    }
  }
  
  res.json({
    success: true,
    data: {
      autoConversationEnabled: claudeSDK.autoConversationEnabled
    }
  });
});

app.get('/api/auto-conversation/status', (req, res) => {
  res.json({
    success: true,
    data: {
      autoConversationEnabled: claudeSDK.autoConversationEnabled,
      activeRooms: Array.from(claudeSDK.roomTimers.keys())
    }
  });
});

// System debug endpoint
app.get('/api/debug/system', (req, res) => {
  try {
    const systemInfo = dataPaths.getSystemInfo();
    res.json({
      success: true,
      data: {
        ...systemInfo,
        server: {
          nodeEnv: process.env.NODE_ENV,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          pid: process.pid
        },
        paths: {
          workingDirectory: process.cwd(),
          scriptPath: __filename,
          publicPath: path.join(__dirname, '../public')
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle specific problematic routes
app.get('/history', (req, res) => {
  // Redirect to main app
  res.redirect('/');
});

// IMPORTANT: Keep this after all API routes
// Serve the main app for all non-API routes
app.get('*', (req, res) => {
  // Block infinite loop requests
  if (req.path === '/history') {
    return res.redirect('/');
  }
  
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, '../public/index.html');
  res.sendFile(indexPath);
});

// Initialize Voice WebSocket Handler
let voiceHandler;
try {
  voiceHandler = new VoiceWebSocketHandler(io);
  console.log('✅ Voice WebSocket handler initialized');
} catch (error) {
  console.error('❌ Failed to initialize voice handler:', error);
}

// WebSocket event handlers
const activeRooms = new Map(); // roomId -> Set of socket IDs
const userSockets = new Map(); // socket.id -> user info

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join room
  socket.on('room:join', async (data) => {
    try {
      const { roomId, userName = 'User' } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      // Verify room exists
      const room = await database.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Join socket room
      socket.join(`room-${roomId}`);
      
      // Track active room
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      activeRooms.get(roomId).add(socket.id);
      
      // Store user info
      userSockets.set(socket.id, { roomId, userName });
      
      // Notify others about user joining
      socket.to(`room-${roomId}`).emit('user:joined', {
        userName,
        timestamp: new Date().toISOString()
      });
      
      // Send current room info
      const roomPersonas = await database.getRoomPersonas(roomId);
      socket.emit('room:joined', {
        room,
        personas: roomPersonas
      });
      
      // Start auto-conversation for this room
      claudeSDK.startAutoConversation(database, roomId, io, activeRooms);
      
      console.log(`User ${userName} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Leave room
  socket.on('room:leave', () => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { roomId, userName } = userInfo;
      
      socket.leave(`room-${roomId}`);
      
      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).delete(socket.id);
        if (activeRooms.get(roomId).size === 0) {
          activeRooms.delete(roomId);
        }
      }
      
      // Notify others about user leaving
      socket.to(`room-${roomId}`).emit('user:left', {
        userName,
        timestamp: new Date().toISOString()
      });
      
      // Stop auto-conversation if no users left in room
      if (activeRooms.get(roomId).size === 0) {
        claudeSDK.stopAutoConversation(roomId);
      }
      
      console.log(`User ${userName} left room ${roomId}`);
    }
    
    userSockets.delete(socket.id);
  });
  
  // Send message
  socket.on('message:send', async (data) => {
    try {
      const userInfo = userSockets.get(socket.id);
      if (!userInfo) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }
      
      const { roomId, userName } = userInfo;
      const { content, reply_to_id } = data;
      
      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }
      
      // Create message in database
      const result = await database.createMessage(
        roomId,
        'user',
        userName,
        content.trim(),
        null, // sender_id for user messages
        reply_to_id || null
      );
      
      // Get the created message with full info
      const message = await database.get(`
        SELECT m.*, 
               reply_to.content as reply_to_content,
               reply_to.sender_name as reply_to_sender_name
        FROM messages m
        LEFT JOIN messages reply_to ON m.reply_to_id = reply_to.id
        WHERE m.id = ?
      `, [result.lastID]);
      
      // Broadcast to all users in the room
      io.to(`room-${roomId}`).emit('message:new', message);
      
      console.log(`Message sent in room ${roomId} by ${userName}`);
      
      // Reset auto-conversation timer due to user activity
      claudeSDK.resetAutoConversationTimer(database, roomId, io, activeRooms);
      
      // Generate AI responses asynchronously with typing indicators
      // Each persona will send their response immediately when completed
      const messageData = {
        roomId: roomId,
        content: message.content,
        sender_type: message.sender_type,
        sender_name: message.sender_name,
        sender_id: message.sender_id
      };
      
      claudeSDK.processMessage(messageData, io)
        .catch(error => {
          console.error('Error generating AI responses:', error);
        });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Typing indicator
  socket.on('message:typing', (data) => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { roomId, userName } = userInfo;
      const { isTyping } = data;
      
      socket.to(`room-${roomId}`).emit('user:typing', {
        userName,
        isTyping,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const userInfo = userSockets.get(socket.id);
    if (userInfo) {
      const { roomId, userName } = userInfo;
      
      // Leave socket room
      socket.leave(`room-${roomId}`);
      
      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).delete(socket.id);
        if (activeRooms.get(roomId).size === 0) {
          activeRooms.delete(roomId);
          // Stop auto-conversation when room becomes empty
          claudeSDK.stopAutoConversation(roomId);
        }
      }
      
      // Notify others about user leaving
      socket.to(`room-${roomId}`).emit('user:left', {
        userName,
        timestamp: new Date().toISOString()
      });
      
      console.log(`User ${userName} disconnected from room ${roomId}`);
    }
    
    userSockets.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// Find available port
async function findAvailablePort(startPort = 9000) {
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

// Start server
async function startServer() {
  try {
    // Initialize data directories
    console.log('🍵 TeaRoom 2.0 Data Locations:');
    console.log(`📁 Data Directory: ${dataPaths.getDataPath()}`);
    console.log(`🗄️ Database: ${dataPaths.getDatabasePath()}`);
    console.log(`📎 Uploads: ${dataPaths.getUploadsPath()}`);
    console.log(`📝 Logs: ${dataPaths.getLogsPath()}`);
    console.log('');

    // Create symlink for easy access
    dataPaths.createDataSymlink();

    // Initialize database
    await database.initialize();
    console.log('Database initialized successfully');
    
    // Find available port
    const port = await findAvailablePort(process.env.PORT || 9000);
    
    server.listen(port, () => {
      console.log(`TeaRoom 2.0 server running at: http://localhost:${port}`);
      
      // Start performance monitoring
      performanceOptimizer.startMonitoring();
      console.log('🚀 Performance optimization enabled');
      
      console.log('API Endpoints:');
      console.log('  GET  /api/rooms - List rooms');
      console.log('  POST /api/rooms - Create room');
      console.log('  GET  /api/personas - List personas');
      console.log('  POST /api/personas - Create persona');
      console.log('  GET  /api/rooms/:roomId/messages - Get messages');
      console.log('  POST /api/rooms/:roomId/messages - Send message');
      console.log('  GET  /api/health - Health check');
      console.log('  GET  /api/test-claude - Test Claude CLI');
      console.log('  GET  /api/debug/system - System debug info');
      console.log('  GET  /api/ai-insights/* - AI memory and learning insights');
      
      // Write port to file for other components
      fs.writeFileSync('.server-port', port.toString());
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('🔄 Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`🛑 Received ${signal}, shutting down gracefully`);
  
  try {
    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      console.log('⚠️ Force exit - graceful shutdown took too long');
      process.exit(1);
    }, 5000); // 5 second timeout
    
    // Cleanup Claude SDK
    console.log('🧹 Cleaning up Claude SDK...');
    claudeSDK.cleanup();
    
    // Close server
    console.log('🔌 Closing server...');
    await new Promise((resolve) => {
      server.close((err) => {
        if (err) console.error('Error closing server:', err);
        resolve();
      });
    });
    
    // Close database
    console.log('🗄️ Closing database...');
    await database.close();
    
    clearTimeout(forceExitTimeout);
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export app for testing
module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}