/**
 * AI Insights API Routes for TeaRoom 2.0
 * Provides advanced AI analytics, memory insights, and learning statistics
 */

const express = require('express');
const router = express.Router();
const aiMemory = require('../services/ai-memory');
const personaLearning = require('../services/persona-learning');
const database = require('../database/database');

/**
 * GET /api/ai-insights/memory/:personaId
 * Get memory statistics and insights for a specific persona
 */
router.get('/memory/:personaId', async (req, res) => {
  try {
    const personaId = parseInt(req.params.personaId);
    
    if (isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona ID'
      });
    }

    // Get persona info
    const persona = await database.get('SELECT * FROM personas WHERE id = ?', [personaId]);
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }

    // Get memory statistics
    const memoryStats = aiMemory.getMemoryStatistics(personaId);
    
    // Get learning statistics  
    const learningStats = personaLearning.getLearningStatistics(personaId);

    res.json({
      success: true,
      data: {
        persona: {
          id: persona.id,
          name: persona.name,
          created_at: persona.created_at
        },
        memory_insights: memoryStats,
        learning_insights: learningStats,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting memory insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve memory insights'
    });
  }
});

/**
 * GET /api/ai-insights/learning/:personaId
 * Get detailed learning progression and skill development for a persona
 */
router.get('/learning/:personaId', async (req, res) => {
  try {
    const personaId = parseInt(req.params.personaId);
    
    if (isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona ID'
      });
    }

    // Initialize learning if needed
    const persona = await database.get('SELECT * FROM personas WHERE id = ?', [personaId]);
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }

    await personaLearning.initializePersonaLearning(persona);
    const learningStats = personaLearning.getLearningStatistics(personaId);

    // Get recent interaction history
    const recentMessages = await database.all(`
      SELECT m.*, r.topic as room_topic 
      FROM messages m
      LEFT JOIN rooms r ON m.room_id = r.id
      WHERE m.sender_id = ? AND m.sender_type = 'persona'
      ORDER BY m.timestamp DESC
      LIMIT 50
    `, [personaId]);

    res.json({
      success: true,
      data: {
        persona: {
          id: persona.id,
          name: persona.name
        },
        learning_statistics: learningStats,
        recent_activity: {
          message_count: recentMessages.length,
          topics_engaged: [...new Set(recentMessages.map(m => m.room_topic).filter(Boolean))],
          last_activity: recentMessages[0]?.timestamp || null
        },
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting learning insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve learning insights'
    });
  }
});

/**
 * GET /api/ai-insights/room/:roomId
 * Get conversation analytics and AI insights for a specific room
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }

    // Get room info
    const room = await database.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Get room personas
    const roomPersonas = await database.all(`
      SELECT p.* FROM personas p
      INNER JOIN room_personas rp ON p.id = rp.persona_id
      WHERE rp.room_id = ?
    `, [roomId]);

    // Get recent messages for analysis
    const recentMessages = await database.all(`
      SELECT * FROM messages 
      WHERE room_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 100
    `, [roomId]);

    // Analyze conversation patterns
    const conversationAnalytics = analyzeConversationPatterns(recentMessages, roomPersonas);
    
    // Get memory insights for each persona in the room
    const personaInsights = {};
    for (const persona of roomPersonas) {
      const memoryStats = aiMemory.getMemoryStatistics(persona.id);
      const learningStats = personaLearning.getLearningStatistics(persona.id);
      
      personaInsights[persona.id] = {
        name: persona.name,
        memory_stats: memoryStats,
        learning_stats: learningStats
      };
    }

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          topic: room.topic,
          language: room.language,
          created_at: room.created_at
        },
        conversation_analytics: conversationAnalytics,
        persona_insights: personaInsights,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting room insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve room insights'
    });
  }
});

/**
 * GET /api/ai-insights/overview
 * Get overall AI system analytics and insights
 */
