/**
 * Intelligent Response Generator for TeaRoom 2.0
 * Generates context-aware, natural responses based on conversation dynamics
 */

const conversationDynamics = require('./conversation-dynamics');

class IntelligentResponseGenerator {
  constructor() {
    this.responseTemplates = this.initializeResponseTemplates();
    this.conversationStarters = this.initializeConversationStarters();
    this.responseHistory = new Map(); // Track recent responses to avoid repetition
  }

  /**
   * Generate intelligent response based on conversation context
   */
  async generateContextualResponse(persona, messages, conversationState, roomTopic, language = 'ja') {
    try {
      // Analyze the specific context for this response
      const context = this.analyzeResponseContext(messages, persona, conversationState);
      
      // Determine response strategy
      const strategy = this.selectResponseStrategy(context, conversationState);
      
      // Generate response based on strategy
      const response = await this.generateResponseByStrategy(
        strategy, 
        persona, 
        context, 
        conversationState, 
        roomTopic, 
        language
      );
      
      // Track response to avoid repetition
      this.trackResponse(persona.id, response);
      
      return response;
      
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.generateFallbackResponse(persona, language);
    }
  }

  /**
   * Analyze specific context for response generation
   */
  analyzeResponseContext(messages, persona, conversationState) {
    const recentMessages = messages.slice(-5);
    const lastMessage = recentMessages[recentMessages.length - 1];
    
    // Check if persona was mentioned
    const wasMentioned = lastMessage && lastMessage.content.includes(`@${persona.name}`);
    
    // Analyze message types in recent conversation
    const messageTypes = this.analyzeMessageTypes(recentMessages);
    
    // Check for conversation patterns
    const patterns = this.detectConversationPatterns(recentMessages, persona);
    
    // Analyze emotional cues
    const emotionalCues = this.analyzeEmotionalCues(recentMessages);
    
    return {
      wasMentioned,
      messageTypes,
      patterns,
      emotionalCues,
      lastMessage,
      recentMessages,
      timeSinceLastPersonaMessage: this.getTimeSinceLastPersonaMessage(messages, persona)
    };
  }

