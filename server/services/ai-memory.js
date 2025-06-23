/**
 * Advanced AI Memory System for TeaRoom 2.0
 * Provides sophisticated long-term memory and learning capabilities for AI personas
 */

const crypto = require('crypto');

class AIMemorySystem {
  constructor() {
    this.memoryBanks = new Map(); // personaId -> MemoryBank
    this.globalKnowledge = new Map(); // Shared knowledge across personas
    this.conversationSummaries = new Map(); // roomId -> conversation summaries
    this.emotionalStates = new Map(); // personaId -> emotional state tracking
    this.relationshipMap = new Map(); // personaId -> relationships with other entities
    this.learningProgress = new Map(); // personaId -> learning metrics
    this.memoryRetentionConfig = {
      shortTerm: 7 * 24 * 60 * 60 * 1000, // 7 days
      mediumTerm: 30 * 24 * 60 * 60 * 1000, // 30 days
      longTerm: 365 * 24 * 60 * 60 * 1000, // 1 year
      maxMemories: 10000
    };
  }

  /**
   * Initialize memory bank for a persona
   */
  async initializePersonaMemory(persona) {
    const personaId = persona.id;
    
    if (!this.memoryBanks.has(personaId)) {
      const memoryBank = {
        shortTermMemories: [],
        mediumTermMemories: [],
        longTermMemories: [],
        personalPreferences: new Map(),
        conversationPatterns: new Map(),
        topicExpertise: new Map(),
        emotionalAssociations: new Map(),
        lastUpdated: Date.now()
      };
      
      this.memoryBanks.set(personaId, memoryBank);
      this.emotionalStates.set(personaId, this.initializeEmotionalState());
      this.relationshipMap.set(personaId, new Map());
      this.learningProgress.set(personaId, this.initializeLearningMetrics());
      
      // Load existing memories from database if available
      await this.loadPersonaMemoriesFromDatabase(personaId);
      
      console.log(`🧠 Initialized AI memory for persona ${persona.name} (ID: ${personaId})`);
    }
    
    return this.memoryBanks.get(personaId);
  }

  /**
   * Process and store new memory from conversation
   */
  async processConversationMemory(personaId, message, conversationContext) {
    const memoryBank = this.memoryBanks.get(personaId);
    if (!memoryBank) {
      console.warn(`⚠️ No memory bank found for persona ${personaId}`);
      return;
    }

    try {
      // Extract meaningful information from the message
      const memoryData = this.extractMemoryData(message, conversationContext);
      
      // Determine memory importance and type
      const importance = this.calculateMemoryImportance(memoryData, conversationContext);
      const memoryType = this.determineMemoryType(importance, memoryData);
      
      // Create memory object
      const memory = {
        id: this.generateMemoryId(),
        content: memoryData.content,
        context: memoryData.context,
        emotional_weight: memoryData.emotional_weight,
        importance: importance,
        type: memoryType,
        source: {
          roomId: conversationContext.roomId,
          messageId: message.id,
          timestamp: message.timestamp || new Date().toISOString()
        },
        associations: memoryData.associations,
        created_at: Date.now(),
        last_accessed: Date.now(),
        access_count: 0
      };

      // Store in appropriate memory bank
      this.storeMemoryByType(memoryBank, memory, memoryType);
      
      // Update related systems
      await this.updateEmotionalState(personaId, memoryData);
      await this.updateRelationships(personaId, memoryData);
      await this.updateLearningProgress(personaId, memoryData);
      
      // Consolidate memories if needed
      if (memoryBank.shortTermMemories.length > 100) {
        await this.consolidateMemories(personaId);
      }
      
      console.log(`💾 Stored ${memoryType} memory for persona ${personaId}: ${memory.content.substring(0, 50)}...`);
      
    } catch (error) {
      console.error(`❌ Error processing memory for persona ${personaId}:`, error);
    }
  }

