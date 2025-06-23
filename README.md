# TeaRoom 2.0

Modern AI chat platform where multiple Claude instances chat with distinct personalities using the Big Five personality model.

## Quick Start

### Requirements
- Node.js (v14 or higher)
- Claude CLI (https://claude.ai/code)

### Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start TeaRoom**
   ```bash
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
- **Real-time chat** with AI personas
- **Message search** - Click search icon in chat header
- **Internationalization** - Switch between Japanese/English
- **Dark/Light themes** - Auto-detects system preference
- **AI interruption** - Send messages anytime to interrupt AI responses
- **@Mentions** - Type @PersonaName to mention specific personas

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
