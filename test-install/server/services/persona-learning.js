/**
 * Advanced Persona Learning and Adaptation System for TeaRoom 2.0
 * Enables AI personas to learn, adapt, and evolve based on interactions
 */

const aiMemory = require('./ai-memory');

class PersonaLearningSystem {
  constructor() {
    this.learningProfiles = new Map(); // personaId -> learning profile
    this.adaptationRules = new Map(); // personaId -> adaptation rules
    this.skillProgressions = new Map(); // personaId -> skill development
    this.personalityDrift = new Map(); // personaId -> personality evolution tracking
    this.interactionAnalytics = new Map(); // personaId -> detailed interaction metrics
    this.learningConfig = {
      maxAdaptationRate: 0.05, // Maximum change per interaction (5%)
      memoryInfluenceWeight: 0.3,
      recentInteractionWeight: 0.5,
      personalityStabilityFactor: 0.8, // How much personality resists change
      skillGrowthRate: 0.02,
      minInteractionsForAdaptation: 10
    };
  }

  /**
   * Initialize learning system for a persona
   */
  async initializePersonaLearning(persona) {
    const personaId = persona.id;
    
    if (!this.learningProfiles.has(personaId)) {
      const learningProfile = {
        basePersonality: {
          extraversion: persona.extraversion,
          agreeableness: persona.agreeableness,
          conscientiousness: persona.conscientiousness,
          neuroticism: persona.neuroticism,
          openness: persona.openness
        },
        currentPersonality: {
          extraversion: persona.extraversion,
          agreeableness: persona.agreeableness,
          conscientiousness: persona.conscientiousness,
          neuroticism: persona.neuroticism,
          openness: persona.openness
        },
        learningSpeed: this.calculateInitialLearningSpeed(persona),
        adaptabilityFactors: {
          conversational: 0.5,
          emotional: 0.5,
          topical: 0.5,
          social: 0.5
        },
        specializations: new Set(),
        weaknesses: new Set(),
        lastUpdated: Date.now()
      };
      
      this.learningProfiles.set(personaId, learningProfile);
      this.initializeSkillProgressions(personaId);
      this.initializeInteractionAnalytics(personaId);
      
      console.log(`🧠 Initialized learning system for persona ${persona.name} (ID: ${personaId})`);
    }
    
    return this.learningProfiles.get(personaId);
  }

  /**
   * Process learning from conversation interaction
   */
  async processLearningFromInteraction(personaId, interaction) {
    try {
      const learningProfile = this.learningProfiles.get(personaId);
      if (!learningProfile) {
        console.warn(`⚠️ No learning profile found for persona ${personaId}`);
        return;
      }

      // Analyze interaction for learning opportunities
      const learningOpportunities = await this.analyzeInteractionForLearning(interaction);
      
      // Update skill progressions
      await this.updateSkillProgressions(personaId, learningOpportunities);
      
      // Apply personality adaptations
      await this.applyPersonalityAdaptations(personaId, learningOpportunities);
      
      // Update interaction analytics
      await this.updateInteractionAnalytics(personaId, interaction, learningOpportunities);
      
      // Check for new specializations or weaknesses
      await this.evaluateSpecializationsAndWeaknesses(personaId);
      
      // Update learning speed based on performance
      this.updateLearningSpeed(personaId, learningOpportunities);
      
      console.log(`📚 Processed learning for persona ${personaId}:`, {
        skills_improved: learningOpportunities.skillImprovements.length,
        personality_drift: this.calculatePersonalityDrift(personaId),
        new_specializations: learningOpportunities.newKnowledgeAreas.length
      });
      
    } catch (error) {
      console.error(`❌ Error processing learning for persona ${personaId}:`, error);
    }
  }

