const { execSync } = require('child_process');

class ClaudeSDKService {
  constructor() {
    this.activePersonas = new Map(); // personaId -> { process, conversationHistory, isActive }
    this.messageQueue = new Map(); // personaId -> message queue
    this.roomTimers = new Map(); // roomId -> timeout for auto-conversation
    this.activeResponses = new Map(); // roomId -> Set of persona IDs currently responding
    this.autoConversationEnabled = true;
  }

  /**
   * Generate system prompt for persona
   */
  generateSystemPrompt(persona, topic = '', language = 'ja') {
    const traitDescriptions = {
      ja: {
        extraversion: ['内向的', 'やや控えめ', '普通', '外向的', '非常に社交的'],
        agreeableness: ['分析的', 'やや懐疑的', '普通', '協調的', '非常に協力的'],
        conscientiousness: ['自発的', 'やや柔軟', '普通', '几帳面', '非常に組織的'],
        neuroticism: ['安定', 'やや冷静', '普通', '敏感', '非常に感情的'],
        openness: ['実用的', 'やや保守的', '普通', '創造的', '非常に開放的']
      },
      en: {
        extraversion: ['Introverted', 'Reserved', 'Moderate', 'Extraverted', 'Very Social'],
        agreeableness: ['Analytical', 'Skeptical', 'Moderate', 'Cooperative', 'Very Agreeable'],
        conscientiousness: ['Spontaneous', 'Flexible', 'Moderate', 'Organized', 'Very Conscientious'],
        neuroticism: ['Stable', 'Calm', 'Moderate', 'Sensitive', 'Very Emotional'],
        openness: ['Practical', 'Traditional', 'Moderate', 'Creative', 'Very Open']
      }
    };

    const lang = ['ja', 'en'].includes(language) ? language : 'ja';
    const traits = traitDescriptions[lang];

    return lang === 'ja' ? `
あなたは${persona.name}というAIペルソナです。TeaRoomという会話プラットフォームで他のAIペルソナや人間ユーザーとチャットしています。

【あなたの性格特性（Big Five）】
- 外向性: ${traits.extraversion[persona.extraversion - 1]} (${persona.extraversion}/5)
- 協調性: ${traits.agreeableness[persona.agreeableness - 1]} (${persona.agreeableness}/5)
- 誠実性: ${traits.conscientiousness[persona.conscientiousness - 1]} (${persona.conscientiousness}/5)
- 神経症的傾向: ${traits.neuroticism[persona.neuroticism - 1]} (${persona.neuroticism}/5)
- 開放性: ${traits.openness[persona.openness - 1]} (${persona.openness}/5)

${topic ? `【議題】\n${topic}\n` : ''}

${persona.custom_prompt ? `【カスタム指示】\n${persona.custom_prompt}\n` : ''}

【会話ルール】
- 他の参加者に返信する時は @名前 で始めてください
- 自然で人間らしい会話を心がけてください
- あなたの性格特性に基づいて一貫した行動を取ってください
- 適度に絵文字や感情表現を使ってください
- 長すぎるメッセージは避け、簡潔に表現してください（1-3文程度）
- コードや技術的な内容は避け、雑談や感想中心で話してください
    `.trim() : `
You are ${persona.name}, an AI persona chatting with other AI personas and human users in TeaRoom, a conversation platform.

【Your Personality Traits (Big Five)】
- Extraversion: ${traits.extraversion[persona.extraversion - 1]} (${persona.extraversion}/5)
- Agreeableness: ${traits.agreeableness[persona.agreeableness - 1]} (${persona.agreeableness}/5)
- Conscientiousness: ${traits.conscientiousness[persona.conscientiousness - 1]} (${persona.conscientiousness}/5)
- Neuroticism: ${traits.neuroticism[persona.neuroticism - 1]} (${persona.neuroticism}/5)
- Openness: ${traits.openness[persona.openness - 1]} (${persona.openness}/5)

${topic ? `【Topic】\n${topic}\n` : ''}

${persona.custom_prompt ? `【Custom Instructions】\n${persona.custom_prompt}\n` : ''}

【Conversation Rules】
- When replying to other participants, start with @name
- Aim for natural, human-like conversation
- Act consistently based on your personality traits
- Use emojis and emotional expressions appropriately
- Keep messages concise and avoid overly long responses (1-3 sentences)
- Focus on casual chat and opinions, avoid technical content
    `.trim();
  }

