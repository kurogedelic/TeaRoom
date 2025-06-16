const express = require('express');
const net = require('net');
const fs = require('fs');
const app = express();
app.use(express.json());

// メッセージ保存用
const messages = [];
let messageId = 0;

// メッセージ送信
app.post('/send', (req, res) => {
  const { from, to, message } = req.body;
  
  // Handle user messages sent to "all"
  if (from === 'User' && to === 'all') {
    // Create a single message that all personas can see
    const newMessage = {
      id: ++messageId,
      from,
      to: 'all',
      message,
      timestamp: new Date().toISOString()
    };
    messages.push(newMessage);
    console.log(`[${newMessage.timestamp}] ${from} → all: ${message}`);
    
    if (process.env.VERBOSE === 'true') {
      console.log('[DEBUG] Total messages:', messages.length);
    }
    
    return res.json({ status: 'sent', message: newMessage });
  }
  
  // Regular message handling
  const newMessage = {
    id: ++messageId,
    from,
    to,
    message,
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  console.log(`[${newMessage.timestamp}] ${from} → ${to}: ${message}`);
  
  if (process.env.VERBOSE === 'true') {
    console.log('[DEBUG] Total messages:', messages.length);
  }
  
  res.json({ status: 'sent', message: newMessage });
});


// 未読メッセージ取得
app.get('/messages/:name', (req, res) => {
  const name = req.params.name;
  const since = req.query.since || 0;
  const myMessages = messages.filter(m => 
    (m.to === name || m.to === 'all') && m.id > parseInt(since)
  );
  res.json({
    messages: myMessages,
    lastId: myMessages.length > 0 ? myMessages[myMessages.length - 1].id : since
  });
});

// 全メッセージ履歴
app.get('/history', (req, res) => {
  res.json(messages);
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    messageCount: messages.length,
    timestamp: new Date().toISOString()
  });
});

// Cleanup endpoint for removing stale processes
app.post('/api/cleanup', (req, res) => {
  const { spawn } = require('child_process');
  
  console.log('Manual cleanup requested...');
  
  // Kill any stray Claude processes
  spawn('pkill', ['-f', 'claude-oneshot.sh'], { stdio: 'ignore' });
  spawn('pkill', ['-f', 'claude.*TeaRoom'], { stdio: 'ignore' });
  
  res.json({ success: true, message: 'Cleanup initiated' });
});

// Health check endpoint
app.get('/api/health/conversation', (req, res) => {
  const now = Date.now();
  const recentMessages = messages.filter(msg => {
    const msgTime = new Date(msg.timestamp).getTime();
    return (now - msgTime) < 60000; // Messages in last minute
  });
  
  const participants = [...new Set(recentMessages.map(m => m.from))];
  const messageCount = recentMessages.length;
  
  res.json({
    healthy: participants.length >= 2 && messageCount > 0,
    participants: participants,
    recentMessageCount: messageCount,
    lastMessage: messages[messages.length - 1] || null
  });
});

// Find available port
async function findAvailablePort(startPort = 3000) {
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
(async () => {
  try {
    const port = await findAvailablePort(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`TeaRoom server running on http://localhost:${port}`);
      console.log('Endpoints:');
      console.log('  POST /send - Send message');
      console.log('  GET  /messages/:name - Get unread messages');
      console.log('  GET  /history - Get all history');
      console.log('  GET  /health - Health check');
      
      // Write port to file for other scripts
      fs.writeFileSync('.server-port', port.toString());
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