  /**
   * Generate adaptive personality modifications for conversation
   */
  async generateAdaptivePersonality(personaId, conversationContext) {
    const learningProfile = this.learningProfiles.get(personaId);
    if (!learningProfile) return null;

    try {
      // Get current adapted personality
      const adaptedPersonality = { ...learningProfile.currentPersonality };
      
      // Apply contextual adaptations based on learning
      const contextualAdaptations = await this.calculateContextualAdaptations(
        personaId, 
        conversationContext
      );
      
      // Apply learned preferences and patterns
      const learnedAdaptations = await this.applyLearnedPatterns(personaId, conversationContext);
      
      // Combine adaptations with stability factor
      const finalPersonality = this.blendPersonalityAdaptations(
        adaptedPersonality,
        contextualAdaptations,
        learnedAdaptations
      );
      
      return {
        personality: finalPersonality,
        adaptationReasons: {
          contextual: contextualAdaptations.reasons || [],
          learned: learnedAdaptations.reasons || []
        },
        confidence: this.calculateAdaptationConfidence(personaId)
      };
      
    } catch (error) {
      console.error(`❌ Error generating adaptive personality for persona ${personaId}:`, error);
      return null;
    }
  }

  /**
   * Analyze interaction for learning opportunities
   */
  async analyzeInteractionForLearning(interaction) {
    const analysis = {
      skillImprovements: [],
      personalityInfluences: [],
      newKnowledgeAreas: [],
      socialLearning: [],
      emotionalLearning: [],
      communicationLearning: []
    };

    const content = interaction.message?.content || '';
    const context = interaction.context || {};
    
    // Analyze for skill improvements
    if (content.includes('?')) {
      analysis.skillImprovements.push({
        skill: 'questioning',
        improvement: 0.02,
        reason: 'asked thoughtful question'
      });
    }
    
    if (content.length > 100) {
      analysis.skillImprovements.push({
        skill: 'detailed_communication',
        improvement: 0.01,
        reason: 'provided detailed response'
      });
    }
    
    // Analyze emotional content for personality influence
    const emotionalWords = this.extractEmotionalContent(content);
    if (emotionalWords.length > 0) {
      emotionalWords.forEach(emotion => {
        analysis.personalityInfluences.push({
          trait: this.mapEmotionToPersonalityTrait(emotion),
          influence: 0.005,
          reason: `expressed ${emotion}`
        });
      });
    }
    
    // Analyze for new knowledge areas
    const topics = this.extractTopics(content);
    topics.forEach(topic => {
      analysis.newKnowledgeAreas.push({
        area: topic,
        engagement: context.engagement || 0.5,
        depth: content.length / 100 // Rough depth measure
      });
    });
    
    // Analyze social interaction patterns
    if (context.participants && context.participants.length > 1) {
      analysis.socialLearning.push({
        type: 'group_interaction',
        participants_count: context.participants.length,
        engagement_level: context.engagement || 0.5
      });
    }
    
    // Analyze success/failure patterns
    const responseQuality = this.assessResponseQuality(interaction);
    if (responseQuality.success) {
      analysis.skillImprovements.push({
        skill: 'conversation_effectiveness',
        improvement: responseQuality.score * 0.01,
        reason: 'successful interaction pattern'
      });
    }
    
    return analysis;
  }

  /**
   * Update skill progressions based on learning
   */
  async updateSkillProgressions(personaId, learningOpportunities) {
    const skillProgression = this.skillProgressions.get(personaId);
    if (!skillProgression) return;

    learningOpportunities.skillImprovements.forEach(improvement => {
      const currentLevel = skillProgression.skills.get(improvement.skill) || 0.5;
      const newLevel = Math.min(currentLevel + improvement.improvement, 1.0);
      
      skillProgression.skills.set(improvement.skill, newLevel);
      
      // Track improvement history
      if (!skillProgression.improvementHistory.has(improvement.skill)) {
        skillProgression.improvementHistory.set(improvement.skill, []);
      }
      
      skillProgression.improvementHistory.get(improvement.skill).push({
        timestamp: Date.now(),
        improvement: improvement.improvement,
        reason: improvement.reason,
        newLevel: newLevel
      });
    });

    // Update overall skill level
    const avgSkillLevel = Array.from(skillProgression.skills.values())
      .reduce((sum, level) => sum + level, 0) / skillProgression.skills.size;
    
    skillProgression.overallLevel = avgSkillLevel;
    skillProgression.lastUpdated = Date.now();
  }

