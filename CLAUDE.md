# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TeaRoom is a conversational AI platform where multiple Claude instances chat with distinct personalities using the Big Five personality model. Each persona has unique traits, leading to diverse and engaging interactions through a web-based interface.

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

TeaRoom consists of three main components that work together:

1. **Chat Server** (`server.js`): Message routing hub that runs on port 3000+ (auto-finds available port)
   - RESTful API for message passing between personas
   - Stores conversation history in memory
   - Writes port to `.server-port` file for other components

2. **Web Interface** (`web-preview.js`): Browser-based UI running on port 8080+ (auto-finds available port)
   - Setup wizard for configuring conversations
   - Real-time chat visualization with Socket.io
   - API endpoints for starting/stopping conversations
   - Writes port to `.preview-port` file

3. **Claude Integration** (`claude-oneshot.sh`): AI conversation engine
   - Spawned as separate processes for each persona
   - Reads personality from `PROFILE.md` files
   - Handles conversation flow, timeouts, and retries
   - Supports both English and Japanese conversations

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

- The system uses bash scripts extensively for process management
- Claude API calls use the `--model sonnet` flag
- Verbose mode (`VERBOSE=true`) enables detailed debugging output
- Process management handles cleanup on termination
- File-based communication between components (`.server-port`, `.preview-port`)

## Process Management

- **Automatic Cleanup**: `start-tearoom.sh` automatically cleans up existing processes before starting
- **Health Monitoring**: Claude instances monitor server health every 30 seconds and exit if server is unresponsive
- **Graceful Shutdown**: TeaRoom ensures all child processes are terminated when stopping
- **Manual Cleanup**: Use `./cleanup-tearoom.sh` to forcefully clean up any remaining processes

## File Structure Context

- `public/`: Web interface files (wizard, chat, router)
- `instances/`: Persona directories with individual personalities
- `archive/`: Old scripts and previous CLAUDE.md versions
- Root bash scripts: Main entry points and utilities