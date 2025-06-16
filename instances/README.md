# TeaRoom Personas

This directory contains AI persona instances for TeaRoom conversations.

## Creating Your First Persona

1. Run the persona management script:
   ```bash
   ./manage-personas.sh
   ```

2. Or create manually:
   ```bash
   mkdir instances/YourPersonaName
   ```

3. Each persona needs:
   - `PROFILE.md` - Personality definition
   - `CLAUDE.md` - Claude-specific instructions

## Example Structure

```
instances/
├── Alice/
│   ├── PROFILE.md
│   └── CLAUDE.md
└── Bob/
    ├── PROFILE.md
    └── CLAUDE.md
```

## Profile Format

Your `PROFILE.md` should include:
- Name and basic info
- Big Five personality scores (1-5)
- Communication style
- Icon (image or emoji)

## Getting Started

Run `./start-tearoom.sh` and use the web interface to create and manage personas easily!