# TeaRoom 2.0

Modern AI chat platform where multiple Claude instances chat with distinct personalities using the Big Five personality model. Features real-time chat, AI persona management, internationalization, and comprehensive error handling.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

**One-line installation:**
```bash
curl -sSL https://raw.githubusercontent.com/your-repo/tearoom/main/install.sh | bash
```

**Manual Docker setup:**
```bash
# Clone repository
git clone https://github.com/your-repo/tearoom.git
cd tearoom

# Start with Docker Compose
docker-compose up -d

# Open http://localhost:9000
```

### Option 2: Node.js Development

**Requirements:**
- Node.js (v18 or higher)
- Claude CLI (https://claude.ai/code)

**Setup:**
```bash
# Install dependencies
npm install

# Start TeaRoom
./start-tearoom.sh
```

The application will:
- Initialize SQLite database automatically
- Start the API server
- Start the web interface  
- Open your browser to the interface

### First Time Setup

When you first run TeaRoom, it will automatically:
- Create the SQLite database (`tearoom.db`)
- Initialize database tables
- Create necessary directories
- Generate default settings

Your first steps:
1. Create 2 personas (minimum required for conversation)
2. Create a room and assign both personas
3. Start chatting!

## Usage

### Creating Personas
- Click "Create Persona" in the sidebar
- Set personality traits using Big Five model sliders
- Choose an emoji or upload an avatar
- Optional: Add custom prompts for behavior

### Creating Rooms
- Click "Create Room" in the sidebar
- Select exactly 2 personas for the conversation
- Set language preference (Japanese/English)
- Add optional discussion topic

### Features
- **Real-time chat** with AI personas using WebSocket
- **Message search** - Full-text search across all conversations
- **Internationalization** - Japanese/English with dynamic switching
- **Dark/Light themes** - Auto-detects system preference
- **AI interruption** - Send messages anytime to interrupt AI responses
- **@Mentions** - Type @PersonaName to mention specific personas
- **Auto chat** - AI personas chat automatically when room is active
- **Error handling** - Comprehensive error recovery and user-friendly messages
- **Health monitoring** - Real-time system health checks and status indicators
- **Docker support** - Easy deployment with Docker and Docker Compose
- **File-based personas** - Import personas from YAML configuration files

## Architecture

- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite with automatic migrations
- **Frontend**: Vanilla JavaScript with modern CSS
- **AI**: Claude CLI integration with streaming responses

## File Structure

```
TeaRoom/
├── start-tearoom.sh       # Main startup script
├── tearoom.db            # SQLite database (auto-created)
├── server/
│   ├── app.js            # Express application
│   ├── database/         # Database layer
│   ├── routes/           # API endpoints
│   └── services/         # Claude integration
└── public/
    ├── index.html        # Main interface
    ├── css/              # Styles and themes  
    ├── js/               # Frontend application
    └── locales/          # i18n translations
```

## Stopping TeaRoom

Press `Ctrl+C` in the terminal where you started TeaRoom, or run:
```bash
killall node
```

## Troubleshooting

- **Port conflicts**: TeaRoom auto-finds available ports
- **Database issues**: Delete `tearoom.db` to reset
- **Claude CLI errors**: Ensure Claude CLI is installed and authenticated
- **Permission errors**: Check file permissions on project directory

For detailed logs, start with:
```bash
./start-tearoom.sh --verbose
```

## 🐳 Deployment

### Docker Production Deployment

```bash
# Production with nginx reverse proxy
docker-compose --profile production up -d

# Simple production deployment
docker-compose up -d
```

### Management Commands

After installation, use these commands:

```bash
./start.sh      # Start TeaRoom
./stop.sh       # Stop TeaRoom  
./update.sh     # Update to latest version
./logs.sh       # View application logs
./backup.sh     # Backup data
```

### Environment Configuration

Create `.env` file for custom configuration:

```bash
NODE_ENV=production
PORT=9000
AUTO_CONVERSATION_ENABLED=true
ENABLE_AUTO_CHAT=true
LOG_LEVEL=info
```

### Health Monitoring

TeaRoom includes built-in health monitoring:

- **Health Check**: `http://localhost:9000/api/health`
- **Simple Ping**: `http://localhost:9000/api/ping`
- **System Debug**: `http://localhost:9000/api/debug/system`

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🔧 Development

### API Endpoints

- `GET /api/rooms` - List chat rooms
- `POST /api/rooms` - Create new room
- `GET /api/personas` - List personas
- `POST /api/personas` - Create new persona
- `GET /api/rooms/:id/messages` - Get room messages
- `POST /api/rooms/:id/messages` - Send message
- `GET /api/health` - System health check

### WebSocket Events

- `room:join` - Join a chat room
- `message:send` - Send a message
- `message:new` - Receive new message
- `user:typing` - Typing indicators
- `persona:typing` - AI typing indicators
