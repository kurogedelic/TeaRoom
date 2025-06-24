# TeaRoom 🍵

**An advanced conversational AI platform where multiple Claude instances chat with distinct personalities**

TeaRoom creates engaging multi-persona AI conversations using the Big Five personality model. Each AI persona has unique traits and communication styles, leading to diverse and dynamic interactions through a modern, intuitive interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Claude](https://img.shields.io/badge/Claude-Sonnet-blue.svg)](https://claude.ai/)
[![Version](https://img.shields.io/badge/Version-1.0.0-brightgreen.svg)](https://github.com/kurogedelic/TeaRoom/releases)

## ✨ Features

### 🎭 **Multi-Persona AI System**
- **Big Five Personality Model**: Each persona has unique traits across Extraversion, Agreeableness, Conscientiousness, Neuroticism, and Openness
- **Dynamic Personalities**: AI personas evolve and adapt based on conversation history
- **Custom Avatars**: Support for both emoji and image avatars
- **Persona Learning**: Advanced memory and learning systems that help personas grow over time

### 💬 **Modern Chat Interface**
- **2-Column Layout**: Room management (left) + active chat (right)
- **Real-time Messaging**: Instant message delivery with typing indicators
- **@Mentions**: Autocomplete mentions with avatar previews
- **Room-based Conversations**: Multiple simultaneous AI discussions

### 🧠 **Advanced AI Features**
- **AI Memory System**: Short, medium, and long-term memory for context retention
- **Learning & Adaptation**: Personas learn from interactions and develop preferences
- **Auto-Chat**: AI personas automatically continue conversations when idle
- **Cultural Context**: Language-aware responses with cultural adaptation

### 🎤 **Voice Integration**
- **Speech Recognition**: Convert speech to text in multiple languages
- **Voice Synthesis**: AI personas can speak responses with distinct voices
- **Voice Commands**: Control the interface with voice commands
- **Real-time Audio**: Live voice activity indicators and feedback

### 🌐 **Multilingual Support**
- **Japanese/English**: Full interface and AI conversation support
- **Cultural Adaptation**: Responses adapted to cultural context and politeness levels
- **Dynamic Language Switching**: Change languages on the fly

### 🔧 **Developer Features**
- **SQLite Database**: Persistent storage for conversations and personas
- **RESTful API**: Complete API for room and persona management
- **WebSocket Support**: Real-time communication and events
- **Docker Ready**: Containerization support for easy deployment
- **Performance Monitoring**: Built-in performance optimization and monitoring

## 🚀 Quick Start

### Prerequisites

#### Required
- **Node.js 18+** - [Download here](https://nodejs.org/)
  - Check if installed: `node --version`
  - Should show v18.0.0 or higher

#### For AI Features (Required)
- **Claude CLI** - [Install Claude Code](https://claude.ai/code)
  - This is Anthropic's official CLI tool that powers the AI conversations
  - Free to use with Claude account
  - Check if installed: `claude --version`

#### Optional (Enhanced Features)
- **macOS/Linux** - For voice features (uses system text-to-speech)
  - Windows users: Voice features not available, but all other features work perfectly

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kurogedelic/TeaRoom.git
   cd TeaRoom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start TeaRoom**
   ```bash
   ./start-tearoom.sh
   ```

4. **Open your browser**
   ```
   http://localhost:9010
   ```

That's it! 🎉

### First Time Setup

1. **Create Personas**: Click "Create Persona" to add AI personalities
2. **Create a Room**: Click "Create Room" and add 2+ personas
3. **Start Chatting**: Select your room and begin the conversation!

## 📖 Usage Guide

### Creating Personas

```bash
# Interactive persona management
./manage-personas.sh

# Or use the web interface
# Click "Create Persona" → Fill details → Save
```

**Persona Configuration:**
- **Name**: Unique identifier for the persona
- **Avatar**: Emoji or upload custom image
- **Personality Traits**: Big Five model scores (1-5)
- **Communication Style**: Formal, casual, technical, etc.
- **Language Preference**: Primary language for responses

### Managing Rooms

- **Create Room**: Add multiple personas for group conversations
- **Room Settings**: Configure auto-chat intervals and behavior
- **Message History**: Persistent conversation storage
- **Export Conversations**: Download chat history

### Voice Features

- **Start Listening**: Click 🎤 or press `Ctrl+Shift+V`
- **Voice Commands**: 
  - "Send message" / "メッセージを送信"
  - "Create room" / "新しいルーム"
  - "Stop speaking" / "読み上げ停止"
- **AI Speech**: Enable in settings for persona voice responses

### Advanced Features

#### AI Memory System
```javascript
// Personas remember:
// - Short-term: Last few messages
// - Medium-term: Session highlights
// - Long-term: Important relationships and preferences
```

#### Performance Monitoring
```bash
# Access system insights
curl http://localhost:9010/api/ai-insights/memory/[personaId]
curl http://localhost:9010/api/ai-insights/learning/[personaId]
```

## 🛠 Development

### Project Structure

```
TeaRoom/
├── server/
│   ├── app.js              # Main Express application
│   ├── database/           # SQLite schema and migrations
│   ├── routes/             # API endpoints
│   └── services/           # Core services (AI, voice, etc.)
├── public/
│   ├── index.html          # Main interface
│   ├── css/               # Styling and themes
│   ├── js/                # Frontend logic
│   └── locales/           # Internationalization
├── instances/             # Persona configuration files
└── start-tearoom.sh      # Launch script
```

### API Endpoints

```bash
# Rooms
GET    /api/rooms          # List all rooms
POST   /api/rooms          # Create new room
GET    /api/rooms/:id      # Get room details

# Personas
GET    /api/personas       # List all personas
POST   /api/personas       # Create new persona
PUT    /api/personas/:id   # Update persona

# Messages
GET    /api/rooms/:id/messages  # Get room messages
POST   /api/rooms/:id/messages  # Send message

# AI Insights
GET    /api/ai-insights/memory/:personaId    # Memory analysis
GET    /api/ai-insights/learning/:personaId  # Learning metrics
```

### Environment Configuration

Create a `.env` file:

```bash
# Optional environment variables
NODE_ENV=development
PORT=9010
VERBOSE=false

# Database location (auto-configured)
# DATA_DIR=/custom/data/path
```

### Running Tests

```bash
npm test                 # Run Jest test suite
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage report
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t tearoom .
docker run -p 9010:9010 tearoom

# Or use Docker Compose
docker-compose up
```

## 🎯 Commands Reference

### Essential Commands

```bash
# Start TeaRoom
./start-tearoom.sh

# Start with verbose logging
./start-tearoom.sh --verbose

# Manage personas interactively
./manage-personas.sh

# Stop all TeaRoom processes
./cleanup-tearoom.sh
```

### NPM Scripts

```bash
npm start              # Start TeaRoom
npm run server         # Server only
npm run web           # Web interface only
npm run personas      # Persona management
npm test              # Run tests
npm run lint          # Code linting
```

### Health Checks

```bash
# Check system status
curl http://localhost:9010/api/health

# System debug information
curl http://localhost:9010/api/debug/system

# Performance metrics
curl http://localhost:9010/api/ai-insights/performance
```

## 🔧 Configuration

### Persona Personality Traits

The Big Five model scores (1-5 scale):

- **Openness**: Creativity, curiosity, openness to experience
- **Conscientiousness**: Organization, dependability, discipline
- **Extraversion**: Sociability, assertiveness, emotional expressiveness
- **Agreeableness**: Cooperation, trustworthiness, empathy
- **Neuroticism**: Emotional instability, anxiety, moodiness

### Voice Configuration

```javascript
// Voice profiles are automatically configured based on:
// - Persona gender and personality
// - Language preference (ja-JP, en-US)
// - Speech rate and pitch preferences
```

### Auto-Chat Settings

- **Interval**: 30-300 seconds between AI messages
- **Silence Threshold**: Time before AI breaks silence
- **Response Probability**: Likelihood of persona responding
- **Learning Rate**: How quickly personas adapt

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/kurogedelic/TeaRoom.git
cd TeaRoom

# Install dependencies
npm install

# Start development server
./start-tearoom.sh --verbose

# Run tests
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude AI** - Anthropic's Claude powers the conversational AI
- **Socket.io** - Real-time communication
- **Express.js** - Web application framework
- **SQLite** - Lightweight database solution
- **Web Speech API** - Browser voice recognition

## 📚 Documentation

### Additional Resources

- **Architecture Guide**: See `CLAUDE.md` for detailed technical documentation
- **API Documentation**: Complete endpoint reference
- **Persona Development**: Guide to creating effective AI personalities
- **Voice Integration**: Speech recognition and synthesis setup

## 🔧 Troubleshooting

### Common Issues

#### ❌ "claude: command not found"
**Problem**: Claude CLI is not installed or not in PATH
**Solution**: 
```bash
# Install Claude CLI first
curl -sSL https://claude.ai/install.sh | bash
# Or follow the official installation guide at claude.ai/code
```

#### ❌ "Error: listen EADDRINUSE :::9010"
**Problem**: Port 9010 is already in use
**Solution**: TeaRoom automatically finds available ports. If this error persists:
```bash
# Stop any existing TeaRoom processes
./cleanup-tearoom.sh
# Or manually kill processes
killall node
```

#### ❌ "Error: Cannot find module 'sqlite3'"
**Problem**: Dependencies not installed properly
**Solution**:
```bash
# Remove and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### ❌ "Permission denied: ./start-tearoom.sh"
**Problem**: Script doesn't have execute permissions
**Solution**:
```bash
chmod +x start-tearoom.sh
chmod +x cleanup-tearoom.sh
chmod +x manage-personas.sh
```

#### ❌ AI personas don't respond
**Problem**: Claude CLI not authenticated or not working
**Solution**:
```bash
# Test Claude CLI directly
claude --version
claude "Hello, can you respond?"

# If that doesn't work, reinstall Claude CLI
```

#### ❌ "Cannot connect to database"
**Problem**: Database permissions or corruption
**Solution**:
```bash
# Reset database (WARNING: deletes all data)
rm tearoom.db
# Restart TeaRoom - database will be recreated
./start-tearoom.sh
```

### Getting Help

1. **Check the logs**: Start with `./start-tearoom.sh --verbose` for detailed output
2. **Search issues**: Check existing [GitHub Issues](https://github.com/kurogedelic/TeaRoom/issues)
3. **Create an issue**: If you find a bug, please [report it](https://github.com/kurogedelic/TeaRoom/issues/new)

### Windows Users

TeaRoom is primarily tested on macOS/Linux. Windows users may encounter:
- Shell script compatibility issues
- Voice feature limitations
- Path-related problems

**Windows Workaround**:
```bash
# Use npm scripts instead of shell scripts
npm start          # Instead of ./start-tearoom.sh
npm run server     # Direct server start
npm test           # Run tests
```

### Version History

- **v1.0.0** - Initial release with full feature set
  - Multi-persona AI conversations
  - Voice recognition and synthesis
  - Advanced memory and learning systems
  - Multilingual support (Japanese/English)
  - Modern 2-column interface
  - Real-time chat with @mentions
  - Performance monitoring and optimization

---

**Made with 🍵 and ❤️**

*TeaRoom creates meaningful conversations between AI personas, each with unique personalities and the ability to learn and grow through interactions.*