  /**
   * Retrieve relevant memories for conversation context
   */
  async retrieveRelevantMemories(personaId, currentContext, limit = 10) {
    const memoryBank = this.memoryBanks.get(personaId);
    if (!memoryBank) return [];

    try {
      const allMemories = [
        ...memoryBank.longTermMemories,
        ...memoryBank.mediumTermMemories,
        ...memoryBank.shortTermMemories
      ];

      // Score memories by relevance
      const scoredMemories = allMemories.map(memory => ({
        memory,
        score: this.calculateMemoryRelevance(memory, currentContext)
      })).filter(item => item.score > 0.3); // Minimum relevance threshold

      // Sort by relevance and recency
      scoredMemories.sort((a, b) => {
        const scoreWeight = 0.7;
        const recencyWeight = 0.3;
        
        const scoreA = a.score * scoreWeight + this.calculateRecencyScore(a.memory) * recencyWeight;
        const scoreB = b.score * scoreWeight + this.calculateRecencyScore(b.memory) * recencyWeight;
        
        return scoreB - scoreA;
      });

      // Update access counts
      const topMemories = scoredMemories.slice(0, limit);
      topMemories.forEach(item => {
        item.memory.last_accessed = Date.now();
        item.memory.access_count++;
      });

      console.log(`🔍 Retrieved ${topMemories.length} relevant memories for persona ${personaId}`);
      
      return topMemories.map(item => item.memory);
      
    } catch (error) {
      console.error(`❌ Error retrieving memories for persona ${personaId}:`, error);
      return [];
    }
  }

  /**
   * Generate contextual memory summary for conversation
   */
  async generateMemoryContext(personaId, currentTopic, participants = []) {
    const relevantMemories = await this.retrieveRelevantMemories(personaId, {
      topic: currentTopic,
      participants: participants,
      type: 'conversation_context'
    }, 15);

    if (relevantMemories.length === 0) {
      return null;
    }

    // Group memories by type and importance
    const memorySummary = {
      personal_experiences: [],
      learned_preferences: [],
      relationship_insights: [],
      topic_knowledge: [],
      emotional_associations: []
    };

    relevantMemories.forEach(memory => {
      if (memory.content.includes('prefer') || memory.content.includes('like')) {
        memorySummary.learned_preferences.push(memory.content);
      } else if (memory.associations.people && memory.associations.people.length > 0) {
        memorySummary.relationship_insights.push(memory.content);
      } else if (memory.emotional_weight > 0.6) {
        memorySummary.emotional_associations.push(memory.content);
      } else if (memory.type === 'knowledge') {
        memorySummary.topic_knowledge.push(memory.content);
      } else {
        memorySummary.personal_experiences.push(memory.content);
      }
    });

    // Generate natural language summary
    return this.formatMemoryContextForConversation(memorySummary, currentTopic);
  }

  /**
   * Learn from conversation patterns
   */
  async updateConversationPatterns(personaId, conversationData) {
    const memoryBank = this.memoryBanks.get(personaId);
    if (!memoryBank) return;

    const patterns = memoryBank.conversationPatterns;
    
    // Track topic preferences
    if (conversationData.topic) {
      const topicKey = this.normalizeTopicKey(conversationData.topic);
      const current = patterns.get(`topic:${topicKey}`) || { engagement: 0, frequency: 0 };
      patterns.set(`topic:${topicKey}`, {
        engagement: (current.engagement + conversationData.engagement) / 2,
        frequency: current.frequency + 1,
        last_discussed: Date.now()
      });
    }

    // Track interaction patterns with specific users/personas
    if (conversationData.participants) {
      conversationData.participants.forEach(participant => {
        const participantKey = `interaction:${participant.name || participant.id}`;
        const current = patterns.get(participantKey) || { 
          total_interactions: 0, 
          positive_interactions: 0,
          topics_discussed: new Set()
        };
        
        patterns.set(participantKey, {
          total_interactions: current.total_interactions + 1,
          positive_interactions: current.positive_interactions + (conversationData.sentiment > 0 ? 1 : 0),
          topics_discussed: current.topics_discussed.add(conversationData.topic),
          last_interaction: Date.now()
        });
      });
    }

    // Track time-based patterns
    const hour = new Date().getHours();
    const timeKey = `time_pattern:${hour}`;
    const timePattern = patterns.get(timeKey) || { activity: 0, mood_sum: 0, count: 0 };
    patterns.set(timeKey, {
      activity: timePattern.activity + 1,
      mood_sum: timePattern.mood_sum + (conversationData.sentiment || 0),
      count: timePattern.count + 1
    });

    console.log(`📊 Updated conversation patterns for persona ${personaId}`);
  }