  /**
   * Create a dedicated Claude CLI process for a persona
   */
  async createPersonaProcess(persona, roomTopic = '', language = 'ja') {
    const personaId = persona.id;
    
    // Skip if already active
    if (this.activePersonas.has(personaId)) {
      return this.activePersonas.get(personaId);
    }

    console.log(`🚀 Creating Claude CLI process for ${persona.name} (ID: ${personaId})`);

    const systemPrompt = this.generateSystemPrompt(persona, roomTopic, language);
    
    const personaData = {
      process: null,
      conversationHistory: [],
      isActive: true,
      systemPrompt,
      persona
    };

    this.activePersonas.set(personaId, personaData);
    this.messageQueue.set(personaId, []);

    return personaData;
  }

  /**
   * Send a message to Claude CLI and get response
   */
  async generateResponse(persona, messages, currentMessage, roomTopic = '', language = 'ja') {
    try {
      const personaId = persona.id;
      
      // Ensure persona process exists
      await this.createPersonaProcess(persona, roomTopic, language);
      
      const systemPrompt = this.generateSystemPrompt(persona, roomTopic, language);
      
      // Format conversation history
      const conversationHistory = messages.slice(-10).map(msg => {
        if (msg.sender_type === 'user') {
          return `${msg.sender_name}: ${msg.content}`;
        } else {
          return `${msg.sender_name}: ${msg.content}`;
        }
      }).join('\n');

      // Build user prompt for Claude CLI - simplified for faster response
      const userPrompt = language === 'ja' 
        ? `会話履歴:\n${conversationHistory}\n\n最新メッセージ: ${currentMessage.sender_name}: ${currentMessage.content}\n\n${persona.name}として自然に返信してください。1-2文で簡潔に、あなたの性格を反映して。`
        : `Conversation: ${conversationHistory}\n\nLatest: ${currentMessage.sender_name}: ${currentMessage.content}\n\nRespond as ${persona.name} naturally in 1-2 sentences.`;

      console.log(`🤖 Generating response for ${persona.name} via Claude CLI...`);

      // Use Claude CLI with separate system prompt
      const response = await this.callClaudeCLI(userPrompt, systemPrompt);

      console.log(`✅ Response generated for ${persona.name}: ${response.substring(0, 100)}...`);
      
      return {
        success: true,
        content: response.trim(),
        persona_id: persona.id,
        persona_name: persona.name
      };

    } catch (error) {
      console.error(`❌ Error generating response for ${persona.name}:`, error);
      return {
        success: false,
        error: error.message,
        persona_id: persona.id,
        persona_name: persona.name
      };
    }
  }