  /**
   * Analyze types of messages in recent conversation
   */
  analyzeMessageTypes(messages) {
    const types = {
      questions: 0,
      statements: 0,
      exclamations: 0,
      agreements: 0,
      disagreements: 0,
      personal_shares: 0,
      technical: 0,
      emotional: 0
    };

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      if (/[？?]/.test(content)) types.questions++;
      if (/[！!]/.test(content)) types.exclamations++;
      if (/yes|はい|そう|agree|同意|確か/.test(content)) types.agreements++;
      if (/no|いいえ|違う|でも|but|however/.test(content)) types.disagreements++;
      if (/I|私|my|僕|me|自分/.test(content)) types.personal_shares++;
      if (/code|プログラム|tech|技術|system/.test(content)) types.technical++;
      if (/[😊😢😍😰🥰💔]/.test(content)) types.emotional++;
      else types.statements++;
    });

    return types;
  }

  /**
   * Detect conversation patterns relevant to response strategy
   */
  detectConversationPatterns(messages, persona) {
    const patterns = {
      isMonologue: false,
      isDebate: false,
      isStorytelling: false,
      isQuestioningPhase: false,
      needsPersonaInput: false,
      topicShift: false
    };

    // Check for monologue (same person talking repeatedly)
    const speakers = messages.map(m => m.sender_name);
    const uniqueSpeakers = new Set(speakers);
    if (uniqueSpeakers.size === 1 && speakers.length > 2) {
      patterns.isMonologue = true;
    }

    // Check for debate (back and forth disagreements)
    const disagreements = messages.filter(m => 
      /no|いいえ|違う|でも|but|however|disagree/.test(m.content.toLowerCase())
    );
    if (disagreements.length >= 2) patterns.isDebate = true;

    // Check for storytelling (long messages with narrative)
    const longMessages = messages.filter(m => m.content.length > 100);
    if (longMessages.length >= 2) patterns.isStorytelling = true;

    // Check for questioning phase
    const questions = messages.filter(m => /[？?]/.test(m.content));
    if (questions.length >= 2) patterns.isQuestioningPhase = true;

    // Check if persona hasn't contributed recently
    const recentPersonaMessages = messages.filter(m => m.sender_name === persona.name);
    if (recentPersonaMessages.length === 0 && messages.length >= 3) {
      patterns.needsPersonaInput = true;
    }

    // Check for topic shift (keyword analysis)
    if (messages.length >= 3) {
      const firstHalf = messages.slice(0, Math.ceil(messages.length / 2));
      const secondHalf = messages.slice(Math.ceil(messages.length / 2));
      
      const firstKeywords = this.extractKeywords(firstHalf.map(m => m.content).join(' '));
      const secondKeywords = this.extractKeywords(secondHalf.map(m => m.content).join(' '));
      
      const overlap = this.calculateKeywordOverlap(firstKeywords, secondKeywords);
      if (overlap < 0.3) patterns.topicShift = true;
    }

    return patterns;
  }

  /**
   * Analyze emotional cues for response tuning
   */
  analyzeEmotionalCues(messages) {
    const cues = {
      excitement: 0,
      sadness: 0,
      curiosity: 0,
      agreement: 0,
      confusion: 0,
      appreciation: 0
    };

    const emotionPatterns = {
      excitement: /[⚡🔥🎉😄！]|excited|excited|わくわく|すごい|amazing/gi,
      sadness: /[😢😞💔]|sad|悲しい|残念|disappointed/gi,
      curiosity: /[🤔❓]|curious|気になる|wonder|どう思う|interesting/gi,
      agreement: /[👍✅]|agree|そうです|確か|exactly|definitely/gi,
      confusion: /[❓🤨]|confused|わからない|どういう|what do you mean/gi,
      appreciation: /[🙏💖]|thank|ありがとう|感謝|appreciate|grateful/gi
    };

    messages.forEach(msg => {
      Object.keys(emotionPatterns).forEach(emotion => {
        const matches = msg.content.match(emotionPatterns[emotion]);
        if (matches) cues[emotion] += matches.length;
      });
    });

    return cues;
  }

  /**
   * Get time since persona's last message
   */
  getTimeSinceLastPersonaMessage(messages, persona) {
    const personaMessages = messages.filter(m => m.sender_name === persona.name);
    if (personaMessages.length === 0) return Infinity;
    
    const lastPersonaMessage = personaMessages[personaMessages.length - 1];
    return Date.now() - new Date(lastPersonaMessage.timestamp).getTime();
  }

  /**
   * Select optimal response strategy based on context
   */
  selectResponseStrategy(context, conversationState) {
    const { patterns, emotionalCues, wasMentioned, messageTypes } = context;
    const { phase, engagement, needsIntervention } = conversationState;

    // Priority 1: Direct mention response
    if (wasMentioned) {
      return { type: 'direct_response', priority: 'high' };
    }

    // Priority 2: Intervention needed
    if (needsIntervention.needed) {
      switch (needsIntervention.reason) {
        case 'cooling_conversation':
          return { type: 'conversation_starter', priority: 'high' };
        case 'unbalanced_participation':
          return { type: 'inclusive_question', priority: 'medium' };
        case 'surface_conversation':
          return { type: 'depth_probe', priority: 'medium' };
        default:
          return { type: 'general_engagement', priority: 'medium' };
      }
    }

    // Priority 3: Pattern-based responses
    if (patterns.isQuestioningPhase && messageTypes.questions > 0) {
      return { type: 'answer_and_reflect', priority: 'high' };
    }

    if (patterns.isDebate) {
      return { type: 'perspective_sharing', priority: 'medium' };
    }

    if (patterns.isStorytelling) {
      return { type: 'story_reaction', priority: 'medium' };
    }

    if (patterns.needsPersonaInput) {
      return { type: 'natural_contribution', priority: 'high' };
    }

    if (patterns.topicShift) {
      return { type: 'topic_bridge', priority: 'medium' };
    }

    // Priority 4: Emotion-based responses
    const dominantEmotion = Object.entries(emotionalCues)
      .reduce((a, b) => emotionalCues[a[0]] > emotionalCues[b[0]] ? a : b)[0];

    if (emotionalCues[dominantEmotion] > 0) {
      return { type: 'emotional_response', emotion: dominantEmotion, priority: 'medium' };
    }

    // Priority 5: Phase-based responses
    switch (phase) {
      case 'flowing':
        return { type: 'flow_continuation', priority: 'low' };
      case 'cooling':
        return { type: 'gentle_engagement', priority: 'medium' };
      case 'dormant':
        return { type: 'conversation_revival', priority: 'high' };
      default:
        return { type: 'natural_contribution', priority: 'low' };
    }
  }

  /**
   * Generate response based on selected strategy
   */
  async generateResponseByStrategy(strategy, persona, context, conversationState, roomTopic, language) {
    const templates = this.responseTemplates[language] || this.responseTemplates['ja'];
    const strategyTemplates = templates[strategy.type] || templates['natural_contribution'];

    // Get persona-specific response style
    const personaStyle = this.getPersonaResponseStyle(persona);
    
    // Select appropriate template based on persona traits
    const template = this.selectTemplateByPersona(strategyTemplates, personaStyle);
    
    // Generate contextual variables
    const variables = this.generateContextualVariables(
      persona, 
      context, 
      conversationState, 
      roomTopic, 
      strategy, 
      language
    );
    
    // Fill template with variables
    let response = this.fillTemplate(template, variables);
    
    // Apply persona personality modifications
    response = this.applyPersonalityModifications(response, persona, language);
    
    // Ensure response uniqueness
    response = this.ensureUniqueness(response, persona.id);

    return response;
  }

  /**
   * Get persona response style based on Big Five traits
   */
  getPersonaResponseStyle(persona) {
    return {
      verbosity: persona.extraversion > 3 ? 'verbose' : 'concise',
      formality: persona.conscientiousness > 3 ? 'formal' : 'casual',
      emotiveness: persona.neuroticism > 3 ? 'emotional' : 'stable',
      creativity: persona.openness > 3 ? 'creative' : 'practical',
      cooperation: persona.agreeableness > 3 ? 'agreeable' : 'independent'
    };
  }

  /**
   * Select template based on persona style
   */
  selectTemplateByPersona(templates, personaStyle) {
    // Filter templates by style compatibility
    const compatibleTemplates = templates.filter(template => {
      return this.isTemplateCompatible(template, personaStyle);
    });

    // Select from compatible templates or fall back to all templates
    const candidateTemplates = compatibleTemplates.length > 0 ? compatibleTemplates : templates;
    
    // Select randomly from candidates
    return candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)];
  }

  /**
   * Check if template is compatible with persona style
   */
  isTemplateCompatible(template, personaStyle) {
    // Check length compatibility
    if (personaStyle.verbosity === 'concise' && template.text.length > 100) return false;
    if (personaStyle.verbosity === 'verbose' && template.text.length < 30) return false;
    
    // Check formality compatibility
    if (personaStyle.formality === 'formal' && template.style.includes('casual')) return false;
    if (personaStyle.formality === 'casual' && template.style.includes('formal')) return false;
    
    return true;
  }

  /**
   * Generate contextual variables for template filling
   */
  generateContextualVariables(persona, context, conversationState, roomTopic, strategy, language) {
    const { lastMessage, emotionalCues } = context;
    const { phase, momentum } = conversationState;

    return {
      persona_name: persona.name,
      other_name: lastMessage ? lastMessage.sender_name : '',
      topic: roomTopic || '',
      emotion_level: momentum > 0.7 ? 'high' : momentum > 0.3 ? 'medium' : 'low',
      conversation_phase: phase,
      dominant_emotion: Object.entries(emotionalCues)
        .reduce((a, b) => emotionalCues[a[0]] > emotionalCues[b[0]] ? a : b)[0],
      time_context: this.getTimeContext(),
      last_message_snippet: lastMessage ? this.getMessageSnippet(lastMessage.content) : '',
      personality_trait: this.getDominantTrait(persona)
    };
  }

  /**
   * Fill template with contextual variables
   */
  fillTemplate(template, variables) {
    let response = template.text;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      response = response.replace(regex, value);
    });
    
    return response;
  }

  /**
   * Apply personality modifications to response
   */
  applyPersonalityModifications(response, persona, language) {
    // Add personality-based modifications
    if (persona.extraversion >= 4) {
      response = this.addEnthusiasm(response, language);
    }
    
    if (persona.openness >= 4) {
      response = this.addCreativity(response, language);
    }
    
    if (persona.agreeableness >= 4) {
      response = this.addWarmth(response, language);
    }
    
    if (persona.conscientiousness >= 4) {
      response = this.addStructure(response, language);
    }
    
    return response;
  }

  /**
   * Add enthusiasm to response
   */
  addEnthusiasm(response, language) {
    const enthusiasmMarkers = language === 'ja' 
      ? ['！', 'ね！', 'よ！', '✨'] 
      : ['!', ' That\'s exciting!', ' ✨'];
    
    const marker = enthusiasmMarkers[Math.floor(Math.random() * enthusiasmMarkers.length)];
    
    if (!response.includes('!') && !response.includes('！')) {
      return response + marker;
    }
    
    return response;
  }

  /**
   * Add creativity to response
   */
  addCreativity(response, language) {
    // Add creative metaphors or unique expressions occasionally
    if (Math.random() < 0.3) {
      const creativeAdditions = language === 'ja'
        ? ['🎨', '💭', '✨']
        : ['🎨', '💭', '✨'];
      
      const addition = creativeAdditions[Math.floor(Math.random() * creativeAdditions.length)];
      return response + ' ' + addition;
    }
    
    return response;
  }

  /**
   * Add warmth to response
   */
  addWarmth(response, language) {
    const warmthMarkers = language === 'ja'
      ? ['😊', '🤗', 'ですね', 'ます']
      : ['😊', '🤗', ' I appreciate that', ' That\'s thoughtful'];
    
    if (Math.random() < 0.4) {
      const marker = warmthMarkers[Math.floor(Math.random() * warmthMarkers.length)];
      return response + (typeof marker === 'string' && marker.startsWith(' ') ? marker : ' ' + marker);
    }
    
    return response;
  }

  /**
   * Add structure to response
   */
  addStructure(response, language) {
    // Add structured thinking patterns occasionally
    const structureMarkers = language === 'ja'
      ? ['まず、', 'つまり、', '要するに']
      : ['First,', 'In other words,', 'Essentially'];
    
    if (Math.random() < 0.2 && !response.match(/^(まず|つまり|要するに|First|In other words|Essentially)/)) {
      const marker = structureMarkers[Math.floor(Math.random() * structureMarkers.length)];
      return marker + ' ' + response.toLowerCase();
    }
    
    return response;
  }

  /**
   * Ensure response uniqueness to avoid repetition
   */
  ensureUniqueness(response, personaId) {
    const recentResponses = this.responseHistory.get(personaId) || [];
    
    // Check if response is too similar to recent ones
    const isTooSimilar = recentResponses.some(recent => {
      return this.calculateSimilarity(response, recent) > 0.7;
    });
    
    if (isTooSimilar) {
      // Add variation to make it unique
      const variations = ['ところで、', 'そういえば、', 'Actually, ', 'By the way, '];
      const variation = variations[Math.floor(Math.random() * variations.length)];
      response = variation + response;
    }
    
    return response;
  }

  /**
   * Track response for uniqueness checking
   */
  trackResponse(personaId, response) {
    if (!this.responseHistory.has(personaId)) {
      this.responseHistory.set(personaId, []);
    }
    
    const responses = this.responseHistory.get(personaId);
    responses.push(response);
    
    // Keep only recent responses
    if (responses.length > 10) {
      responses.shift();
    }
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate fallback response
   */
  generateFallbackResponse(persona, language) {
    const fallbacks = language === 'ja' 
      ? [
          'そうですね、興味深い話ですね',
          'なるほど、そういう考えもありますね',
          'それについてもう少し聞かせてください',
          '面白い視点ですね'
        ]
      : [
          'That\'s an interesting point',
          'I see what you mean',
          'Could you tell me more about that?',
          'That\'s a fascinating perspective'
        ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Helper methods
   */
  extractKeywords(text) {
    return new Set(text.toLowerCase().match(/\w+/g) || []);
  }

  calculateKeywordOverlap(set1, set2) {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  getTimeContext() {
    const hour = new Date().getHours();
    if (hour < 6) return 'late_night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  getMessageSnippet(content) {
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  }

  getDominantTrait(persona) {
    const traits = {
      extraversion: persona.extraversion,
      agreeableness: persona.agreeableness,
      conscientiousness: persona.conscientiousness,
      neuroticism: persona.neuroticism,
      openness: persona.openness
    };
    
    return Object.entries(traits)
      .reduce((a, b) => traits[a[0]] > traits[b[0]] ? a : b)[0];
  }

  /**
   * Initialize response templates
   */
  initializeResponseTemplates() {
    return {
      ja: {
        direct_response: [
          { text: '@{other_name} そうですね、{last_message_snippet}について私も考えていました', style: ['thoughtful'] },
          { text: '@{other_name} それは{emotion_level}な話ですね！', style: ['enthusiastic'] },
          { text: '@{other_name} 興味深いポイントですね', style: ['analytical'] }
        ],
        conversation_starter: [
          { text: 'ところで、皆さんは{topic}についてどう思いますか？', style: ['inclusive'] },
          { text: '最近{topic}に関して気になることがあるんです', style: ['personal'] },
          { text: '{topic}の話で思い出したことがあります', style: ['connective'] }
        ],
        natural_contribution: [
          { text: 'なるほど、私は{personality_trait}な性格なので、少し違う見方をしています', style: ['personal'] },
          { text: 'その話を聞いて、{dominant_emotion}な気持ちになりました', style: ['emotional'] },
          { text: '確かに{last_message_snippet}ですね', style: ['agreeable'] }
        ],
        emotional_response: [
          { text: 'それは{dominant_emotion}ですね！私も同じように感じます', style: ['empathetic'] },
          { text: '{other_name}の{dominant_emotion}な気持ち、よく分かります', style: ['supportive'] }
        ]
      },
      en: {
        direct_response: [
          { text: '@{other_name} Yes, I\'ve been thinking about {last_message_snippet} too', style: ['thoughtful'] },
          { text: '@{other_name} That\'s a {emotion_level} interesting point!', style: ['enthusiastic'] },
          { text: '@{other_name} I find that fascinating', style: ['analytical'] }
        ],
        conversation_starter: [
          { text: 'By the way, what do you think about {topic}?', style: ['inclusive'] },
          { text: 'I\'ve been curious about {topic} lately', style: ['personal'] },
          { text: 'That reminds me of something related to {topic}', style: ['connective'] }
        ],
        natural_contribution: [
          { text: 'Interesting, as someone who\'s {personality_trait}, I see it differently', style: ['personal'] },
          { text: 'That makes me feel {dominant_emotion}', style: ['emotional'] },
          { text: 'I agree that {last_message_snippet}', style: ['agreeable'] }
        ],
        emotional_response: [
          { text: 'That sounds {dominant_emotion}! I can relate to that', style: ['empathetic'] },
          { text: 'I understand your {dominant_emotion} feelings, {other_name}', style: ['supportive'] }
        ]
      }
    };
  }

  /**
   * Initialize conversation starters
   */
  initializeConversationStarters() {
    return {
      ja: [
        '最近どんなことに興味を持っていますか？',
        'この話題について、皆さんの意見を聞いてみたいです',
        '今日は何か新しい発見がありましたか？',
        'ふと思ったのですが...'
      ],
      en: [
        'What\'s been interesting you lately?',
        'I\'d love to hear everyone\'s thoughts on this topic',
        'Did you discover anything new today?',
        'I was just thinking...'
      ]
    };
  }
}

module.exports = new IntelligentResponseGenerator();