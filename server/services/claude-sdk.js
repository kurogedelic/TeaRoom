const { execSync } = require('child_process');
const conversationDynamics = require('./conversation-dynamics');
const intelligentResponses = require('./intelligent-responses');

class ClaudeSDKService {
  constructor() {
    this.activePersonas = new Map(); // personaId -> { process, conversationHistory, isActive }
    this.messageQueue = new Map(); // personaId -> message queue
    this.roomTimers = new Map(); // roomId -> timeout for auto-conversation
    this.activeResponses = new Map(); // roomId -> Set of persona IDs currently responding
    this.autoConversationEnabled = true;
    this.conversationAnalytics = new Map(); // roomId -> analytics data
    this.responseStrategies = new Map(); // roomId -> current strategy
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
   * Send a message to Claude CLI and get response with intelligent conversation dynamics
   */
  async generateResponse(persona, messages, currentMessage, roomTopic = '', language = 'ja') {
    try {
      const personaId = persona.id;
      const roomId = currentMessage.roomId || currentMessage.room_id;
      
      // Ensure persona process exists
      await this.createPersonaProcess(persona, roomTopic, language);
      
      // Analyze conversation dynamics
      const roomPersonas = await this.getRoomPersonas(roomId);
      const conversationState = conversationDynamics.analyzeConversationState(messages, roomPersonas, roomId);
      
      console.log(`🧠 Conversation analysis for room ${roomId}:`, {
        phase: conversationState.phase,
        engagement: conversationState.engagement,
        momentum: conversationState.momentum,
        needsIntervention: conversationState.needsIntervention.needed
      });
      
      // Try intelligent response generation first
      try {
        const intelligentResponse = await intelligentResponses.generateContextualResponse(
          persona, 
          messages, 
          conversationState, 
          roomTopic, 
          language
        );
        
        if (intelligentResponse && intelligentResponse.length > 10) {
          console.log(`🎯 Intelligent response generated for ${persona.name}: ${intelligentResponse.substring(0, 100)}...`);
          
          return {
            success: true,
            content: intelligentResponse.trim(),
            persona_id: persona.id,
            persona_name: persona.name,
            responseType: 'intelligent',
            conversationMetrics: {
              phase: conversationState.phase,
              engagement: conversationState.engagement,
              momentum: conversationState.momentum
            }
          };
        }
      } catch (intelligentError) {
        console.warn(`⚠️ Intelligent response failed for ${persona.name}, falling back to Claude CLI:`, intelligentError.message);
      }
      
      // Fallback to Claude CLI with enhanced context
      const systemPrompt = this.generateEnhancedSystemPrompt(persona, roomTopic, conversationState, language);
      
      // Format conversation history with better context
      const conversationHistory = this.formatConversationHistory(messages, conversationState);

      // Build contextual user prompt
      const userPrompt = this.buildContextualPrompt(
        conversationHistory, 
        currentMessage, 
        persona, 
        conversationState, 
        language
      );

      console.log(`🤖 Generating contextual response for ${persona.name} via Claude CLI...`);

      // Use Claude CLI with enhanced prompting
      const response = await this.callClaudeCLI(userPrompt, systemPrompt);

      console.log(`✅ Response generated for ${persona.name}: ${response.substring(0, 100)}...`);
      
      return {
        success: true,
        content: response.trim(),
        persona_id: persona.id,
        persona_name: persona.name,
        responseType: 'claude_cli',
        conversationMetrics: {
          phase: conversationState.phase,
          engagement: conversationState.engagement,
          momentum: conversationState.momentum
        }
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
   * Get room personas for conversation analysis
   */
  async getRoomPersonas(roomId) {
    try {
      const database = require('../database/database');
      return await database.all(`
        SELECT p.* FROM personas p
        INNER JOIN room_personas rp ON p.id = rp.persona_id
        WHERE rp.room_id = ?
      `, [roomId]);
    } catch (error) {
      console.error('Error getting room personas:', error);
      return [];
    }
  }

  /**
   * Generate enhanced system prompt with conversation context
   */
  generateEnhancedSystemPrompt(persona, topic, conversationState, language) {
    const basePrompt = this.generateSystemPrompt(persona, topic, language);
    
    const contextEnhancement = language === 'ja' ? `

【現在の会話状況】
- 会話の段階: ${conversationState.phase}
- エンゲージメント: ${conversationState.engagement}
- 会話の勢い: ${Math.round(conversationState.momentum * 100)}%
- 感情的トーン: ${conversationState.context.emotional}

【応答ガイド】
- 現在の会話の流れに合わせて適切な応答をしてください
- エンゲージメントが低い場合は積極的に会話を盛り上げてください
- 会話が冷めている場合は新しい話題を提供してください
- 相手の感情状態に共感し、適切に反応してください
    ` : `

【Current Conversation Context】
- Phase: ${conversationState.phase}
- Engagement: ${conversationState.engagement}
- Momentum: ${Math.round(conversationState.momentum * 100)}%
- Emotional tone: ${conversationState.context.emotional}

【Response Guidelines】
- Respond appropriately to the current conversation flow
- If engagement is low, actively help energize the conversation
- If conversation is cooling, provide new topics
- Empathize with others' emotional states and respond appropriately
    `;
    
    return basePrompt + contextEnhancement;
  }

  /**
   * Format conversation history with better context awareness
   */
  formatConversationHistory(messages, conversationState) {
    const recentMessages = messages.slice(-8); // Get more context
    
    return recentMessages.map((msg, index) => {
      const timestamp = new Date(msg.timestamp);
      const timeAgo = this.getTimeAgoString(timestamp);
      
      // Add context markers for important messages
      let contextMarker = '';
      if (msg.content.includes('@')) contextMarker = '[MENTION] ';
      if (msg.content.includes('?') || msg.content.includes('？')) contextMarker = '[QUESTION] ';
      if (msg.content.length > 100) contextMarker = '[DETAILED] ';
      
      return `${contextMarker}${msg.sender_name} (${timeAgo}): ${msg.content}`;
    }).join('\n');
  }

  /**
   * Build contextual user prompt based on conversation dynamics
   */
  buildContextualPrompt(conversationHistory, currentMessage, persona, conversationState, language) {
    const { phase, engagement, needsIntervention } = conversationState;
    
    let contextualInstructions = '';
    
    if (language === 'ja') {
      // Add specific instructions based on conversation state
      if (needsIntervention.needed) {
        switch (needsIntervention.reason) {
          case 'cooling_conversation':
            contextualInstructions = '\n\n【特別指示】会話が冷めかけています。新しい興味深い話題で会話を活性化してください。';
            break;
          case 'unbalanced_participation':
            contextualInstructions = '\n\n【特別指示】参加者のバランスが偏っています。他の参加者も含めて全員が参加しやすい質問をしてください。';
            break;
          case 'surface_conversation':
            contextualInstructions = '\n\n【特別指示】会話が表面的になっています。より深い洞察や個人的な体験を共有してください。';
            break;
        }
      }
      
      if (phase === 'flowing') {
        contextualInstructions += '\n\n会話が良い流れです。この勢いを維持しながら自然に参加してください。';
      } else if (engagement === 'low') {
        contextualInstructions += '\n\n エンゲージメントが低めです。積極的で魅力的な応答を心がけてください。';
      }
      
      return `会話履歴:
${conversationHistory}

最新メッセージ: ${currentMessage.sender_name}: ${currentMessage.content}${contextualInstructions}

${persona.name}として、現在の会話の文脈と雰囲気を理解し、あなたの性格特性を活かした自然な返信をしてください。1-2文で簡潔に、会話の流れに適切に貢献してください。`;
    } else {
      // English instructions
      if (needsIntervention.needed) {
        switch (needsIntervention.reason) {
          case 'cooling_conversation':
            contextualInstructions = '\n\n[SPECIAL INSTRUCTION] The conversation is cooling down. Energize it with an interesting new topic.';
            break;
          case 'unbalanced_participation':
            contextualInstructions = '\n\n[SPECIAL INSTRUCTION] Participation is unbalanced. Ask inclusive questions that encourage everyone to participate.';
            break;
          case 'surface_conversation':
            contextualInstructions = '\n\n[SPECIAL INSTRUCTION] The conversation is staying surface-level. Share deeper insights or personal experiences.';
            break;
        }
      }
      
      if (phase === 'flowing') {
        contextualInstructions += '\n\nThe conversation has good momentum. Maintain this flow while participating naturally.';
      } else if (engagement === 'low') {
        contextualInstructions += '\n\nEngagement is low. Be more active and engaging in your response.';
      }
      
      return `Conversation history:
${conversationHistory}

Latest message: ${currentMessage.sender_name}: ${currentMessage.content}${contextualInstructions}

As ${persona.name}, understand the current conversation context and atmosphere, and respond naturally using your personality traits. Keep it concise (1-2 sentences) while contributing meaningfully to the conversation flow.`;
    }
  }

  /**
   * Get human-readable time ago string
   */
  getTimeAgoString(timestamp) {
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  /**
   * Select optimal persona for auto-message based on conversation analysis
   */
  selectOptimalPersona(roomPersonas, recentMessages, conversationState) {
    // Analyze recent participation
    const participationCounts = {};
    roomPersonas.forEach(p => participationCounts[p.id] = 0);
    
    recentMessages.slice(0, 10).forEach(msg => {
      if (msg.sender_type === 'persona' && participationCounts[msg.sender_id] !== undefined) {
        participationCounts[msg.sender_id]++;
      }
    });

    // Find least active persona (for balance)
    const leastActivePersona = roomPersonas.reduce((min, persona) => {
      const count = participationCounts[persona.id] || 0;
      const minCount = participationCounts[min.id] || 0;
      return count < minCount ? persona : min;
    });

    // Consider personality traits for intervention type
    if (conversationState.needsIntervention.needed) {
      switch (conversationState.needsIntervention.reason) {
        case 'cooling_conversation':
          // Select extraverted persona to energize
          const extravert = roomPersonas.find(p => p.extraversion >= 4) || leastActivePersona;
          return extravert;
          
        case 'unbalanced_participation':
          // Select agreeable persona to include others
          const agreeable = roomPersonas.find(p => p.agreeableness >= 4) || leastActivePersona;
          return agreeable;
          
        case 'surface_conversation':
          // Select open persona to add depth
          const open = roomPersonas.find(p => p.openness >= 4) || leastActivePersona;
          return open;
          
        default:
          return leastActivePersona;
      }
    }

    // Default to least active for balance
    return leastActivePersona;
  }

  /**
   * Calculate intelligent delays based on conversation state
   */
  calculateIntelligentDelays(conversationState) {
    const { phase, engagement, momentum } = conversationState;
    
    let initialDelay = 2000; // Base 2 seconds
    let thinkingTime = 1500; // Base 1.5 seconds
    
    // Adjust based on conversation phase
    switch (phase) {
      case 'flowing':
        initialDelay *= 0.8; // Quicker to join flowing conversation
        thinkingTime *= 0.7;
        break;
      case 'cooling':
        initialDelay *= 1.2; // More careful entry
        thinkingTime *= 1.3;
        break;
      case 'dormant':
        initialDelay *= 0.6; // Quick intervention needed
        thinkingTime *= 0.8;
        break;
    }
    
    // Adjust based on engagement
    if (engagement === 'high') {
      initialDelay *= 1.3; // Be more careful with high engagement
      thinkingTime *= 1.2;
    } else if (engagement === 'low') {
      initialDelay *= 0.8; // Move faster with low engagement
      thinkingTime *= 0.9;
    }
    
    // Add momentum-based adjustments
    if (momentum > 0.7) {
      initialDelay *= 1.2; // Don't interrupt high momentum
    } else if (momentum < 0.3) {
      initialDelay *= 0.7; // Act faster with low momentum
    }
    
    // Add randomness for natural feel
    initialDelay += Math.random() * 1000;
    thinkingTime += Math.random() * 1000;
    
    return {
      initial: Math.max(1000, Math.min(initialDelay, 5000)), // 1-5 seconds
      thinking: Math.max(800, Math.min(thinkingTime, 4000))  // 0.8-4 seconds
    };
  }

  /**
   * Build auto-conversation prompt based on conversation state
   */
  buildAutoConversationPrompt(conversationState, language) {
    const { phase, engagement, needsIntervention } = conversationState;
    
    if (language === 'ja') {
      let basePrompt = '会話が静かになっています。';
      
      if (needsIntervention.needed) {
        switch (needsIntervention.reason) {
          case 'cooling_conversation':
            basePrompt += '新しい興味深い話題で会話を活性化してください。';
            break;
          case 'unbalanced_participation':
            basePrompt += '他の参加者も参加しやすい質問をしてください。';
            break;
          case 'surface_conversation':
            basePrompt += 'より深い話題や個人的な体験を共有してください。';
            break;
          default:
            basePrompt += '自然に新しい話題を始めてください。';
        }
      } else {
        basePrompt += 'あなたの性格に合った自然な会話を始めてください。';
      }
      
      return basePrompt + ' 1-2文で簡潔に、魅力的に話してください。';
      
    } else {
      let basePrompt = 'The conversation has become quiet.';
      
      if (needsIntervention.needed) {
        switch (needsIntervention.reason) {
          case 'cooling_conversation':
            basePrompt += ' Please energize the conversation with an interesting new topic.';
            break;
          case 'unbalanced_participation':
            basePrompt += ' Please ask inclusive questions that encourage everyone to participate.';
            break;
          case 'surface_conversation':
            basePrompt += ' Please share deeper insights or personal experiences.';
            break;
          default:
            basePrompt += ' Please naturally start a new topic.';
        }
      } else {
        basePrompt += ' Please start a natural conversation that fits your personality.';
      }
      
      return basePrompt + ' Keep it engaging and concise (1-2 sentences).';
    }
  }

  /**
   * Render avatar HTML for typing indicators and messages
   */
  renderAvatarHTML(persona) {
    if (persona.avatar_type === 'image' && persona.avatar_value) {
      return `<img src="/uploads/${persona.avatar_value}" alt="${persona.name}" class="avatar-image">`;
    } else {
      return persona.avatar_value || '🤖';
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
    
    // Calculate delay first
    this.calculateDynamicDelay(database, roomId).then(delay => {
      const timer = setTimeout(async () => {
        try {
          console.log(`🤖 Auto-conversation triggered for room ${roomId}`);
          await this.generateAutoMessage(database, roomId, io, activeRooms);
          
          // Schedule next auto-conversation with dynamic timing
          this.scheduleNextAutoConversation(database, roomId, io, activeRooms);
        } catch (error) {
          console.error('Error in auto-conversation:', error);
          // Retry after delay
          setTimeout(() => {
            this.startAutoConversation(database, roomId, io, activeRooms);
          }, 60000); // Retry after 1 minute
        }
      }, delay);
      
      this.roomTimers.set(roomId, timer);
    }).catch(error => {
      console.error('Error calculating delay, using default:', error);
      const timer = setTimeout(async () => {
        try {
          await this.generateAutoMessage(database, roomId, io, activeRooms);
          this.scheduleNextAutoConversation(database, roomId, io, activeRooms);
        } catch (error) {
          console.error('Error in auto-conversation:', error);
          setTimeout(() => {
            this.startAutoConversation(database, roomId, io, activeRooms);
          }, 60000);
        }
      }, 30000);
      
      this.roomTimers.set(roomId, timer);
    });
  }

  /**
   * Schedule next auto-conversation with intelligent timing
   */
  async scheduleNextAutoConversation(database, roomId, io, activeRooms) {
    const delay = await this.calculateDynamicDelay(database, roomId);
    console.log(`⏰ Next auto-conversation for room ${roomId} in ${Math.round(delay/1000)}s`);
    
    const timer = setTimeout(async () => {
      try {
        await this.generateAutoMessage(database, roomId, io, activeRooms);
        this.scheduleNextAutoConversation(database, roomId, io, activeRooms);
      } catch (error) {
        console.error('Error in scheduled auto-conversation:', error);
        setTimeout(() => {
          this.scheduleNextAutoConversation(database, roomId, io, activeRooms);
        }, 60000);
      }
    }, delay);
    
    this.roomTimers.set(roomId, timer);
  }

  /**
   * Calculate dynamic delay based on conversation state
   */
  async calculateDynamicDelay(database, roomId) {
    try {
      // Get recent messages for analysis
      const messages = await database.all(`
        SELECT * FROM messages 
        WHERE room_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 15
      `, [roomId]);

      if (messages.length === 0) {
        return 30000; // 30s default for empty rooms
      }

      // Get room personas for analysis
      const roomPersonas = await this.getRoomPersonas(roomId);
      
      // Analyze conversation state
      const conversationState = conversationDynamics.analyzeConversationState(messages, roomPersonas, roomId);
      
      // Use conversation dynamics to determine optimal timing
      const suggestedTiming = conversationState.suggestedTiming || 30000;
      
      console.log(`🧠 Dynamic timing for room ${roomId}: ${Math.round(suggestedTiming/1000)}s (phase: ${conversationState.phase}, momentum: ${Math.round(conversationState.momentum * 100)}%)`);
      
      return suggestedTiming;
      
    } catch (error) {
      console.error('Error calculating dynamic delay:', error);
      return 15000 + Math.random() * 45000; // Fallback to random 15-60s
    }
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
   * Generate intelligent automatic message from AI persona
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
        LIMIT 15
      `, [roomId]);

      // Analyze conversation dynamics
      const conversationState = conversationDynamics.analyzeConversationState(recentMessages, roomPersonas, roomId);
      
      console.log(`🧠 Auto-message analysis for room ${roomId}:`, {
        phase: conversationState.phase,
        engagement: conversationState.engagement,
        momentum: conversationState.momentum,
        intervention: conversationState.needsIntervention
      });

      // Determine if auto-message should proceed based on conversation state
      const lastMessage = recentMessages[0];
      const timeSinceLastMessage = lastMessage ? Date.now() - new Date(lastMessage.timestamp).getTime() : Infinity;
      const minutesSinceActivity = timeSinceLastMessage / (60 * 1000);

      // Intelligent auto-trigger logic
      if (conversationState.phase === 'flowing' && minutesSinceActivity < 2) {
        console.log(`⏭️ Skipping auto-message - conversation is flowing naturally`);
        return;
      }

      if (conversationState.engagement === 'high' && minutesSinceActivity < 3) {
        console.log(`⏭️ Skipping auto-message - high engagement detected`);
        return;
      }

      // Select optimal persona for auto-message
      const optimalPersona = this.selectOptimalPersona(roomPersonas, recentMessages, conversationState);

      // Calculate intelligent timing delays
      const delays = this.calculateIntelligentDelays(conversationState);

      // Initial humanized delay
      await new Promise(resolve => setTimeout(resolve, delays.initial));

      // Show typing indicator with enhanced avatar display
      if (io) {
        const avatarHtml = this.renderAvatarHTML(optimalPersona);
        io.to(`room-${roomId}`).emit('persona:typing', {
          persona: optimalPersona.name,
          avatar: avatarHtml,
          isTyping: true,
          timestamp: new Date().toISOString()
        });
      }

      // Thinking time based on conversation complexity
      await new Promise(resolve => setTimeout(resolve, delays.thinking));

      let response;
      let responseType = 'intelligent';

      // Try intelligent response generation first
      try {
        // Create a mock message object for auto-generation context
        const mockMessage = {
          roomId: roomId,
          sender_name: 'system',
          content: '_auto_trigger',
          timestamp: new Date().toISOString()
        };

        response = await intelligentResponses.generateContextualResponse(
          optimalPersona, 
          recentMessages, 
          conversationState, 
          room.topic, 
          room.language || 'ja'
        );

        console.log(`🎯 Intelligent auto-response generated for ${optimalPersona.name}: ${response.substring(0, 100)}...`);

      } catch (intelligentError) {
        console.warn(`⚠️ Intelligent auto-response failed, using Claude CLI fallback:`, intelligentError.message);
        
        // Fallback to enhanced Claude CLI
        const systemPrompt = this.generateEnhancedSystemPrompt(optimalPersona, room.topic, conversationState, room.language || 'ja');
        const userPrompt = this.buildAutoConversationPrompt(conversationState, room.language || 'ja');
        
        response = await this.callClaudeCLI(userPrompt, systemPrompt);
        responseType = 'claude_cli';
      }

      // Hide typing indicator
      if (io) {
        io.to(`room-${roomId}`).emit('persona:typing', {
          persona: optimalPersona.name,
          isTyping: false
        });
      }

      // Save auto-generated message
      const result = await database.createMessage(
        roomId,
        'persona',
        optimalPersona.name,
        response.trim(),
        optimalPersona.id,
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