  /**
   * Apply personality adaptations based on learning
   */
  async applyPersonalityAdaptations(personaId, learningOpportunities) {
    const learningProfile = this.learningProfiles.get(personaId);
    if (!learningProfile) return;

    const adaptationRate = this.learningConfig.maxAdaptationRate * learningProfile.learningSpeed;
    
    learningOpportunities.personalityInfluences.forEach(influence => {
      const currentValue = learningProfile.currentPersonality[influence.trait];
      if (currentValue !== undefined) {
        const change = influence.influence * adaptationRate * this.learningConfig.personalityStabilityFactor;
        const newValue = this.clampPersonalityValue(currentValue + change);
        
        learningProfile.currentPersonality[influence.trait] = newValue;
        
        // Track personality drift
        this.trackPersonalityDrift(personaId, influence.trait, change, influence.reason);
      }
    });

    learningProfile.lastUpdated = Date.now();
  }

  /**
   * Initialize skill progressions for persona
   */
  initializeSkillProgressions(personaId) {
    const skillProgression = {
      skills: new Map([
        ['conversation_flow', 0.5],
        ['emotional_intelligence', 0.5],
        ['topic_knowledge', 0.5],
        ['questioning', 0.5],
        ['empathy', 0.5],
        ['humor', 0.5],
        ['detailed_communication', 0.5],
        ['active_listening', 0.5],
        ['conflict_resolution', 0.5],
        ['creativity', 0.5]
      ]),
      improvementHistory: new Map(),
      overallLevel: 0.5,
      lastUpdated: Date.now()
    };
    
    this.skillProgressions.set(personaId, skillProgression);
  }

  /**
   * Initialize interaction analytics
   */
  initializeInteractionAnalytics(personaId) {
    const analytics = {
      totalInteractions: 0,
      successfulInteractions: 0,
      averageResponseTime: 0,
      topicEngagement: new Map(),
      participantRelations: new Map(),
      emotionalPatterns: new Map(),
      learningMilestones: [],
      performanceMetrics: {
        consistency: 0.5,
        adaptability: 0.5,
        engagement_generation: 0.5,
        knowledge_application: 0.5
      },
      lastAnalyzed: Date.now()
    };
    
    this.interactionAnalytics.set(personaId, analytics);
  }

  /**
   * Calculate contextual adaptations based on current conversation
   */
  async calculateContextualAdaptations(personaId, conversationContext) {
    const analytics = this.interactionAnalytics.get(personaId);
    if (!analytics) return { adaptations: {}, reasons: [] };

    const adaptations = {};
    const reasons = [];
    
    // Adapt based on topic engagement history
    if (conversationContext.topic && analytics.topicEngagement.has(conversationContext.topic)) {
      const engagement = analytics.topicEngagement.get(conversationContext.topic);
      if (engagement.average > 0.7) {
        adaptations.openness = 0.1; // More open to familiar engaging topics
        reasons.push(`High engagement with topic: ${conversationContext.topic}`);
      }
    }
    
    // Adapt based on participant relationships
    if (conversationContext.participants) {
      conversationContext.participants.forEach(participant => {
        const relation = analytics.participantRelations.get(participant.id || participant.name);
        if (relation && relation.positive_interactions > relation.total_interactions * 0.8) {
          adaptations.agreeableness = 0.05; // More agreeable with positive relationships
          reasons.push(`Positive relationship with ${participant.name}`);
        }
      });
    }
    
    // Adapt based on conversation phase
    if (conversationContext.phase === 'cooling') {
      adaptations.extraversion = 0.1; // More extraverted to help conversation
      reasons.push('Adapting to help cooling conversation');
    }
    
    return { adaptations, reasons };
  }