router.get('/overview', async (req, res) => {
  try {
    // Get all personas
    const personas = await database.all('SELECT * FROM personas ORDER BY created_at DESC');
    
    // Get all rooms
    const rooms = await database.all('SELECT * FROM rooms ORDER BY created_at DESC');
    
    // Get message statistics
    const messageStats = await database.get(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN sender_type = 'persona' THEN 1 END) as ai_messages,
        COUNT(CASE WHEN sender_type = 'user' THEN 1 END) as user_messages,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
      FROM messages
    `);

    // Aggregate AI system insights
    const systemInsights = {
      total_personas: personas.length,
      total_rooms: rooms.length,
      active_personas: 0,
      total_memories: 0,
      avg_learning_progress: 0,
      conversation_health: 'unknown'
    };

    let learningProgressSum = 0;
    let learningPersonaCount = 0;

    // Collect insights from each persona
    for (const persona of personas) {
      const memoryStats = aiMemory.getMemoryStatistics(persona.id);
      const learningStats = personaLearning.getLearningStatistics(persona.id);
      
      if (memoryStats && memoryStats.memory_counts.total > 0) {
        systemInsights.active_personas++;
        systemInsights.total_memories += memoryStats.memory_counts.total;
      }
      
      if (learningStats && learningStats.learning_profile) {
        learningProgressSum += learningStats.skill_progression?.overall_level || 0.5;
        learningPersonaCount++;
      }
    }

    if (learningPersonaCount > 0) {
      systemInsights.avg_learning_progress = learningProgressSum / learningPersonaCount;
    }

    // Determine conversation health
    const recentMessageThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const recentMessages = await database.get(`
      SELECT COUNT(*) as count FROM messages 
      WHERE timestamp > ?
    `, [new Date(recentMessageThreshold).toISOString()]);

    if (recentMessages.count > 50) {
      systemInsights.conversation_health = 'excellent';
    } else if (recentMessages.count > 20) {
      systemInsights.conversation_health = 'good';
    } else if (recentMessages.count > 5) {
      systemInsights.conversation_health = 'moderate';
    } else {
      systemInsights.conversation_health = 'low';
    }

    res.json({
      success: true,
      data: {
        system_insights: systemInsights,
        message_statistics: messageStats,
        personas: personas.map(p => ({
          id: p.id,
          name: p.name,
          created_at: p.created_at
        })),
        rooms: rooms.map(r => ({
          id: r.id,
          name: r.name,
          topic: r.topic,
          created_at: r.created_at
        })),
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system overview'
    });
  }
});

/**
 * POST /api/ai-insights/analyze-conversation
 * Analyze a specific conversation thread for insights
 */
router.post('/analyze-conversation', async (req, res) => {
  try {
    const { roomId, messageLimit = 50 } = req.body;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    // Get messages for analysis
    const messages = await database.all(`
      SELECT * FROM messages 
      WHERE room_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [roomId, messageLimit]);

    if (messages.length === 0) {
      return res.json({
        success: true,
        data: {
          analysis: 'No messages found for analysis',
          insights: []
        }
      });
    }

    // Get room personas
    const roomPersonas = await database.all(`
      SELECT p.* FROM personas p
      INNER JOIN room_personas rp ON p.id = rp.persona_id
      WHERE rp.room_id = ?
    `, [roomId]);

    // Perform detailed conversation analysis
    const analysis = analyzeConversationPatterns(messages.reverse(), roomPersonas);
    
    // Generate actionable insights
    const insights = generateConversationInsights(analysis, roomPersonas);

    res.json({
      success: true,
      data: {
        room_id: roomId,
        analyzed_messages: messages.length,
        analysis: analysis,
        insights: insights,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error analyzing conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze conversation'
    });
  }
});

/**
 * Helper function to analyze conversation patterns
 */
