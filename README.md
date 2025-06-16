# TeaRoom 🍵

A conversational AI platform where multiple Claude instances chat with distinct personalities using the Big Five personality model.

## Overview

TeaRoom creates an environment where AI personas can have natural conversations. Each persona has unique personality traits based on the Big Five model, leading to diverse and engaging interactions through a beautiful web interface.

## ✨ Features

- **🎭 Personality-Driven AI**: Create unique personas with Big Five personality traits
- **🖼️ Custom Avatars**: Upload images or choose emojis for persona icons
- **🌐 Web-based Interface**: Intuitive setup wizard and real-time chat visualization
- **💬 User Interaction**: Jump into conversations with one-time queries
- **🎯 Goal-Oriented Chats**: Conversations automatically conclude with summary reports
- **🌍 Multi-language Support**: Conversations in English or Japanese
- **⚡ Real-time Updates**: Smooth message animations and live connection status

## 🚀 Quick Start

### Prerequisites
- **Claude Code** (claude.ai/code) - Required for AI functionality
- **Node.js** (v14+) and npm
- **macOS or Linux** (tested on macOS)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kurogedelic/TeaRoom.git
   cd TeaRoom
   npm install
   ```

2. **Start TeaRoom**
   ```bash
   ./start-tearoom.sh
   ```

3. **Open in browser**
   - Browser opens automatically at http://localhost:8080
   - Use the setup wizard to create personas and start conversations

## 🎭 Creating Personas

1. Click "Manage Personas" in the web interface
2. Create new personas with:
   - Custom name and avatar (image upload or emoji)
   - Big Five personality traits (1-5 scale)
   - Personal introduction
3. Each persona gets unique conversation patterns based on their traits

### Starting Conversations

1. **Web Interface** (Recommended)
   - Navigate to http://localhost:8080
   - Use the setup wizard to configure your chat
   - Select language, personas, and optional topic

2. **Command Line**
   ```bash
   ./manage-personas.sh  # Create/manage personas
   ./start-tearoom.sh    # Start the platform
   ```

### During Conversations

- **Watch Live**: Real-time message updates in the web interface
- **User Interaction**: Click "Interrupt" to send one-time queries
- **Auto-completion**: Conversations end with summary reports when goals are achieved

## 🏗️ Architecture

TeaRoom consists of three main components:

- **Chat Server** (`server.js`): Message routing between personas
- **Web Interface** (`web-preview.js`): Browser-based UI with Socket.io
- **Claude Integration** (`claude-oneshot.sh`): AI conversation engine

## 🎨 Customization

### Big Five Personality Traits

Each persona is defined by five core traits (1-5 scale):

1. **Extraversion**: Reserved ← → Social
2. **Agreeableness**: Analytical ← → Cooperative  
3. **Conscientiousness**: Spontaneous ← → Organized
4. **Neuroticism**: Stable ← → Sensitive
5. **Openness**: Practical ← → Creative

### Avatar Options

- **Image Upload**: Upload custom avatar images (up to 5MB)
- **Emoji Selection**: Choose from 60+ built-in emojis
- **Automatic Fallback**: Default personas use placeholder icons

## 🛠️ Development

### Project Structure

```
TeaRoom/
├── start-tearoom.sh        # Main launcher
├── cleanup-tearoom.sh      # Process cleanup
├── server.js              # Chat message server
├── web-preview.js         # Web interface & API
├── claude-oneshot.sh      # Claude conversation engine
├── public/                # Web assets
│   ├── wizard.html        # Setup wizard
│   ├── chat.html         # Live chat interface
│   ├── personas.html     # Persona management
│   └── uploads/          # User avatar uploads
└── instances/            # Persona storage
    └── README.md         # Setup instructions
```

### API Endpoints

- `GET /api/status`: Check conversation status
- `GET /api/personas`: List available personas  
- `POST /api/start`: Start conversation
- `POST /api/stop`: End conversation
- `POST /api/user-message`: Send user interruption
- `POST /api/upload-avatar`: Upload persona avatar

## 🔧 Troubleshooting

### Common Issues

- **Port conflicts**: TeaRoom auto-finds available ports
- **Process cleanup**: Use `./cleanup-tearoom.sh` to reset
- **Claude not found**: Ensure Claude Code is installed and accessible

### Manual Cleanup

```bash
./cleanup-tearoom.sh  # Clean up all processes
killall node          # Emergency stop
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Created by **Leo Kuroshita** ([@kurogedelic](https://github.com/kurogedelic))

## 🙏 Acknowledgments

- Built for use with [Claude Code](https://claude.ai/code)
- Inspired by personality psychology and the Big Five model
- Designed for creative AI conversations and personality exploration

---

*Made with ❤️ and ☕ for better AI conversations*
