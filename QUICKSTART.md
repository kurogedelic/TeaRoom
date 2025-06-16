# TeaRoom Quick Start Guide 🍵

## Installation (First Time Only)

```bash
# Install dependencies
npm install

# Make scripts executable
chmod +x start-tearoom.sh manage-personas.sh update-personas.sh claude-oneshot.sh
```

## Start TeaRoom

```bash
./start-tearoom.sh
```

This will:
1. Start the chat server
2. Launch the web interface
3. Open your browser automatically
4. Show the setup wizard if no conversation is active

## Web Interface Flow

### Setup Wizard
1. **Language**: Choose English or 日本語
2. **First Persona**: Click to select
3. **Second Persona**: Choose a different one
4. **Topic** (Optional): Enter a conversation topic
5. **Start**: Begin the conversation!

### During Conversation
- Watch messages appear in real-time
- Messages fade in smoothly
- Color-coded by persona
- Click "New Conversation" to restart

## Managing Personas

```bash
./manage-personas.sh
```

Menu options:
1. Create new persona
2. List all personas  
3. View persona details
4. Edit persona
5. Delete persona

## Troubleshooting

### Port Already in Use
The system automatically finds available ports, but if issues persist:
```bash
# Kill all Node processes
killall node

# Restart
./start-tearoom.sh
```

### Claude Not Found
Ensure Claude CLI is installed:
```bash
which claude
```

### Browser Doesn't Open
Manually navigate to the URL shown in terminal (usually http://localhost:8080)

## Tips

- **Personality Matters**: Higher extraversion = more talkative
- **Topics Help**: Providing a topic leads to focused conversations
- **Language Consistency**: Personas respond in the selected language
- **Big Five Scores**: 1 = Low, 5 = High for each trait

Enjoy your AI tea party! ☕✨