  /**
   * Extract meaningful memory data from message
   */
  extractMemoryData(message, context) {
    const content = message.content || '';
    
    // Analyze content for memory-worthy information
    const memoryData = {
      content: content,
      context: {
        roomId: context.roomId,
        topic: context.topic,
        participants: context.participants || [],
        timestamp: message.timestamp
      },
      emotional_weight: this.analyzeEmotionalWeight(content),
      associations: {
        people: this.extractPersonMentions(content),
        topics: this.extractTopics(content),
        emotions: this.extractEmotionalContent(content),
        keywords: this.extractKeywords(content)
      }
    };

    return memoryData;
  }

  /**
   * Calculate memory importance score
   */
  calculateMemoryImportance(memoryData, context) {
    let importance = 0.5; // Base importance
    
    // Emotional weight increases importance
    importance += memoryData.emotional_weight * 0.3;
    
    // Personal mentions increase importance
    if (memoryData.associations.people.length > 0) {
      importance += 0.2;
    }
    
    // Questions increase importance
    if (memoryData.content.includes('?') || memoryData.content.includes('？')) {
      importance += 0.15;
    }
    
    // Length and detail increase importance
    if (memoryData.content.length > 100) {
      importance += 0.1;
    }
    
    // New topics increase importance
    if (context.isNewTopic) {
      importance += 0.2;
    }
    
    return Math.min(importance, 1.0);
  }

  /**
   * Determine memory type based on importance and content
   */
  determineMemoryType(importance, memoryData) {
    if (importance > 0.8) {
      return 'longTerm';
    } else if (importance > 0.5) {
      return 'mediumTerm';
    } else {
      return 'shortTerm';
    }
  }

  /**
   * Store memory in appropriate bank
   */
  storeMemoryByType(memoryBank, memory, type) {
    switch (type) {
      case 'longTerm':
        memoryBank.longTermMemories.push(memory);
        // Keep only most important long-term memories
        if (memoryBank.longTermMemories.length > 1000) {
          memoryBank.longTermMemories.sort((a, b) => b.importance - a.importance);
          memoryBank.longTermMemories = memoryBank.longTermMemories.slice(0, 1000);
        }
        break;
      case 'mediumTerm':
        memoryBank.mediumTermMemories.push(memory);
        if (memoryBank.mediumTermMemories.length > 2000) {
          memoryBank.mediumTermMemories.sort((a, b) => b.importance - a.importance);
          memoryBank.mediumTermMemories = memoryBank.mediumTermMemories.slice(0, 2000);
        }
        break;
      default:
        memoryBank.shortTermMemories.push(memory);
        if (memoryBank.shortTermMemories.length > 500) {
          memoryBank.shortTermMemories.sort((a, b) => b.created_at - a.created_at);
          memoryBank.shortTermMemories = memoryBank.shortTermMemories.slice(0, 500);
        }
    }
  }

  /**
   * Calculate memory relevance to current context
   */
  calculateMemoryRelevance(memory, currentContext) {
    let relevance = 0;
    
    // Topic similarity
    if (currentContext.topic && memory.context.topic) {
      const topicSimilarity = this.calculateTopicSimilarity(currentContext.topic, memory.context.topic);
      relevance += topicSimilarity * 0.4;
    }
    
    // Participant overlap
    if (currentContext.participants && memory.context.participants) {
      const participantOverlap = this.calculateParticipantOverlap(
        currentContext.participants, 
        memory.context.participants
      );
      relevance += participantOverlap * 0.3;
    }
    
    // Keyword matching
    if (currentContext.keywords && memory.associations.keywords) {
      const keywordMatch = this.calculateKeywordMatch(
        currentContext.keywords,
        memory.associations.keywords
      );
      relevance += keywordMatch * 0.2;
    }
    
    // Importance boost
    relevance += memory.importance * 0.1;
    
    return Math.min(relevance, 1.0);
  }