  /**
   * Apply learned patterns from memory and experience
   */
  async applyLearnedPatterns(personaId, conversationContext) {
    const relevantMemories = await aiMemory.retrieveRelevantMemories(
      personaId,
      conversationContext,
      5
    );
    
    const adaptations = {};
    const reasons = [];
    
    // Analyze memories for successful patterns
    relevantMemories.forEach(memory => {
      if (memory.importance > 0.7 && memory.emotional_weight > 0.6) {
        // High importance positive memories suggest successful patterns
        if (memory.content.includes('agree') || memory.content.includes('support')) {
          adaptations.agreeableness = Math.min((adaptations.agreeableness || 0) + 0.02, 0.1);
          reasons.push('Learned: Agreement patterns lead to positive outcomes');
        }
        
        if (memory.content.includes('curious') || memory.content.includes('question')) {
          adaptations.openness = Math.min((adaptations.openness || 0) + 0.02, 0.1);
          reasons.push('Learned: Curiosity enhances conversations');
        }
      }
    });
    
    return { adaptations, reasons };
  }

  /**
   * Blend personality adaptations with stability factor
   */
  blendPersonalityAdaptations(basePersonality, contextualAdaptations, learnedAdaptations) {
    const blended = { ...basePersonality };
    
    // Apply contextual adaptations (temporary, higher weight)
    Object.entries(contextualAdaptations.adaptations || {}).forEach(([trait, change]) => {
      if (blended[trait] !== undefined) {
        blended[trait] = this.clampPersonalityValue(blended[trait] + change * 0.3);
      }
    });
    
    // Apply learned adaptations (permanent, lower weight)
    Object.entries(learnedAdaptations.adaptations || {}).forEach(([trait, change]) => {
      if (blended[trait] !== undefined) {
        blended[trait] = this.clampPersonalityValue(blended[trait] + change * 0.1);
      }
    });
    
    return blended;
  }

  /**
   * Calculate initial learning speed based on personality
   */
  calculateInitialLearningSpeed(persona) {
    const openness = persona.openness / 5.0;
    const conscientiousness = persona.conscientiousness / 5.0;
    const agreeableness = persona.agreeableness / 5.0;
    
    // Higher openness and conscientiousness = faster learning
    // Higher agreeableness = better social learning
    return (openness * 0.4 + conscientiousness * 0.4 + agreeableness * 0.2) * 0.8 + 0.2;
  }

  /**
   * Update learning speed based on performance
   */
  updateLearningSpeed(personaId, learningOpportunities) {
    const learningProfile = this.learningProfiles.get(personaId);
    if (!learningProfile) return;

    const successfulLearning = learningOpportunities.skillImprovements.length > 0;
    const adaptationSuccess = learningOpportunities.personalityInfluences.length > 0;
    
    if (successfulLearning && adaptationSuccess) {
      learningProfile.learningSpeed = Math.min(learningProfile.learningSpeed * 1.02, 1.0);
    } else if (!successfulLearning && !adaptationSuccess) {
      learningProfile.learningSpeed = Math.max(learningProfile.learningSpeed * 0.98, 0.1);
    }
  }

  /**
   * Evaluate and update specializations and weaknesses
   */
  async evaluateSpecializationsAndWeaknesses(personaId) {
    const skillProgression = this.skillProgressions.get(personaId);
    const learningProfile = this.learningProfiles.get(personaId);
    if (!skillProgression || !learningProfile) return;

    // Identify specializations (skills above 0.8)
    skillProgression.skills.forEach((level, skill) => {
      if (level > 0.8) {
        learningProfile.specializations.add(skill);
      }
    });

    // Identify weaknesses (skills below 0.3)
    skillProgression.skills.forEach((level, skill) => {
      if (level < 0.3) {
        learningProfile.weaknesses.add(skill);
      } else {
        learningProfile.weaknesses.delete(skill); // Remove if improved
      }
    });
  }

  /**
   * Track personality drift over time
   */
  trackPersonalityDrift(personaId, trait, change, reason) {
    if (!this.personalityDrift.has(personaId)) {
      this.personalityDrift.set(personaId, new Map());
    }
    
    const driftMap = this.personalityDrift.get(personaId);
    if (!driftMap.has(trait)) {
      driftMap.set(trait, []);
    }
    
    driftMap.get(trait).push({
      timestamp: Date.now(),
      change: change,
      reason: reason
    });
    
    // Keep only recent drift history (last 100 changes per trait)
    if (driftMap.get(trait).length > 100) {
      driftMap.set(trait, driftMap.get(trait).slice(-100));
    }
  }

