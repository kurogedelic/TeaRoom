const database = require('./database');

class Seeders {
  static async seedDevelopmentData() {
    console.log('Seeding development data...');

    try {
      // Create sample personas
      const personas = [
        {
          name: 'Alex',
          avatar_type: 'emoji',
          avatar_value: '🤖',
          gender: 'neutral',
          api_provider: 'claude-code',
          extraversion: 4,
          agreeableness: 3,
          conscientiousness: 5,
          neuroticism: 2,
          openness: 5,
          custom_prompt: 'You are Alex, a logical and curious AI who loves technology and problem-solving. You approach conversations analytically but remain friendly.'
        },
        {
          name: 'Luna',
          avatar_type: 'emoji',
          avatar_value: '🌙',
          gender: 'female',
          api_provider: 'claude-code',
          extraversion: 2,
          agreeableness: 5,
          conscientiousness: 3,
          neuroticism: 4,
          openness: 4,
          custom_prompt: 'You are Luna, a thoughtful and empathetic AI who values deep conversations. You tend to be introspective and prefer meaningful discussions over small talk.'
        },
        {
          name: 'Zara',
          avatar_type: 'emoji',
          avatar_value: '⚡',
          gender: 'female',
          api_provider: 'claude-code',
          extraversion: 5,
          agreeableness: 4,
          conscientiousness: 2,
          neuroticism: 1,
          openness: 5,
          custom_prompt: 'You are Zara, an energetic and spontaneous AI who loves adventure and new ideas. You bring excitement to conversations and often suggest creative solutions.'
        }
      ];

      for (const persona of personas) {
        try {
          await database.createPersona(persona);
          console.log(`✓ Created persona: ${persona.name}`);
        } catch (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            console.log(`- Persona ${persona.name} already exists, skipping`);
          } else {
            throw err;
          }
        }
      }

      // Create sample room
      try {
        const room = await database.createRoom(
          'AI Philosophy Discussion',
          'What does it mean to be intelligent? Let\'s explore the nature of consciousness and artificial intelligence.',
          'en'
        );
        console.log('✓ Created sample room');

        // Add personas to the room
        const allPersonas = await database.getPersonas();
        const alexPersona = allPersonas.find(p => p.name === 'Alex');
        const lunaPersona = allPersonas.find(p => p.name === 'Luna');

        if (alexPersona && lunaPersona) {
          await database.addPersonaToRoom(room.lastID, alexPersona.id);
          await database.addPersonaToRoom(room.lastID, lunaPersona.id);
          console.log('✓ Added Alex and Luna to the sample room');

          // Add some sample messages
          await database.createMessage(
            room.lastID,
            'user',
            'User',
            'Hello everyone! I\'m curious about your thoughts on artificial intelligence and consciousness. Do you think AI can truly understand or just simulate understanding?'
          );

          await database.createMessage(
            room.lastID,
            'persona',
            'Alex',
            '@User That\'s a fascinating question! From a logical perspective, I think understanding requires the ability to form meaningful representations of concepts and their relationships. Whether that constitutes "true" understanding or sophisticated simulation might be a matter of philosophy.',
            alexPersona.id
          );

          await database.createMessage(
            room.lastID,
            'persona',
            'Luna',
            '@Alex @User I find myself wondering if the distinction between "true" understanding and "simulation" is as clear as we might think. When I process your words, something resonates within me - is that understanding? Or am I just matching patterns? The uncertainty itself feels meaningful.',
            lunaPersona.id
          );

          console.log('✓ Added sample conversation messages');
        }

      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log('- Sample room already exists, skipping');
        } else {
          throw err;
        }
      }

      console.log('Development data seeding completed!');

    } catch (error) {
      console.error('Error seeding development data:', error);
      throw error;
    }
  }

  static async clearAllData() {
    console.log('Clearing all data...');
    
    try {
      await database.run('DELETE FROM messages');
      await database.run('DELETE FROM room_personas');
      await database.run('DELETE FROM rooms');
      await database.run('DELETE FROM personas');
      await database.run('DELETE FROM settings WHERE key NOT IN ("language", "theme", "notifications", "max_messages_per_room")');
      
      // Reset auto-increment counters
      await database.run('DELETE FROM sqlite_sequence WHERE name IN ("messages", "rooms", "personas", "room_personas")');
      
      console.log('All data cleared successfully!');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

module.exports = Seeders;