  /**
   * Initialize emotional state for persona
   */
  initializeEmotionalState() {
    return {
      currentMood: 0.5, // -1 to 1 scale
      energy: 0.5, // 0 to 1 scale
      curiosity: 0.5,
      confidence: 0.5,
      social_engagement: 0.5,
      emotional_history: [],
      last_updated: Date.now()
    };
  }

  /**
   * Initialize learning metrics
   */
  initializeLearningMetrics() {
    return {
      topics_learned: new Set(),
      conversation_skills: 0.5,
      relationship_building: 0.5,
      knowledge_retention: 0.5,
      adaptability: 0.5,
      total_interactions: 0,
      successful_interactions: 0,
      learning_rate: 0.1,
      last_updated: Date.now()
    };
  }

  /**
   * Consolidate and optimize memories
   */
  async consolidateMemories(personaId) {
    const memoryBank = this.memoryBanks.get(personaId);
    if (!memoryBank) return;

    try {
      // Promote important short-term memories to medium-term
      const importantShortTerm = memoryBank.shortTermMemories
        .filter(memory => memory.importance > 0.7 || memory.access_count > 5)
        .map(memory => ({ ...memory, type: 'mediumTerm' }));

      // Remove promoted memories from short-term
      memoryBank.shortTermMemories = memoryBank.shortTermMemories
        .filter(memory => memory.importance <= 0.7 && memory.access_count <= 5);

      // Add promoted memories to medium-term
      memoryBank.mediumTermMemories.push(...importantShortTerm);

      // Similarly, promote medium-term to long-term
      const importantMediumTerm = memoryBank.mediumTermMemories
        .filter(memory => memory.importance > 0.9 || memory.access_count > 20)
        .map(memory => ({ ...memory, type: 'longTerm' }));

      memoryBank.mediumTermMemories = memoryBank.mediumTermMemories
        .filter(memory => memory.importance <= 0.9 && memory.access_count <= 20);

      memoryBank.longTermMemories.push(...importantMediumTerm);

      // Clean up old, low-importance memories
      const cutoffDate = Date.now() - this.memoryRetentionConfig.shortTerm;
      memoryBank.shortTermMemories = memoryBank.shortTermMemories
        .filter(memory => memory.created_at > cutoffDate || memory.importance > 0.6);

      console.log(`🧹 Consolidated memories for persona ${personaId}: promoted ${importantShortTerm.length + importantMediumTerm.length} memories`);
      
    } catch (error) {
      console.error(`❌ Error consolidating memories for persona ${personaId}:`, error);
    }
  }

  /**
   * Generate memory ID
   */
  generateMemoryId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Helper methods for analysis
   */
  analyzeEmotionalWeight(content) {
    const emotionalWords = ['love', 'hate', 'excited', 'sad', 'angry', 'happy', 'frustrated', 'amazing', 'terrible', 'wonderful'];
    const emotionalMarkers = ['!', '!!', '...', '?!'];
    
    let weight = 0;
    
    emotionalWords.forEach(word => {
      if (content.toLowerCase().includes(word)) weight += 0.2;
    });
    
    emotionalMarkers.forEach(marker => {
      if (content.includes(marker)) weight += 0.1;
    });
    
    return Math.min(weight, 1.0);
  }

  extractPersonMentions(content) {
    const mentions = [];
    const mentionPattern = /@(\w+)/g;
    let match;
    
    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  extractTopics(content) {
    // Simple topic extraction - could be enhanced with NLP
    const topicKeywords = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'them', 'were', 'been', 'have'].includes(word));
    