function analyzeConversationPatterns(messages, personas) {
  const analysis = {
    message_distribution: {},
    emotional_patterns: {},
    topic_evolution: [],
    engagement_metrics: {
      avg_message_length: 0,
      question_frequency: 0,
      exclamation_frequency: 0,
      conversation_flow: 'unknown'
    },
    participation_balance: {},
    time_patterns: {}
  };

  if (messages.length === 0) return analysis;

  // Analyze message distribution
  const senderCounts = {};
  let totalLength = 0;
  let questionCount = 0;
  let exclamationCount = 0;

  messages.forEach(message => {
    const sender = message.sender_name || 'unknown';
    senderCounts[sender] = (senderCounts[sender] || 0) + 1;
    
    totalLength += (message.content || '').length;
    questionCount += (message.content || '').split('?').length - 1;
    exclamationCount += (message.content || '').split('!').length - 1;
  });

  analysis.message_distribution = senderCounts;
  analysis.engagement_metrics.avg_message_length = totalLength / messages.length;
  analysis.engagement_metrics.question_frequency = questionCount / messages.length;
  analysis.engagement_metrics.exclamation_frequency = exclamationCount / messages.length;

  // Analyze participation balance
  const totalMessages = messages.length;
  const expectedPerParticipant = totalMessages / (personas.length + 1); // +1 for user

  Object.entries(senderCounts).forEach(([sender, count]) => {
    analysis.participation_balance[sender] = {
      message_count: count,
      percentage: (count / totalMessages) * 100,
      balance_score: Math.min(count / expectedPerParticipant, 2) // Cap at 2 for over-participation
    };
  });

  // Determine conversation flow
  if (analysis.engagement_metrics.question_frequency > 0.3) {
    analysis.engagement_metrics.conversation_flow = 'interactive';
  } else if (analysis.engagement_metrics.avg_message_length > 100) {
    analysis.engagement_metrics.conversation_flow = 'detailed';
  } else if (analysis.engagement_metrics.exclamation_frequency > 0.2) {
    analysis.engagement_metrics.conversation_flow = 'energetic';
  } else {
    analysis.engagement_metrics.conversation_flow = 'casual';
  }

  return analysis;
}

/**
 * Helper function to generate actionable insights
 */
function generateConversationInsights(analysis, personas) {
  const insights = [];

  // Participation insights
  const participantCount = Object.keys(analysis.participation_balance).length;
  if (participantCount < personas.length) {
    insights.push({
      type: 'participation',
      level: 'warning',
      message: `${personas.length - participantCount} personas haven't participated recently`,
      recommendation: 'Consider encouraging quieter personas to join the conversation'
    });
  }

  // Balance insights
  Object.entries(analysis.participation_balance).forEach(([sender, balance]) => {
    if (balance.balance_score > 1.5) {
      insights.push({
        type: 'balance',
        level: 'info',
        message: `${sender} is very active (${balance.percentage.toFixed(1)}% of messages)`,
        recommendation: 'Might benefit from encouraging other participants'
      });
    } else if (balance.balance_score < 0.3) {
      insights.push({
        type: 'balance',
        level: 'warning',
        message: `${sender} has low participation (${balance.percentage.toFixed(1)}% of messages)`,
        recommendation: 'Consider directly engaging this participant'
      });
    }
  });

  // Engagement insights
  if (analysis.engagement_metrics.question_frequency < 0.1) {
    insights.push({
      type: 'engagement',
      level: 'suggestion',
      message: 'Low question frequency detected',
      recommendation: 'Encouraging more questions could improve interaction'
    });
  }

  if (analysis.engagement_metrics.avg_message_length < 30) {
    insights.push({
      type: 'engagement',
      level: 'info',
      message: 'Conversation consists mainly of short messages',
      recommendation: 'Consider asking for more detailed thoughts or experiences'
    });
  }

  // Flow insights
  if (analysis.engagement_metrics.conversation_flow === 'casual') {
    insights.push({
      type: 'flow',
      level: 'suggestion',
      message: 'Conversation flow is casual',
      recommendation: 'Could benefit from introducing thought-provoking topics'
    });
  } else if (analysis.engagement_metrics.conversation_flow === 'interactive') {
    insights.push({
      type: 'flow',
      level: 'positive',
      message: 'High level of interaction detected',
      recommendation: 'Great conversation dynamics - maintain current engagement'
    });
  }

  return insights;
}

module.exports = router;