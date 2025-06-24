# Persona Instances

This directory contains AI persona configurations. Each subdirectory represents a unique AI personality with distinct traits and behaviors.

## Example Personas

The following example personas are included to demonstrate the system:

### Alex 🤖
- **Personality**: Analytical, tech-focused, helpful
- **Traits**: High conscientiousness, moderate openness
- **Style**: Professional, clear communication

### Luna 🌙
- **Personality**: Creative, intuitive, empathetic  
- **Traits**: High openness, high agreeableness
- **Style**: Artistic, emotional, supportive

### Zara ⚡
- **Personality**: Energetic, outgoing, adventurous
- **Traits**: High extraversion, high openness
- **Style**: Enthusiastic, spontaneous, motivating

### Sage 🧙‍♂️
- **Personality**: Wise, thoughtful, philosophical
- **Traits**: High openness, low neuroticism
- **Style**: Contemplative, insightful, patient

## File Structure

Each persona directory contains:

```
PersonaName/
├── PROFILE.md      # Big Five traits and personality description
└── CLAUDE.md       # Claude-specific conversation guidelines
```

## Creating New Personas

### Option 1: Web Interface
1. Start TeaRoom: `./start-tearoom.sh`
2. Click "Create Persona" in the interface
3. Configure personality traits and settings

### Option 2: Manual Creation
1. Create a new directory: `mkdir instances/YourPersonaName`
2. Copy files from an existing persona
3. Edit `PROFILE.md` to define personality traits
4. Edit `CLAUDE.md` to set conversation style

### Option 3: Script Management
```bash
./manage-personas.sh
```

## Personality Traits (Big Five Model)

Configure each trait on a scale of 1-5:

- **Openness**: Creativity, curiosity, openness to experience
- **Conscientiousness**: Organization, dependability, discipline  
- **Extraversion**: Sociability, assertiveness, emotional expressiveness
- **Agreeableness**: Cooperation, trustworthiness, empathy
- **Neuroticism**: Emotional instability, anxiety, moodiness

## Best Practices

1. **Unique Names**: Each persona should have a distinct name
2. **Clear Personalities**: Define clear, consistent personality traits
3. **Balanced Traits**: Avoid extreme values unless intentional
4. **Cultural Context**: Consider language and cultural preferences
5. **Testing**: Test personas in conversations before deployment

## Notes

- Persona files are automatically created when using the web interface
- Manual changes to files will be reflected in the next conversation
- Backup important persona configurations before major changes
- The database stores persona metadata, but files define behavior