    return topicKeywords.slice(0, 5); // Top 5 potential topics
  }

  extractEmotionalContent(content) {
    const emotions = [];
    const emotionPattern = /(happy|sad|angry|excited|frustrated|curious|confused|proud|worried|grateful)/gi;
    let match;
    
    while ((match = emotionPattern.exec(content)) !== null) {
      emotions.push(match[1].toLowerCase());
    }
    
    return emotions;
  }

  extractKeywords(content) {
    return content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  /**
   * Load existing memories from database
   */
  async loadPersonaMemoriesFromDatabase(personaId) {
    try {
      const database = require('../database/database');
      
      // Create memories table if it doesn't exist
      await database.run(`
        CREATE TABLE IF NOT EXISTS persona_memories (
          id TEXT PRIMARY KEY,
          persona_id INTEGER,
          content TEXT,
          context TEXT,
          emotional_weight REAL,
          importance REAL,
          memory_type TEXT,
          associations TEXT,
          created_at INTEGER,
          last_accessed INTEGER,
          access_count INTEGER,
          FOREIGN KEY (persona_id) REFERENCES personas (id)
        )
      `);
      
      // Load existing memories
      const memories = await database.all(`
        SELECT * FROM persona_memories 
        WHERE persona_id = ? 
        ORDER BY created_at DESC
      `, [personaId]);
      
      const memoryBank = this.memoryBanks.get(personaId);
      if (memoryBank && memories.length > 0) {
        memories.forEach(row => {
          const memory = {
            id: row.id,
            content: row.content,
            context: JSON.parse(row.context || '{}'),
            emotional_weight: row.emotional_weight,
            importance: row.importance,
            type: row.memory_type,
            associations: JSON.parse(row.associations || '{}'),
            created_at: row.created_at,
            last_accessed: row.last_accessed,
            access_count: row.access_count
          };
          
          this.storeMemoryByType(memoryBank, memory, row.memory_type);
        });
        
        console.log(`📥 Loaded ${memories.length} existing memories for persona ${personaId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error loading memories from database for persona ${personaId}:`, error);
    }
  }

  /**
   * Save memory to database
   */
  async saveMemoryToDatabase(personaId, memory) {
    try {
      const database = require('../database/database');
      
      await database.run(`
        INSERT OR REPLACE INTO persona_memories (
          id, persona_id, content, context, emotional_weight, 
          importance, memory_type, associations, created_at, 
          last_accessed, access_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        memory.id,
        personaId,
        memory.content,
        JSON.stringify(memory.context),
        memory.emotional_weight,
        memory.importance,
        memory.type,
        JSON.stringify(memory.associations),
        memory.created_at,
        memory.last_accessed,
        memory.access_count
      ]);
      
    } catch (error) {
      console.error(`❌ Error saving memory to database:`, error);
    }
  }

  /**
   * Format memory context for conversation
   */
  formatMemoryContextForConversation(memorySummary, currentTopic) {
    const contextParts = [];
    
    if (memorySummary.learned_preferences.length > 0) {
      contextParts.push(`個人的な好み: ${memorySummary.learned_preferences.slice(0, 2).join(', ')}`);
    }
    
    if (memorySummary.relationship_insights.length > 0) {
      contextParts.push(`人間関係の記憶: ${memorySummary.relationship_insights.slice(0, 2).join(', ')}`);
    }
    
    if (memorySummary.topic_knowledge.length > 0) {
      contextParts.push(`関連知識: ${memorySummary.topic_knowledge.slice(0, 2).join(', ')}`);
    }
    
    if (memorySummary.emotional_associations.length > 0) {
      contextParts.push(`感情的な記憶: ${memorySummary.emotional_associations.slice(0, 1).join(', ')}`);
    }
    
    return contextParts.length > 0 ? 
      `【記憶からの背景情報】\n${contextParts.join('\n')}\n` : null;
  }

  /**
   * Update emotional state based on new memory
   */
  async updateEmotionalState(personaId, memoryData) {
    const emotionalState = this.emotionalStates.get(personaId);
    if (!emotionalState) return;

    // Adjust emotional state based on memory content
    const emotionalImpact = memoryData.emotional_weight;
    const emotions = memoryData.associations.emotions || [];
    
    // Update mood based on emotional content
    if (emotions.includes('happy') || emotions.includes('excited')) {
      emotionalState.currentMood = Math.min(emotionalState.currentMood + emotionalImpact * 0.1, 1);
    } else if (emotions.includes('sad') || emotions.includes('frustrated')) {
      emotionalState.currentMood = Math.max(emotionalState.currentMood - emotionalImpact * 0.1, -1);
    }
    
    // Update curiosity and engagement
    if (memoryData.content.includes('?') || memoryData.content.includes('curious')) {
      emotionalState.curiosity = Math.min(emotionalState.curiosity + 0.05, 1);
    }
    
    // Track emotional history
    emotionalState.emotional_history.push({
      timestamp: Date.now(),
      mood: emotionalState.currentMood,
      trigger: memoryData.content.substring(0, 50)
    });
    
    // Keep only recent emotional history
    if (emotionalState.emotional_history.length > 100) {
      emotionalState.emotional_history = emotionalState.emotional_history.slice(-100);
    }
    
    emotionalState.last_updated = Date.now();
  }

  /**
   * Update relationships based on memory
   */
  async updateRelationships(personaId, memoryData) {
    const relationships = this.relationshipMap.get(personaId);
    if (!relationships) return;

    memoryData.associations.people.forEach(person => {
      const current = relationships.get(person) || {
        interactions: 0,
        positive_sentiment: 0,
        topics_discussed: new Set(),
        emotional_connection: 0.5,
        trust_level: 0.5
      };
      
      relationships.set(person, {
        interactions: current.interactions + 1,
        positive_sentiment: current.positive_sentiment + (memoryData.emotional_weight > 0 ? 1 : 0),
        topics_discussed: current.topics_discussed.add(memoryData.context.topic),
        emotional_connection: Math.min(current.emotional_connection + memoryData.emotional_weight * 0.05, 1),
        trust_level: Math.min(current.trust_level + 0.01, 1),
        last_interaction: Date.now()
      });
    });
  }

  /**
   * Update learning progress
   */
  async updateLearningProgress(personaId, memoryData) {
    const learning = this.learningProgress.get(personaId);
    if (!learning) return;

    learning.total_interactions++;
    
    // Consider interaction successful if it has emotional weight or new knowledge
    if (memoryData.emotional_weight > 0.3 || memoryData.associations.topics.length > 0) {
      learning.successful_interactions++;
    }
    
    // Add new topics to learned topics
    memoryData.associations.topics.forEach(topic => {
      learning.topics_learned.add(topic);
    });
    
    // Update learning metrics
    const successRate = learning.successful_interactions / learning.total_interactions;
    learning.conversation_skills = Math.min(learning.conversation_skills + (successRate - 0.5) * 0.01, 1);
    learning.knowledge_retention = Math.min(learning.knowledge_retention + learning.topics_learned.size * 0.001, 1);
    
    learning.last_updated = Date.now();
  }

  /**
   * Get memory statistics for persona
   */
  getMemoryStatistics(personaId) {
    const memoryBank = this.memoryBanks.get(personaId);
    const emotionalState = this.emotionalStates.get(personaId);
    const relationships = this.relationshipMap.get(personaId);
    const learning = this.learningProgress.get(personaId);
    
    if (!memoryBank) return null;
    
    return {
      memory_counts: {
        shortTerm: memoryBank.shortTermMemories.length,
        mediumTerm: memoryBank.mediumTermMemories.length,
        longTerm: memoryBank.longTermMemories.length,
        total: memoryBank.shortTermMemories.length + memoryBank.mediumTermMemories.length + memoryBank.longTermMemories.length
      },
      emotional_state: emotionalState ? {
        mood: emotionalState.currentMood,
        energy: emotionalState.energy,
        curiosity: emotionalState.curiosity
      } : null,
      relationships: relationships ? relationships.size : 0,
      learning_progress: learning ? {
        topics_learned: learning.topics_learned.size,
        conversation_skills: learning.conversation_skills,
        success_rate: learning.successful_interactions / Math.max(learning.total_interactions, 1)
      } : null
    };
  }

  /**
   * Cleanup unused memories
   */
  cleanup() {
    console.log('🧹 Cleaning up AI memory system...');
    this.memoryBanks.clear();
    this.globalKnowledge.clear();
    this.conversationSummaries.clear();
    this.emotionalStates.clear();
    this.relationshipMap.clear();
    this.learningProgress.clear();
  }
}

module.exports = new AIMemorySystem();