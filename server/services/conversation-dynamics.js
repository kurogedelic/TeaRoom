/**
 * Conversation Dynamics Service for TeaRoom 2.0
 * Provides intelligent conversation flow, timing, and context awareness
 */

class ConversationDynamics {
  constructor() {
    this.conversationStates = new Map(); // roomId -> conversation state
    this.emotionalContext = new Map(); // roomId -> emotional context
    this.conversationMomentum = new Map(); // roomId -> momentum data
    this.recentInteractions = new Map(); // roomId -> recent interaction history
  }

  /**
   * Analyze conversation context and momentum
   */
  analyzeConversationState(messages, personas, roomId) {
    const recentMessages = messages.slice(-10);
    const currentTime = Date.now();
    
    // Calculate conversation metrics
    const metrics = {
      messageFrequency: this.calculateMessageFrequency(recentMessages),
      participantActivity: this.analyzeParticipantActivity(recentMessages, personas),
      emotionalTone: this.analyzeEmotionalTone(recentMessages),
      topicContinuity: this.analyzeTopicContinuity(recentMessages),
      conversationDepth: this.analyzeConversationDepth(recentMessages),
      lastActivity: this.getLastActivityTime(recentMessages)
    };

    // Determine conversation state
    const state = this.determineConversationState(metrics, currentTime);
    
    // Store state for room
    this.conversationStates.set(roomId, {
      ...state,
      metrics,
      lastUpdated: currentTime
    });

    return state;
  }

  /**
   * Calculate message frequency and patterns
   */
  calculateMessageFrequency(messages) {
    if (messages.length < 2) return { rate: 0, pattern: 'new' };

    const timestamps = messages.map(m => new Date(m.timestamp).getTime());
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const rate = 60000 / avgInterval; // Messages per minute

    let pattern = 'steady';
    if (rate > 3) pattern = 'rapid';
    else if (rate < 0.5) pattern = 'slow';
    else if (intervals.slice(-3).every(i => i < avgInterval * 0.7)) pattern = 'accelerating';
    else if (intervals.slice(-3).every(i => i > avgInterval * 1.3)) pattern = 'slowing';

    return { rate, pattern, avgInterval };
  }

  /**
   * Analyze participant activity patterns
   */
  analyzeParticipantActivity(messages, personas) {
    const activity = {};
    const recentCutoff = Date.now() - (5 * 60 * 1000); // Last 5 minutes

    // Initialize activity tracking
    personas.forEach(p => {
      activity[p.name] = { 
        messageCount: 0, 
        recentActivity: false, 
        lastMessage: null,
        engagement: 0 
      };
    });

    // Count messages and analyze engagement
    messages.forEach(msg => {
      const sender = msg.sender_name;
      const timestamp = new Date(msg.timestamp).getTime();
      
      if (activity[sender]) {
        activity[sender].messageCount++;
        activity[sender].lastMessage = timestamp;
        activity[sender].recentActivity = timestamp > recentCutoff;
        
        // Calculate engagement score based on message content
        activity[sender].engagement += this.calculateEngagementScore(msg.content);
      }
    });

    // Determine conversation balance
    const participantCounts = Object.values(activity).map(a => a.messageCount);
    const balance = this.calculateBalance(participantCounts);

    return { activity, balance };
  }