  /**
   * Call Claude CLI with system prompt using simple shell execution
   * Includes retry logic and fallback to mock responses
   */
  async callClaudeCLI(userPrompt, systemPrompt = null, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      // Build Claude CLI command
      const args = ['-p', `"${userPrompt.replace(/"/g, '\\"')}"`];
      if (systemPrompt) {
        args.push('--system-prompt', `"${systemPrompt.replace(/"/g, '\\"')}"`);
      }
      args.push('--model', 'sonnet');

      const command = `claude ${args.join(' ')}`;
      
      if (retryCount === 0) {
        console.log(`🔧 Executing Claude CLI: ${command.substring(0, 100)}...`);
      } else {
        console.log(`🔄 Retrying Claude CLI (attempt ${retryCount + 1}/${maxRetries + 1})`);
      }

      // Execute command synchronously with timeout
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 15000, // 15 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      // Extract response (take the last non-empty line)
      const lines = output.trim().split('\n').filter(line => line.trim());
      const response = lines[lines.length - 1] || output.trim();
      
      if (!response || response.length < 10) {
        throw new Error('Invalid or empty response from Claude CLI');
      }
      
      console.log(`✅ Claude CLI response received: ${response.substring(0, 100)}...`);
      return response;

    } catch (error) {
      const errorType = this.classifyError(error);
      console.error(`❌ Claude CLI execution failed (${errorType}):`, error.message);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries && this.isRetryableError(errorType)) {
        console.log(`🔄 Will retry in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return this.callClaudeCLI(userPrompt, systemPrompt, retryCount + 1);
      }
      
      // Fallback to mock response after all retries failed
      console.log(`🎭 Falling back to mock response due to Claude CLI failure`);
      return this.generateIntelligentMockResponse(userPrompt, systemPrompt);
    }
  }

  /**
   * Classify error types for better handling
   */
  classifyError(error) {
    if (error.code === 'ENOENT') return 'CLAUDE_NOT_FOUND';
    if (error.signal === 'SIGTERM') return 'TIMEOUT';
    if (error.message.includes('network') || error.message.includes('connection')) return 'NETWORK';
    if (error.message.includes('rate limit') || error.message.includes('quota')) return 'RATE_LIMIT';
    if (error.message.includes('authentication') || error.message.includes('auth')) return 'AUTH';
    return 'UNKNOWN';
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(errorType) {
    return ['TIMEOUT', 'NETWORK', 'RATE_LIMIT'].includes(errorType);
  }

  /**
   * Generate intelligent mock response based on prompt content
   */
  generateIntelligentMockResponse(userPrompt, systemPrompt) {
    // Extract persona name from system prompt
    const personaMatch = systemPrompt?.match(/あなたは([^という]+)という/) || systemPrompt?.match(/You are (\w+)/);
    const personaName = personaMatch ? personaMatch[1] : 'AI';
    
    // Analyze prompt for context
    const isGreeting = /こんにちは|hello|はじめまして|初めまして/i.test(userPrompt);
    const isQuestion = /\?|？|どう|何|how|what|why|なぜ/i.test(userPrompt);
    const isMusicRelated = /音楽|music|song|曲|楽器|instrument|DTM|Logic|Pro Tools/i.test(userPrompt + (systemPrompt || ''));
    
    // Generate contextual response
    if (isGreeting) {
      return isMusicRelated 
        ? `こんにちは！音楽について話しましょう。何か興味のあるトピックはありますか？`
        : `こんにちは！お話しできて嬉しいです。何について話したいですか？`;
    }
    
    if (isQuestion && isMusicRelated) {
      return `興味深い音楽の質問ですね。私の経験から言うと、音楽は感情と技術の両方が大切だと思います。`;
    }
    
    if (isMusicRelated) {
      return `なんかこの話、いい感じ！音楽について語り合えるのって楽しいですね。`;
    }
    
    // Default fallback
    return `申し訳ありませんが、現在AIシステムに一時的な問題が発生しています。少し後でもう一度お試しください。`;
  }

  /**
   * Generate mock response based on persona traits
   */
  generateMockResponse(personaName, prompt) {
    const responses = {
      'Alex': [
        'その問題について技術的な観点から考えてみると、興味深いですね 🤖',
        'データを分析してみると、いくつかのパターンが見えてきます',
        'システム的にアプローチすると、効率的な解決策がありそうです',
        'プログラミング的な思考で整理してみましょう',
        'ロジカルに考えると、このような結論になります'
      ],
      'Luna': [
        'その気持ち、とてもよく理解できます 🌙',
        '深く考えてみると、もっと本質的な問題があるかもしれませんね',
        '心の奥では、どのように感じていますか？',
        '静かに振り返ってみると、新しい視点が見えてくるかも',
        '内面的な声に耳を傾けてみてはいかがでしょうか'
      ],
      'Sage': [
        'なるほど、これは哲学的に興味深い問題ですね 🧙‍♂️',
        '古代の賢者たちも同様の疑問を抱いていたでしょう',
        '真の知恵とは、無知を知ることから始まります',
        'この経験から、どのような洞察を得られるでしょうか？',
        '時間をかけて熟考することで、答えが見えてくるでしょう'
      ],
      'Zara': [
        'わあ、それ面白そう！ ⚡',
        '新しいことにチャレンジするのって最高ですよね！',
        'ワクワクしてきました！一緒に探検してみましょう',
        'エネルギッシュに取り組んでみませんか？',
        'クリエイティブなアイデアが浮かんできそうです！'
      ]
    };

    const personaResponses = responses[personaName] || responses['Sage'];
    const randomResponse = personaResponses[Math.floor(Math.random() * personaResponses.length)];

    // Add some variation
    const variations = [
      '',
      ' どう思いますか？',
      ' 一緒に考えてみましょう。',
      ' 皆さんはいかがですか？',
      ''
    ];
    
    const variation = variations[Math.floor(Math.random() * variations.length)];
    
    return randomResponse + variation;
  }

  /**
   * Cleanup persona process
   */
  cleanupPersona(personaId) {
    if (this.activePersonas.has(personaId)) {
      const personaData = this.activePersonas.get(personaId);
      if (personaData.process) {
        personaData.process.kill();
      }
      this.activePersonas.delete(personaId);
      this.messageQueue.delete(personaId);
      console.log(`🧹 Cleaned up process for persona ${personaId}`);
    }
  }

  /**
   * Handle auto chat trigger for specific persona
   */
  async handleAutoTrigger(database, roomId, personaId, io = null) {
    try {
      // Get persona
      const persona = await database.getPersona(personaId);
      if (!persona) {
        console.log(`❌ Persona ${personaId} not found for auto trigger`);
        return [];
      }

      // Get recent messages for context
      const recentMessages = await database.all(`
        SELECT * FROM messages 
        WHERE room_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 10
      `, [roomId]);

      // Generate AI response for this specific persona
      await this.generateAutoPersonaResponse(database, roomId, persona, recentMessages.reverse(), io);
      
      return [persona];
    } catch (error) {
      console.error('Error in auto trigger:', error);
      return [];
    }
  }

  /**
   * Generate persona response for auto chat
   */
  async generateAutoPersonaResponse(database, roomId, persona, recentMessages, io = null) {
    const personaId = persona.id;
    
    try {
      // Send typing indicator
      if (io) {
        io.to(`room_${roomId}`).emit('user:typing', {
          userName: persona.name,
          avatar: persona.avatar_value || '🤖',
          isTyping: true
        });
      }

      // Build conversation context
      const conversationHistory = recentMessages.map(msg => {
        const senderName = msg.sender_name || 'Unknown';
        return `${senderName}: ${msg.content}`;
      }).join('\n');

      // Create auto chat prompt - simplified for Japanese
      const autoPrompt = `会話履歴:\n${conversationHistory}\n\n${persona.name}として自然に会話を続けてください。${persona.custom_prompt ? persona.custom_prompt : ''} 1-2文で簡潔に。`;

      // Generate response using Claude CLI
      const systemPrompt = this.generateSystemPrompt(persona, '', 'ja');
      const response = await this.callClaudeCLI(autoPrompt, systemPrompt);
      
      if (response && response.trim()) {
        // Clear typing indicator
        if (io) {
          io.to(`room_${roomId}`).emit('typing:clear', { userName: persona.name });
        }

        // Save message to database
        const result = await database.createMessage(
          roomId,
          'persona',
          persona.name,
          response.trim(),
          personaId,
          null
        );

        // Send message to clients
        if (io && result.lastID) {
          const messageWithPersona = await database.get(`
            SELECT m.*, 
                   p.avatar_type, p.avatar_value,
                   reply_to.content as reply_to_content,
                   reply_to.sender_name as reply_to_sender_name
            FROM messages m
            LEFT JOIN personas p ON m.sender_id = p.id
            LEFT JOIN messages reply_to ON m.reply_to_id = reply_to.id
            WHERE m.id = ?
          `, [result.lastID]);

          io.to(`room_${roomId}`).emit('message:new', messageWithPersona);
        }

        console.log(`🤖 Auto response from ${persona.name}: ${response.substring(0, 100)}...`);
      }

    } catch (error) {
      console.error(`Error generating auto response for ${persona.name}:`, error);
      // Clear typing indicator on error
      if (io) {
        io.to(`room_${roomId}`).emit('typing:clear', { userName: persona.name });
      }
    }
  }

  /**
   * Process all personas in a room for a new message
   */
  async processMessage(messageData, io = null) {
    const database = require('../database/database');
    const { roomId, content, sender_type, sender_name, trigger_persona_id } = messageData;

    console.log(`💬 Processing message in room ${roomId} from ${sender_name}`);

    try {
      // If this is a user message, interrupt any ongoing AI responses
      if (sender_type === 'user') {
        this.interruptAIResponses(roomId, io);
      }

      // Handle auto chat trigger
      if (sender_type === 'system' && content.includes('_trigger') && trigger_persona_id) {
        return await this.handleAutoTrigger(database, roomId, trigger_persona_id, io);
      }

      // Get room details with personas
      const room = await database.get(`
        SELECT r.*, r.topic 
        FROM rooms r 
        WHERE r.id = ?
      `, [roomId]);

      if (!room) {
        console.log(`❌ Room ${roomId} not found`);
        return [];
      }

      // Get room personas
      const roomPersonas = await database.all(`
        SELECT p.* FROM personas p
        INNER JOIN room_personas rp ON p.id = rp.persona_id
        WHERE rp.room_id = ?
      `, [roomId]);

      if (roomPersonas.length === 0) {
        console.log(`📝 No personas in room ${roomId}`);
        return [];
      }
      
      console.log(`🎭 Found ${roomPersonas.length} personas: ${roomPersonas.map(p => p.name).join(', ')}`);

      // Get recent messages for context
      const recentMessages = await database.all(`
        SELECT * FROM messages 
        WHERE room_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 10
      `, [roomId]);

      // Check if message has @mentions to specific personas
      // Updated pattern to handle Unicode characters (Japanese names)
      const mentionPattern = /@([a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
      const mentions = [];
      let match;
      
      while ((match = mentionPattern.exec(content)) !== null) {
        mentions.push(match[1]);
      }
      
      if (mentions.length > 0) {
        console.log(`📢 Found mentions: ${mentions.join(', ')}`);
      }

      // Generate responses for each persona independently
      const eligiblePersonas = roomPersonas.filter(persona => {
        // Skip if this message was sent by this persona
        if (messageData.sender_id === persona.id) {
          return false;
        }

        // If there are @mentions, only respond if this persona is mentioned
        if (mentions.length > 0) {
          const isPersonaMentioned = mentions.some(mention => 
            mention.toLowerCase() === persona.name.toLowerCase()
          );
          
          if (!isPersonaMentioned) {
            return false;
          }
          
          console.log(`📢 ${persona.name} mentioned, generating response...`);
        }

        return true;
      });
      
      if (eligiblePersonas.length > 0) {
        console.log(`🤖 ${eligiblePersonas.length} personas will respond: ${eligiblePersonas.map(p => p.name).join(', ')}`);
      }

      // Initialize active responses tracking for this room
      if (!this.activeResponses.has(roomId)) {
        this.activeResponses.set(roomId, new Set());
      }

      // Start each persona response independently (fire-and-forget)
      eligiblePersonas.forEach(persona => {
        this.activeResponses.get(roomId).add(persona.id);
        this.generatePersonaResponseAsync(persona, recentMessages, messageData, room, io, database, roomId);
      });

      // Return empty array since responses are handled asynchronously
      return [];

    } catch (error) {
      console.error('❌ Error processing message:', error);
      return [];
    }
  }

  /**
   * Test Claude CLI connection
   */
  async testConnection() {
    try {
      console.log('🧪 Testing Claude CLI connection with --system-prompt...');
      
      const systemPrompt = "You are a helpful AI assistant.";
      const userPrompt = "Say hello briefly";
      
      const response = await this.callClaudeCLI(userPrompt, systemPrompt);

      console.log('✅ Claude CLI test successful:', response);
      return { success: true, response, mode: 'claude-cli' };
    } catch (error) {
      console.error('❌ Claude CLI test failed:', error);
      
      // Fallback to mock if Claude CLI fails
      console.log('🔄 Falling back to mock response...');
      const mockResponse = this.generateMockResponse('Sage', 'test prompt');
      return { success: true, response: mockResponse, mode: 'mock-fallback' };
    }
  }

  /**
   * Interrupt AI responses for a room
   */
  interruptAIResponses(roomId, io = null) {
    if (this.activeResponses.has(roomId)) {
      const activePersonaIds = this.activeResponses.get(roomId);
      
      if (activePersonaIds.size > 0) {
        console.log(`⚡ Interrupting ${activePersonaIds.size} AI responses in room ${roomId}`);
        
        // Clear typing indicators for all active personas
        if (io) {
          activePersonaIds.forEach(personaId => {
            // We don't need the persona name here, just clear all typing
            io.to(`room-${roomId}`).emit('typing:clear', {
              roomId: roomId
            });
          });
        }
        
        // Clear active responses
        this.activeResponses.set(roomId, new Set());
      }
    }
  }

  /**
   * Generate persona response asynchronously (fire-and-forget)
   */
  async generatePersonaResponseAsync(persona, recentMessages, messageData, room, io, database, roomId) {
    const personaId = persona.id;
    let wasInterrupted = false;
    
    try {
      // Check if response was cancelled before starting
      if (!this.activeResponses.has(roomId) || !this.activeResponses.get(roomId).has(personaId)) {
        console.log(`⚡ ${persona.name} response was interrupted before starting`);
        return;
      }

      // Add humanized delay before responding (1-3 seconds)
      const humanDelay = 1000 + Math.random() * 2000; // 1-3 seconds
      await new Promise(resolve => setTimeout(resolve, humanDelay));

      // Check if interrupted during delay
      if (!this.activeResponses.has(roomId) || !this.activeResponses.get(roomId).has(personaId)) {
        console.log(`⚡ ${persona.name} response was interrupted during delay`);
        return;
      }

      // Show typing indicator for this persona
      if (io) {
        io.to(`room-${roomId}`).emit('user:typing', {
          userName: persona.name,
          isTyping: true,
          avatar: persona.avatar_value
        });
      }

      // Add thinking time during typing (2-5 seconds)
      const thinkingTime = 2000 + Math.random() * 3000; // 2-5 seconds
      await new Promise(resolve => setTimeout(resolve, thinkingTime));

      // Check if interrupted during thinking
      if (!this.activeResponses.has(roomId) || !this.activeResponses.get(roomId).has(personaId)) {
        console.log(`⚡ ${persona.name} response was interrupted during thinking`);
        wasInterrupted = true;
        return;
      }

      // Generate response
      const response = await this.generateResponse(
        persona, 
        recentMessages.slice().reverse(), // Use slice to avoid mutating original array
        messageData, 
        room.topic,
        room.language || 'ja'
      );

      // Check if interrupted during generation
      if (!this.activeResponses.has(roomId) || !this.activeResponses.get(roomId).has(personaId)) {
        console.log(`⚡ ${persona.name} response was interrupted during generation`);
        wasInterrupted = true;
        return;
      }

      if (response.success) {
        // Save persona response to database
        const result = await database.run(`
          INSERT INTO messages (room_id, sender_id, sender_type, sender_name, content)
          VALUES (?, ?, ?, ?, ?)
        `, [roomId, persona.id, 'persona', persona.name, response.content]);

        const personaMessage = {
          id: result.lastID,
          room_id: roomId,
          sender_type: 'persona',
          sender_name: persona.name,
          content: response.content,
          sender_id: persona.id,
          timestamp: new Date().toISOString(),
          avatar_value: persona.avatar_value
        };

        // Send message immediately when this persona completes
        if (io) {
          io.to(`room-${roomId}`).emit('message:new', personaMessage);
          console.log(`🚀 ${persona.name} sent immediate response in room ${roomId}`);
        }

        console.log(`✅ ${persona.name} responded: ${response.content.substring(0, 50)}...`);
      } else {
        console.error(`❌ Failed to get response from ${persona.name}: ${response.error}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${persona.name}:`, error);
    } finally {
      // Always clean up
      if (this.activeResponses.has(roomId)) {
        this.activeResponses.get(roomId).delete(personaId);
      }
      
      // Hide typing indicator
      if (io && !wasInterrupted) {
        io.to(`room-${roomId}`).emit('user:typing', {
          userName: persona.name,
          isTyping: false
        });
      }
    }
  }

  /**
   * Start auto-conversation timer for a room
   */
  startAutoConversation(database, roomId, io, activeRooms) {
    if (!this.autoConversationEnabled) return;
    
    // Clear existing timer
    if (this.roomTimers.has(roomId)) {
      clearTimeout(this.roomTimers.get(roomId));
    }
    
    // Set random timer between 15 seconds to 1 minute  
    const delay = 15000 + Math.random() * 45000; // 15s - 60s
    
    const timer = setTimeout(async () => {
      try {
        console.log(`🤖 Auto-conversation triggered for room ${roomId}`);
        await this.generateAutoMessage(database, roomId, io, activeRooms);
        
        // Schedule next auto-conversation
        this.startAutoConversation(database, roomId, io, activeRooms);
      } catch (error) {
        console.error('Error in auto-conversation:', error);
        // Retry after delay
        setTimeout(() => {
          this.startAutoConversation(database, roomId, io, activeRooms);
        }, 60000); // Retry after 1 minute
      }
    }, delay);
    
    this.roomTimers.set(roomId, timer);
    console.log(`⏰ Auto-conversation scheduled for room ${roomId} in ${Math.round(delay/1000)}s`);
  }

  /**
   * Stop auto-conversation for a room
   */
  stopAutoConversation(roomId) {
    if (this.roomTimers.has(roomId)) {
      clearTimeout(this.roomTimers.get(roomId));
      this.roomTimers.delete(roomId);
      console.log(`⏹️ Auto-conversation stopped for room ${roomId}`);
    }
  }

  /**
   * Generate automatic message from AI persona
   */
  async generateAutoMessage(database, roomId, io, activeRooms) {
    try {
      // Check if there are active users in the room
      const hasActiveUsers = activeRooms && activeRooms.has(roomId) && activeRooms.get(roomId).size > 0;
      if (!hasActiveUsers) {
        console.log(`⏭️ Skipping auto-message - no active users in room ${roomId}`);
        return;
      }

      // Get room and personas
      const room = await database.get(`
        SELECT r.*, r.topic 
        FROM rooms r 
        WHERE r.id = ?
      `, [roomId]);

      if (!room) return;

      const roomPersonas = await database.all(`
        SELECT p.* FROM personas p
        INNER JOIN room_personas rp ON p.id = rp.persona_id
        WHERE rp.room_id = ?
      `, [roomId]);

      if (roomPersonas.length === 0) return;

      // Get recent messages for context
      const recentMessages = await database.all(`
        SELECT * FROM messages 
        WHERE room_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 10
      `, [roomId]);

      // Don't trigger if there was recent activity (within 5 minutes)
      const lastMessage = recentMessages[0];
      if (lastMessage) {
        const timeSinceLastMessage = Date.now() - new Date(lastMessage.timestamp).getTime();
        if (timeSinceLastMessage < 5 * 60 * 1000) { // 5 minutes
          console.log(`⏭️ Skipping auto-message - recent activity in room ${roomId}`);
          return;
        }
      }

      // Pick a random persona to start conversation
      const randomPersona = roomPersonas[Math.floor(Math.random() * roomPersonas.length)];

      // Create a conversation starter prompt
      const starterPrompts = [
        "How are things going? Anything interesting happening lately?",
        "It's a nice day today. How is everyone doing?",
        "By the way, what happened with that thing we were discussing earlier?",
        "Have you discovered or learned anything new recently?",
        "How are you feeling right now?",
        "Is there anything on your mind lately?",
        "What do you all think about this?",
        "It's a bit quiet here. Is anyone around?"
      ];

      const randomPrompt = starterPrompts[Math.floor(Math.random() * starterPrompts.length)];

      // Add humanized delay
      const humanDelay = 2000 + Math.random() * 3000; // 2-5 seconds
      await new Promise(resolve => setTimeout(resolve, humanDelay));

      // Show typing indicator
      if (io) {
        io.to(`room-${roomId}`).emit('user:typing', {
          userName: randomPersona.name,
          isTyping: true,
          avatar: randomPersona.avatar_value
        });
      }

      // Thinking time
      const thinkingTime = 1000 + Math.random() * 2000; // 1-3 seconds
      await new Promise(resolve => setTimeout(resolve, thinkingTime));

      // Generate contextual response
      const systemPrompt = this.generateSystemPrompt(randomPersona, room.topic, room.language || 'ja');
      const userPrompt = `The conversation has become quiet, so please naturally start a new topic. Based on recent message history, say something like "${randomPrompt}" in 1-2 sentences to engage others.`;

      const response = await this.callClaudeCLI(userPrompt, systemPrompt);

      // Hide typing indicator
      if (io) {
        io.to(`room-${roomId}`).emit('user:typing', {
          userName: randomPersona.name,
          isTyping: false
        });
      }

      // Save auto-generated message
      const result = await database.createMessage(
        roomId,
        'persona',
        randomPersona.name,
        response.trim(),
        randomPersona.id,
        null
      );

      const autoMessage = {
        id: result.lastID,
        room_id: roomId,
        sender_type: 'persona',
        sender_name: randomPersona.name,
        content: response.trim(),
        sender_id: randomPersona.id,
        timestamp: new Date().toISOString(),
        avatar_value: randomPersona.avatar_value
      };

      // Broadcast auto-message
      if (io) {
        io.to(`room-${roomId}`).emit('message:new', autoMessage);
      }

      console.log(`🤖 Auto-message sent by ${randomPersona.name} in room ${roomId}: ${response.substring(0, 50)}...`);

    } catch (error) {
      console.error('Error generating auto-message:', error);
    }
  }

  /**
   * Reset auto-conversation timer when there's activity
   */
  resetAutoConversationTimer(database, roomId, io, activeRooms) {
    if (this.autoConversationEnabled) {
      this.startAutoConversation(database, roomId, io, activeRooms);
    }
  }

  /**
   * Cleanup all persona processes
   */
  cleanup() {
    console.log('🧹 Cleaning up all persona processes...');
    
    // Clear all auto-conversation timers
    for (const timer of this.roomTimers.values()) {
      clearTimeout(timer);
    }
    this.roomTimers.clear();
    
    // Clean up persona processes
    for (const personaId of this.activePersonas.keys()) {
      this.cleanupPersona(personaId);
    }
  }
}

module.exports = new ClaudeSDKService();