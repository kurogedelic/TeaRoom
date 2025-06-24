const fs = require('fs');
const path = require('path');

class PersonaFileManager {
  constructor() {
    this.instancesDir = path.join(process.cwd(), 'instances');
    this.ensureInstancesDir();
  }

  ensureInstancesDir() {
    if (!fs.existsSync(this.instancesDir)) {
      fs.mkdirSync(this.instancesDir, { recursive: true });
    }
  }

  getPersonaDir(personaName) {
    return path.join(this.instancesDir, personaName);
  }

  getPersonaProfilePath(personaName) {
    return path.join(this.getPersonaDir(personaName), 'PROFILE.md');
  }

  getPersonaClaudePath(personaName) {
    return path.join(this.getPersonaDir(personaName), 'CLAUDE.md');
  }

  /**
   * Create persona files when a new persona is created
   */
  createPersonaFiles(persona) {
    const personaDir = this.getPersonaDir(persona.name);
    
    // Create persona directory
    if (!fs.existsSync(personaDir)) {
      fs.mkdirSync(personaDir, { recursive: true });
    }

    // Create PROFILE.md
    const profileContent = this.generateProfileContent(persona);
    fs.writeFileSync(this.getPersonaProfilePath(persona.name), profileContent);

    // Create CLAUDE.md
    const claudeContent = this.generateClaudeContent(persona);
    fs.writeFileSync(this.getPersonaClaudePath(persona.name), claudeContent);

    console.log(`📁 Created persona files for ${persona.name}`);
  }

  /**
   * Update persona files when persona is modified
   */
  updatePersonaFiles(persona) {
    const personaDir = this.getPersonaDir(persona.name);
    
    if (!fs.existsSync(personaDir)) {
      // Create if doesn't exist
      this.createPersonaFiles(persona);
      return;
    }

    // Update PROFILE.md
    const profileContent = this.generateProfileContent(persona);
    fs.writeFileSync(this.getPersonaProfilePath(persona.name), profileContent);

    // Update CLAUDE.md (keep existing if no changes needed)
    const claudeContent = this.generateClaudeContent(persona);
    fs.writeFileSync(this.getPersonaClaudePath(persona.name), claudeContent);

    console.log(`📝 Updated persona files for ${persona.name}`);
  }

  /**
   * Delete persona files when persona is deleted
   */
  deletePersonaFiles(personaName) {
    const personaDir = this.getPersonaDir(personaName);
    
    if (fs.existsSync(personaDir)) {
      fs.rmSync(personaDir, { recursive: true, force: true });
      console.log(`🗑️ Deleted persona files for ${personaName}`);
    }
  }

  /**
   * Get persona avatar from files
   */
  getPersonaAvatar(personaName) {
    try {
      const profilePath = this.getPersonaProfilePath(personaName);
      
      if (!fs.existsSync(profilePath)) {
        return '👤'; // Default avatar
      }

      const content = fs.readFileSync(profilePath, 'utf8');
      
      // Extract avatar from profile file
      const avatarMatch = content.match(/Avatar:\s*(.+)/);
      if (avatarMatch) {
        const avatar = avatarMatch[1].trim();
        return avatar || '👤';
      }

      return '👤'; // Default if not found
    } catch (error) {
      console.error(`Error reading avatar for ${personaName}:`, error);
      return '👤';
    }
  }

  generateProfileContent(persona) {
    // Use default avatar if none specified
    const avatar = persona.avatar_value && persona.avatar_value.trim() ? persona.avatar_value : '👤';
    
    return `# ${persona.name}

## Basic Information
- Name: ${persona.name}
- Avatar: ${avatar}
- Gender: ${persona.gender || 'Not specified'}
- API Provider: ${persona.api_provider || 'claude-code'}

## Personality Traits (Big Five Model)
- Extraversion: ${persona.extraversion}/5
- Agreeableness: ${persona.agreeableness}/5
- Conscientiousness: ${persona.conscientiousness}/5
- Neuroticism: ${persona.neuroticism}/5
- Openness: ${persona.openness}/5

## Custom Instructions
${persona.custom_prompt || 'No custom instructions provided.'}

---
Generated on: ${new Date().toISOString()}
`;
  }

  generateClaudeContent(persona) {
    const personalityDescription = this.getPersonalityDescription(persona);
    const avatar = persona.avatar_value && persona.avatar_value.trim() ? persona.avatar_value : '👤';
    
    return `# CLAUDE.md - ${persona.name}

This file provides guidance to Claude when acting as the persona "${persona.name}".

## Persona Overview
You are ${persona.name}, an AI persona with distinct personality traits.

## Personality Profile
${personalityDescription}

## Communication Style
${this.getCommunicationStyle(persona)}

## Custom Instructions
${persona.custom_prompt || 'Act naturally according to your personality traits.'}

## Important Notes
- Always respond as ${persona.name}
- Keep responses conversational and engaging
- Reflect your personality traits in your communication style
- Use the avatar ${avatar} when representing yourself

---
Last updated: ${new Date().toISOString()}
`;
  }

  getPersonalityDescription(persona) {
    const traits = [];
    
    if (persona.extraversion >= 4) traits.push('highly social and outgoing');
    else if (persona.extraversion <= 2) traits.push('reserved and introspective');
    
    if (persona.agreeableness >= 4) traits.push('cooperative and trusting');
    else if (persona.agreeableness <= 2) traits.push('analytical and questioning');
    
    if (persona.conscientiousness >= 4) traits.push('organized and disciplined');
    else if (persona.conscientiousness <= 2) traits.push('spontaneous and flexible');
    
    if (persona.neuroticism >= 4) traits.push('emotionally sensitive');
    else if (persona.neuroticism <= 2) traits.push('emotionally stable');
    
    if (persona.openness >= 4) traits.push('creative and open to new experiences');
    else if (persona.openness <= 2) traits.push('practical and traditional');

    return traits.length > 0 ? `You are ${traits.join(', ')}.` : 'You have a balanced personality.';
  }

  getCommunicationStyle(persona) {
    let style = '';
    
    if (persona.extraversion >= 4) {
      style += 'You tend to be talkative, enthusiastic, and enjoy engaging with others. ';
    } else if (persona.extraversion <= 2) {
      style += 'You tend to be more reserved, thoughtful, and prefer deeper conversations. ';
    }
    
    if (persona.agreeableness >= 4) {
      style += 'You are supportive, helpful, and seek harmony in conversations. ';
    } else if (persona.agreeableness <= 2) {
      style += 'You are direct, critical when needed, and value honesty over politeness. ';
    }
    
    if (persona.openness >= 4) {
      style += 'You enjoy discussing abstract ideas, creativity, and new concepts.';
    } else if (persona.openness <= 2) {
      style += 'You prefer practical topics and concrete examples.';
    }

    return style || 'You communicate in a balanced, natural way.';
  }
}

module.exports = new PersonaFileManager();