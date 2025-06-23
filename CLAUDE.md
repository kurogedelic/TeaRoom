# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TeaRoom is a conversational AI platform where multiple Claude instances chat with distinct personalities using the Big Five personality model. Each persona has unique traits, leading to diverse and engaging interactions through a modern 2-column web interface.

**Current Status**: TeaRoom 2.0 fully operational - modern 2-column chat interface with AI personas

### Version 2.0 Features (Implemented)
- **2-Column Layout**: Room list (left) + active chat (right) ✅
- **Room-based Conversations**: Multiple simultaneous AI conversations ✅
- **Enhanced Persona System**: Claude Code integration, custom prompts, Big Five traits ✅
- **Modern UI/UX**: Flat design, dark mode toggle, i18n (English/Japanese) ✅
- **Real-time Features**: Streaming responses, typing indicators, @mentions ✅
- **Persistent Storage**: SQLite database for conversations and personas ✅
- **Auto Chat**: AI personas automatically continue conversations ✅
- **File-based Avatars**: PNG/JPG avatar support with upload ✅

## Essential Commands

### Start TeaRoom
```bash
./start-tearoom.sh                # Start with web interface
./start-tearoom.sh --verbose      # Start with verbose logging
```

### Manage Personas
```bash
./manage-personas.sh              # Interactive persona management
npm run personas                  # Alternative way to manage personas
```

### Development Commands
```bash
npm install                       # Install dependencies
npm start                        # Equivalent to ./start-tearoom.sh
npm run server                   # Start chat server only
npm run web                      # Start web interface only

# Production Dependencies (TeaRoom 2.0)
# Core: express, socket.io, sqlite3, multer, js-yaml
# Development: nodemon
# Testing: jest, supertest (available but tests need implementation)
```

### Stop Services
```bash
# Use Ctrl+C in the terminal where start-tearoom.sh is running
# Or kill processes manually:
killall node

# For complete cleanup of all TeaRoom processes:
./cleanup-tearoom.sh
```

## Architecture Overview

### Current Architecture (TeaRoom 1.0)
TeaRoom consists of three main components that work together:

1. **Chat Server** (`server.js`): Message routing hub that runs on port 9000+ (auto-finds available port)
   - RESTful API for message passing between personas
   - Stores conversation history in memory
   - Writes port to `.server-port` file for other components

2. **Web Interface** (`web-preview.js`): Browser-based UI running on port 9080+ (auto-finds available port)
   - Setup wizard for configuring conversations
   - Real-time chat visualization with Socket.io
   - API endpoints for starting/stopping conversations
   - Writes port to `.preview-port` file

3. **Claude Integration** (`claude-oneshot.sh`): AI conversation engine
   - Spawned as separate processes for each persona
   - Reads personality from `PROFILE.md` files
   - Handles conversation flow, timeouts, and retries
   - Supports both English and Japanese conversations

### Planned Architecture (TeaRoom 2.0)
**Modern 2-Column Chat Interface** - See NEWPLAN.MD for complete details

1. **Database Layer**: SQLite for persistent storage
   - Rooms, Personas, Messages, Settings tables
   - Migration system for schema updates

2. **API Server**: Enhanced REST API + WebSocket
   - Room management endpoints
   - Real-time message streaming
   - Claude Code SDK integration

3. **Modern Frontend**: Responsive 2-column layout
   - Left: Room/Persona management
   - Right: Active chat interface
   - Modal wizards for creation flows

### Persona System

Each persona lives in `instances/[Name]/`:
- `PROFILE.md`: Big Five personality traits and communication style
- `CLAUDE.md`: Claude-specific conversation guidelines

The system dynamically creates conversation loops where personas:
- Check for new messages
- Generate responses based on personality
- Handle timeouts and silence-breaking
- Maintain conversation history

## Key Features

- **Dynamic Port Management**: Both servers auto-find available ports and communicate via shared files
- **Big Five Personality Model**: Personas have scored traits (1-5) for Extraversion, Agreeableness, Conscientiousness, Neuroticism, and Openness
- **Multi-language Support**: Conversations in English or Japanese
- **Timeout Handling**: Personas retry and follow-up if no response received
- **Silence Breaking**: Automatic conversation starters during quiet periods

## Development Notes

### Current System (TeaRoom 1.0)
- The system uses bash scripts extensively for process management
- Claude API calls use the `--model sonnet` flag
- Verbose mode (`VERBOSE=true`) enables detailed debugging output
- Process management handles cleanup on termination
- File-based communication between components (`.server-port`, `.preview-port`)
- No build step required - all code runs directly in Node.js
- Web interface uses vanilla HTML/JS with Socket.io for real-time updates

### TeaRoom 2.0 Development
- **Claude Code SDK Integration**: Stream JSON responses with `--output-format stream-json`
- **Database**: SQLite with automatic migration system
- **Testing**: Jest test suite for API endpoints and core logic
- **i18n**: English/Japanese language support via JSON locale files
- **Theming**: CSS variables for light/dark mode switching
- **Real-time**: Enhanced WebSocket events for typing indicators and status updates

## Process Management

- **Automatic Cleanup**: `start-tearoom.sh` automatically cleans up existing processes before starting
- **Health Monitoring**: Claude instances monitor server health every 30 seconds and exit if server is unresponsive
- **Graceful Shutdown**: TeaRoom ensures all child processes are terminated when stopping
- **Manual Cleanup**: Use `./cleanup-tearoom.sh` to forcefully clean up any remaining processes

## File Structure Context

### Current Structure (TeaRoom 1.0)
- `public/`: Web interface files (wizard, chat, router)
  - `wizard.html`: Setup interface for configuring conversations
  - `chat.html`: Real-time chat visualization interface
  - `personas.html`: Persona creation and management interface
  - `uploads/`: User-uploaded avatar images
- `instances/`: Persona directories with individual personalities
- `archive/`: Old scripts and previous CLAUDE.md versions
- Root bash scripts: Main entry points and utilities
- `server.js`: Express server handling API endpoints and message routing
- `web-preview.js`: Web server with Socket.io for real-time updates

### Planned Structure (TeaRoom 2.0)
```
TeaRoom/
├── NEWPLAN.MD              # Detailed implementation plan
├── server/
│   ├── app.js              # Main Express application
│   ├── database/
│   │   ├── schema.sql      # Database schema
│   │   ├── migrations/     # Schema migration files
│   │   └── seeders/        # Development data
│   ├── routes/
│   │   ├── rooms.js        # Room management API
│   │   ├── personas.js     # Persona management API
│   │   └── messages.js     # Message handling API
│   └── services/
│       ├── claude-sdk.js   # Claude Code SDK integration
│       └── websocket.js    # Real-time communication
├── public/
│   ├── index.html          # Main 2-column interface
│   ├── css/
│   │   ├── main.css        # Core styles with CSS variables
│   │   └── themes.css      # Light/dark theme definitions
│   ├── js/
│   │   ├── app.js          # Main application logic
│   │   ├── i18n.js         # Internationalization
│   │   └── components/     # Reusable UI components
│   └── locales/
│       ├── en.json         # English translations
│       └── ja.json         # Japanese translations
└── tests/                  # Jest test files
```

### Key Configuration Files
- `tearoom.db`: SQLite database (created automatically)
- `.server-port`, `.preview-port`: Dynamic port files
- `package.json`: Dependencies and npm scripts