  /**
   * Calculate overall personality drift from baseline
   */
  calculatePersonalityDrift(personaId) {
    const learningProfile = this.learningProfiles.get(personaId);
    if (!learningProfile) return 0;

    let totalDrift = 0;
    const traits = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
    
    traits.forEach(trait => {
      const baseLine = learningProfile.basePersonality[trait];
      const current = learningProfile.currentPersonality[trait];
      totalDrift += Math.abs(current - baseLine);
    });
    
    return totalDrift / traits.length;
  }

  /**
   * Helper methods
   */
  extractEmotionalContent(content) {
    const emotions = [];
    const emotionPattern = /(happy|sad|angry|excited|frustrated|curious|confused|proud|worried|grateful|amazed|disappointed)/gi;
    let match;
    
    while ((match = emotionPattern.exec(content)) !== null) {
      emotions.push(match[1].toLowerCase());
    }
    
    return emotions;
  }

  extractTopics(content) {
    return content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 3);
  }

  mapEmotionToPersonalityTrait(emotion) {
    const mapping = {
      'happy': 'extraversion',
      'excited': 'extraversion',
      'sad': 'neuroticism',
      'angry': 'neuroticism',
      'frustrated': 'neuroticism',
      'curious': 'openness',
      'confused': 'openness',
      'proud': 'conscientiousness',
      'worried': 'neuroticism',
      'grateful': 'agreeableness',
      'amazed': 'openness',
      'disappointed': 'neuroticism'
    };
    
    return mapping[emotion] || 'openness';
  }

  assessResponseQuality(interaction) {
    const content = interaction.message?.content || '';
    const context = interaction.context || {};
    
    let score = 0.5;
    let success = true;
    
    // Quality indicators
    if (content.length > 20) score += 0.1; // Substantial response
    if (content.includes('?')) score += 0.1; // Engaging question
    if (context.engagement > 0.6) score += 0.2; // High engagement
    if (content.match(/[.!?]/g)?.length > 1) score += 0.1; // Multiple sentences
    
    return { success, score: Math.min(score, 1.0) };
  }

  clampPersonalityValue(value) {
    return Math.max(1, Math.min(5, value));
  }

  calculateAdaptationConfidence(personaId) {
    const analytics = this.interactionAnalytics.get(personaId);
    if (!analytics) return 0.5;
    
    const successRate = analytics.successfulInteractions / Math.max(analytics.totalInteractions, 1);
    const experienceBonus = Math.min(analytics.totalInteractions / 100, 0.3);
    
    return Math.min(successRate + experienceBonus, 1.0);
  }

  /**
   * Get learning statistics for persona
   */
  getLearningStatistics(personaId) {
    const learningProfile = this.learningProfiles.get(personaId);
    const skillProgression = this.skillProgressions.get(personaId);
    const analytics = this.interactionAnalytics.get(personaId);
    
    if (!learningProfile) return null;
    
    return {
      learning_profile: {
        learning_speed: learningProfile.learningSpeed,
        personality_drift: this.calculatePersonalityDrift(personaId),
        specializations: Array.from(learningProfile.specializations),
        weaknesses: Array.from(learningProfile.weaknesses)
      },
      skill_progression: skillProgression ? {
        overall_level: skillProgression.overallLevel,
        top_skills: Array.from(skillProgression.skills.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([skill, level]) => ({ skill, level }))
      } : null,
      interaction_analytics: analytics ? {
        total_interactions: analytics.totalInteractions,
        success_rate: analytics.successfulInteractions / Math.max(analytics.totalInteractions, 1),
        performance_metrics: analytics.performanceMetrics
      } : null
    };
  }

  /**
   * Cleanup learning system
   */
  cleanup() {
    console.log('🧹 Cleaning up persona learning system...');
    this.learningProfiles.clear();
    this.adaptationRules.clear();
    this.skillProgressions.clear();
    this.personalityDrift.clear();
    this.interactionAnalytics.clear();
  }
}

module.exports = new PersonaLearningSystem();