  /**
   * Analyze emotional tone of conversation
   */
  analyzeEmotionalTone(messages) {
    const emotions = {
      positive: 0,
      negative: 0,
      neutral: 0,
      excitement: 0,
      concern: 0
    };

    // Emotional keywords and patterns
    const patterns = {
      positive: /[😊😄😆🥰😍✨🎉👍良い|嬉しい|楽しい|素晴らしい|最高|good|great|awesome|happy|excited]/gi,
      negative: /[😢😞😰😟💔困る|悲しい|残念|大変|問題|bad|sad|worried|terrible|problem]/gi,
      excitement: /[⚡🔥💫！!|わー|すごい|やった|amazing|wow|incredible]/gi,
      concern: /[🤔💭どう|心配|気になる|think|wonder|concerned|curious]/gi,
      neutral: /[🤖📝なるほど|そうです|わかり|understand|see|noted]/gi
    };

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      Object.keys(patterns).forEach(emotion => {
        const matches = content.match(patterns[emotion]);
        if (matches) {
          emotions[emotion] += matches.length;
        }
      });
    });

    // Calculate dominant emotion
    const total = Object.values(emotions).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return { dominant: 'neutral', intensity: 0, emotions };
    }

    const dominant = Object.entries(emotions)
      .reduce((a, b) => emotions[a[0]] > emotions[b[0]] ? a : b)[0];
    
    const intensity = emotions[dominant] / total;

    return { dominant, intensity, emotions, total };
  }

  /**
   * Analyze topic continuity and conversation flow
   */
  analyzeTopicContinuity(messages) {
    if (messages.length < 2) return { coherence: 1, topicShifts: 0 };

    let topicShifts = 0;
    let coherentSequence = 0;
    const maxCoherentSequence = Math.max(1, messages.length - 1);

    // Simple topic analysis based on keyword overlap
    for (let i = 1; i < messages.length; i++) {
      const prev = this.extractKeywords(messages[i-1].content);
      const curr = this.extractKeywords(messages[i].content);
      
      const overlap = this.calculateOverlap(prev, curr);
      
      if (overlap < 0.2) {
        topicShifts++;
      } else {
        coherentSequence++;
      }
    }

    const coherence = coherentSequence / maxCoherentSequence;
    
    return { coherence, topicShifts, continuity: coherence > 0.6 ? 'high' : coherence > 0.3 ? 'medium' : 'low' };
  }

  /**
   * Extract simple keywords from message content
   */
  extractKeywords(content) {
    // Remove common words and extract meaningful terms
    const stopWords = /\b(は|が|を|に|で|と|の|a|an|the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    const words = content
      .toLowerCase()
      .replace(stopWords, '')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    return new Set(words);
  }

  /**
   * Calculate overlap between two keyword sets
   */
  calculateOverlap(set1, set2) {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Analyze conversation depth and complexity
   */
  analyzeConversationDepth(messages) {
    const depths = messages.map(msg => {
      const content = msg.content;
      let depth = 0;
      
      // Question indicators
      if (/[？?]/.test(content)) depth += 1;
      
      // Complex thoughts
      if (/because|なぜなら|thinking|考え|feel|感じ/.test(content)) depth += 2;
      
      // Personal sharing
      if (/I|私|my|僕|me|自分/.test(content)) depth += 1;
      
      // Emotional expression
      if (/[😊😢😍😰🥰💔]/.test(content)) depth += 1;
      
      // Length complexity
      if (content.length > 100) depth += 1;
      if (content.length > 200) depth += 1;
      
      return Math.min(depth, 5); // Cap at 5
    });

    const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length || 0;
    
    return {
      average: avgDepth,
      trend: this.calculateTrend(depths.slice(-5)),
      level: avgDepth > 3 ? 'deep' : avgDepth > 2 ? 'medium' : 'surface'
    };
  }

  /**
   * Calculate engagement score for a message
   */
  calculateEngagementScore(content) {
    let score = 1; // Base score
    
    // Question engagement
    if (/[？?]/.test(content)) score += 2;
    
    // Emotional engagement
    if (/[😊😄😢😍🥰⚡🔥]/.test(content)) score += 1;
    
    // @ mentions
    if (/@/.test(content)) score += 1;
    
    // Length indicates engagement
    if (content.length > 50) score += 1;
    if (content.length > 100) score += 1;
    
    return score;
  }

  /**
   * Calculate balance between participants
   */
  calculateBalance(counts) {
    if (counts.length === 0) return 1;
    
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 1;
    
    const expected = total / counts.length;
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - expected, 2);
    }, 0) / counts.length;
    
    // Convert variance to balance score (0-1, higher is more balanced)
    const maxVariance = Math.pow(expected, 2);
    return Math.max(0, 1 - (variance / maxVariance));
  }

  /**
   * Calculate trend in recent data points
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Get time since last activity
   */
  getLastActivityTime(messages) {
    if (messages.length === 0) return null;
    
    const lastMessage = messages[messages.length - 1];
    return new Date(lastMessage.timestamp).getTime();
  }

  /**
   * Determine overall conversation state
   */
  determineConversationState(metrics, currentTime) {
    const { messageFrequency, participantActivity, emotionalTone, topicContinuity, conversationDepth, lastActivity } = metrics;
    
    // Calculate time since last activity
    const timeSinceActivity = lastActivity ? currentTime - lastActivity : Infinity;
    const minutesSinceActivity = timeSinceActivity / (60 * 1000);
    
    // Determine engagement level
    let engagement = 'low';
    if (messageFrequency.rate > 2 || emotionalTone.intensity > 0.3) {
      engagement = 'high';
    } else if (messageFrequency.rate > 0.5 || emotionalTone.intensity > 0.1) {
      engagement = 'medium';
    }
    
    // Determine conversation phase
    let phase = 'active';
    if (minutesSinceActivity > 10) {
      phase = 'dormant';
    } else if (minutesSinceActivity > 3) {
      phase = 'cooling';
    } else if (engagement === 'high' && topicContinuity.coherence > 0.6) {
      phase = 'flowing';
    }
    
    return {
      engagement,
      phase,
      momentum: this.calculateMomentum(metrics),
      needsIntervention: this.shouldIntervene(metrics, minutesSinceActivity),
      suggestedTiming: this.calculateOptimalTiming(metrics, phase),
      context: {
        emotional: emotionalTone.dominant,
        topical: topicContinuity.continuity,
        social: participantActivity.balance > 0.6 ? 'balanced' : 'unbalanced'
      }
    };
  }

  /**
   * Calculate conversation momentum
   */
  calculateMomentum(metrics) {
    const { messageFrequency, emotionalTone, conversationDepth } = metrics;
    
    let momentum = 0;
    
    // Frequency contributes to momentum
    momentum += Math.min(messageFrequency.rate / 5, 1) * 0.4;
    
    // Emotional intensity adds momentum
    momentum += emotionalTone.intensity * 0.3;
    
    // Conversation depth adds momentum
    momentum += (conversationDepth.average / 5) * 0.3;
    
    return Math.min(momentum, 1);
  }

  /**
   * Determine if conversation needs AI intervention
   */
  shouldIntervene(metrics, minutesSinceActivity) {
    // Intervene if conversation is cooling down
    if (minutesSinceActivity > 2 && metrics.messageFrequency.rate < 0.5) {
      return { needed: true, reason: 'cooling_conversation', urgency: 'medium' };
    }
    
    // Intervene if one participant is dominating
    if (metrics.participantActivity.balance < 0.3) {
      return { needed: true, reason: 'unbalanced_participation', urgency: 'low' };
    }
    
    // Intervene if conversation lacks depth
    if (metrics.conversationDepth.average < 1.5 && minutesSinceActivity > 1) {
      return { needed: true, reason: 'surface_conversation', urgency: 'low' };
    }
    
    return { needed: false, reason: null, urgency: 'none' };
  }

  /**
   * Calculate optimal timing for next AI message
   */
  calculateOptimalTiming(metrics, phase) {
    const { messageFrequency, emotionalTone } = metrics;
    
    let baseDelay = 30000; // 30 seconds default
    
    switch (phase) {
      case 'flowing':
        baseDelay = 10000 + Math.random() * 15000; // 10-25s
        break;
      case 'active':
        baseDelay = 20000 + Math.random() * 20000; // 20-40s
        break;
      case 'cooling':
        baseDelay = 15000 + Math.random() * 15000; // 15-30s
        break;
      case 'dormant':
        baseDelay = 5000 + Math.random() * 10000; // 5-15s
        break;
    }
    
    // Adjust based on emotional intensity
    if (emotionalTone.intensity > 0.5) {
      baseDelay *= 0.7; // Respond faster to emotional content
    }
    
    // Adjust based on message frequency
    if (messageFrequency.pattern === 'rapid') {
      baseDelay *= 0.8; // Keep up with rapid conversation
    } else if (messageFrequency.pattern === 'slow') {
      baseDelay *= 1.3; // Give more space in slow conversations
    }
    
    return Math.max(5000, Math.min(baseDelay, 120000)); // 5s - 2min range
  }

  /**
   * Get conversation state for a room
   */
  getConversationState(roomId) {
    return this.conversationStates.get(roomId) || null;
  }

  /**
   * Update emotional context for a room
   */
  updateEmotionalContext(roomId, emotion, intensity) {
    const context = this.emotionalContext.get(roomId) || { history: [], current: 'neutral' };
    
    context.history.push({
      emotion,
      intensity,
      timestamp: Date.now()
    });
    
    // Keep only recent history (last 10 emotional states)
    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }
    
    context.current = emotion;
    this.emotionalContext.set(roomId, context);
  }

  /**
   * Clear state for a room (when room becomes inactive)
   */
  clearRoomState(roomId) {
    this.conversationStates.delete(roomId);
    this.emotionalContext.delete(roomId);
    this.conversationMomentum.delete(roomId);
    this.recentInteractions.delete(roomId);
  }
}

module.exports = new ConversationDynamics();