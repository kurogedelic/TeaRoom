/**
 * Tests for Conversation Dynamics Service
 * Comprehensive testing of conversation analysis and intelligence
 */

const ConversationDynamics = require('../../server/services/conversation-dynamics');

describe('ConversationDynamics', () => {
  let conversationDynamics;
  let testPersonas;
  let testMessages;

  beforeEach(() => {
    conversationDynamics = ConversationDynamics;
    
    testPersonas = [
      global.testUtils.createTestPersona({ id: 1, name: 'Alice' }),
      global.testUtils.createTestPersona({ id: 2, name: 'Bob' })
    ];

    testMessages = global.testUtils.createConversationHistory(5);
  });

  afterEach(() => {
    // Clear conversation states
    conversationDynamics.conversationStates.clear();
    conversationDynamics.emotionalContext.clear();
    conversationDynamics.conversationMomentum.clear();
  });

  describe('analyzeConversationState', () => {
    test('should analyze basic conversation state correctly', () => {
      const roomId = 'test-room-1';
      const state = conversationDynamics.analyzeConversationState(testMessages, testPersonas, roomId);

      expect(state).toHaveProperty('engagement');
      expect(state).toHaveProperty('phase');
      expect(state).toHaveProperty('momentum');
      expect(state).toHaveProperty('needsIntervention');
      expect(state).toHaveProperty('suggestedTiming');
      expect(state).toHaveProperty('context');

      expect(['low', 'medium', 'high']).toContain(state.engagement);
      expect(['active', 'flowing', 'cooling', 'dormant']).toContain(state.phase);
      expect(typeof state.momentum).toBe('number');
      expect(state.momentum).toBeGreaterThanOrEqual(0);
      expect(state.momentum).toBeLessThanOrEqual(1);
    });

    test('should detect flowing conversation correctly', () => {
      // Create rapid conversation messages
      const rapidMessages = [];
      const now = Date.now();
      
      for (let i = 0; i < 5; i++) {
        rapidMessages.push(global.testUtils.createTestMessage({
          id: i + 1,
          content: `Exciting message ${i + 1}! 🎉`,
          timestamp: new Date(now - (5 - i) * 10000).toISOString() // 10s intervals
        }));
      }

      const state = conversationDynamics.analyzeConversationState(rapidMessages, testPersonas, 'test-room');
      
      expect(state.engagement).toBe('high');
      expect(state.phase).toBeOneOf(['flowing', 'active']);
      expect(state.momentum).toBeGreaterThan(0.5);
    });

    test('should detect dormant conversation correctly', () => {
      // Create old messages
      const oldMessages = [
        global.testUtils.createTestMessage({
          id: 1,
          content: 'Old message',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
        })
      ];

      const state = conversationDynamics.analyzeConversationState(oldMessages, testPersonas, 'test-room');
      
      expect(state.engagement).toBe('low');
      expect(state.phase).toBe('dormant');
      expect(state.needsIntervention.needed).toBe(true);
    });

    test('should analyze emotional tone correctly', () => {
      const emotionalMessages = [
        global.testUtils.createTestMessage({
          id: 1,
          content: 'I am so excited about this! 😄🎉',
          timestamp: new Date().toISOString()
        }),
        global.testUtils.createTestMessage({
          id: 2,
          content: 'This is amazing! Great work! 👍✨',
          timestamp: new Date().toISOString()
        })
      ];

      const state = conversationDynamics.analyzeConversationState(emotionalMessages, testPersonas, 'test-room');
      
      expect(state.context.emotional).toBeOneOf(['positive', 'excitement']);
      expect(state.engagement).toBeOneOf(['medium', 'high']);
    });
  });

  describe('calculateMessageFrequency', () => {
    test('should calculate frequency for rapid messages', () => {
      const rapidMessages = [];
      const now = Date.now();
      
      // Create messages every 10 seconds
      for (let i = 0; i < 5; i++) {
        rapidMessages.push({
          timestamp: new Date(now - (5 - i) * 10000).toISOString()
        });
      }

      const result = conversationDynamics.calculateMessageFrequency(rapidMessages);
      
      expect(result.rate).toBeGreaterThan(3); // More than 3 messages per minute
      expect(result.pattern).toBe('rapid');
    });

    test('should calculate frequency for slow messages', () => {
      const slowMessages = [];
      const now = Date.now();
      
      // Create messages every 5 minutes
      for (let i = 0; i < 3; i++) {
        slowMessages.push({
          timestamp: new Date(now - (3 - i) * 5 * 60000).toISOString()
        });
      }

      const result = conversationDynamics.calculateMessageFrequency(slowMessages);
      
      expect(result.rate).toBeLessThan(1); // Less than 1 message per minute
      expect(result.pattern).toBe('slow');
    });
  });

  describe('analyzeParticipantActivity', () => {
    test('should analyze balanced participation', () => {
      const balancedMessages = [
        global.testUtils.createTestMessage({ sender_name: 'Alice' }),
        global.testUtils.createTestMessage({ sender_name: 'Bob' }),
        global.testUtils.createTestMessage({ sender_name: 'Alice' }),
        global.testUtils.createTestMessage({ sender_name: 'Bob' })
      ];

      const result = conversationDynamics.analyzeParticipantActivity(balancedMessages, testPersonas);
      
      expect(result.balance).toBeGreaterThan(0.8); // High balance
      expect(result.activity.Alice).toBeDefined();
      expect(result.activity.Bob).toBeDefined();
      expect(result.activity.Alice.messageCount).toBe(2);
      expect(result.activity.Bob.messageCount).toBe(2);
    });

    test('should detect unbalanced participation', () => {
      const unbalancedMessages = [
        global.testUtils.createTestMessage({ sender_name: 'Alice' }),
        global.testUtils.createTestMessage({ sender_name: 'Alice' }),
        global.testUtils.createTestMessage({ sender_name: 'Alice' }),
        global.testUtils.createTestMessage({ sender_name: 'Bob' })
      ];

      const result = conversationDynamics.analyzeParticipantActivity(unbalancedMessages, testPersonas);
      
      expect(result.balance).toBeLessThan(0.7); // Low balance
      expect(result.activity.Alice.messageCount).toBe(3);
      expect(result.activity.Bob.messageCount).toBe(1);
    });
  });

  describe('analyzeEmotionalTone', () => {
    test('should detect positive emotions', () => {
      const positiveMessages = [
        { content: 'This is great! 😊 I love it!' },
        { content: 'Amazing work everyone! 🎉' },
        { content: 'Happy to be here! ✨' }
      ];

      const result = conversationDynamics.analyzeEmotionalTone(positiveMessages);
      
      expect(result.dominant).toBe('positive');
      expect(result.intensity).toBeGreaterThan(0.3);
      expect(result.emotions.positive).toBeGreaterThan(0);
    });

    test('should detect concern/curiosity', () => {
      const concernMessages = [
        { content: 'I wonder what will happen? 🤔' },
        { content: 'That makes me think... What do you think?' },
        { content: 'I am curious about this approach' }
      ];

      const result = conversationDynamics.analyzeEmotionalTone(concernMessages);
      
      expect(result.dominant).toBeOneOf(['concern', 'neutral']);
      expect(result.emotions.concern).toBeGreaterThan(0);
    });

    test('should handle neutral content', () => {
      const neutralMessages = [
        { content: 'Let me check the documentation.' },
        { content: 'The system works as expected.' },
        { content: 'We can proceed with the plan.' }
      ];

      const result = conversationDynamics.analyzeEmotionalTone(neutralMessages);
      
      expect(result.dominant).toBe('neutral');
      expect(result.intensity).toBeLessThan(0.3);
    });
  });

  describe('analyzeTopicContinuity', () => {
    test('should detect high topic continuity', () => {
      const coherentMessages = [
        { content: 'Let\'s discuss machine learning algorithms' },
        { content: 'Neural networks are fascinating for machine learning' },
        { content: 'The algorithm optimization in neural networks is key' }
      ];

      const result = conversationDynamics.analyzeTopicContinuity(coherentMessages);
      
      expect(result.coherence).toBeGreaterThan(0.6);
      expect(result.continuity).toBe('high');
      expect(result.topicShifts).toBeLessThan(2);
    });

    test('should detect topic shifts', () => {
      const shiftingMessages = [
        { content: 'Let\'s talk about cooking recipes' },
        { content: 'I love playing guitar music' },
        { content: 'Space exploration is amazing' }
      ];

      const result = conversationDynamics.analyzeTopicContinuity(shiftingMessages);
      
      expect(result.coherence).toBeLessThan(0.4);
      expect(result.continuity).toBeOneOf(['low', 'medium']);
      expect(result.topicShifts).toBeGreaterThan(0);
    });
  });

  describe('calculateOptimalTiming', () => {
    test('should suggest short timing for flowing conversation', () => {
      const metrics = {
        messageFrequency: { pattern: 'rapid', rate: 4 },
        emotionalTone: { intensity: 0.7 }
      };

      const timing = conversationDynamics.calculateOptimalTiming(metrics, 'flowing');
      
      expect(timing).toBeGreaterThanOrEqual(5000); // At least 5 seconds
      expect(timing).toBeLessThanOrEqual(30000); // At most 30 seconds
    });

    test('should suggest longer timing for dormant conversation', () => {
      const metrics = {
        messageFrequency: { pattern: 'slow', rate: 0.2 },
        emotionalTone: { intensity: 0.1 }
      };

      const timing = conversationDynamics.calculateOptimalTiming(metrics, 'dormant');
      
      expect(timing).toBeGreaterThanOrEqual(5000);
      expect(timing).toBeLessThanOrEqual(20000); // Quick intervention for dormant
    });
  });

  describe('shouldIntervene', () => {
    test('should recommend intervention for cooling conversation', () => {
      const coolingMetrics = {
        messageFrequency: { rate: 0.3 },
        participantActivity: { balance: 0.8 },
        conversationDepth: { average: 2.5 }
      };

      const result = conversationDynamics.shouldIntervene(coolingMetrics, 3); // 3 minutes since activity
      
      expect(result.needed).toBe(true);
      expect(result.reason).toBe('cooling_conversation');
      expect(result.urgency).toBe('medium');
    });

    test('should recommend intervention for unbalanced participation', () => {
      const unbalancedMetrics = {
        messageFrequency: { rate: 1.5 },
        participantActivity: { balance: 0.2 }, // Very unbalanced
        conversationDepth: { average: 2.5 }
      };

      const result = conversationDynamics.shouldIntervene(unbalancedMetrics, 1); // 1 minute since activity
      
      expect(result.needed).toBe(true);
      expect(result.reason).toBe('unbalanced_participation');
      expect(result.urgency).toBe('low');
    });

    test('should not recommend intervention for healthy conversation', () => {
      const healthyMetrics = {
        messageFrequency: { rate: 2.0 },
        participantActivity: { balance: 0.9 },
        conversationDepth: { average: 3.0 }
      };

      const result = conversationDynamics.shouldIntervene(healthyMetrics, 0.5); // 30 seconds since activity
      
      expect(result.needed).toBe(false);
      expect(result.urgency).toBe('none');
    });
  });

  describe('getConversationState', () => {
    test('should store and retrieve conversation state', () => {
      const roomId = 'test-room-123';
      const state = conversationDynamics.analyzeConversationState(testMessages, testPersonas, roomId);
      
      const retrievedState = conversationDynamics.getConversationState(roomId);
      
      expect(retrievedState).toBeDefined();
      expect(retrievedState.engagement).toBe(state.engagement);
      expect(retrievedState.phase).toBe(state.phase);
    });

    test('should return null for non-existent room', () => {
      const state = conversationDynamics.getConversationState('non-existent-room');
      expect(state).toBeNull();
    });
  });

  describe('clearRoomState', () => {
    test('should clear all state for a room', () => {
      const roomId = 'test-room-clear';
      
      // Create state
      conversationDynamics.analyzeConversationState(testMessages, testPersonas, roomId);
      conversationDynamics.updateEmotionalContext(roomId, 'positive', 0.8);
      
      // Verify state exists
      expect(conversationDynamics.getConversationState(roomId)).toBeDefined();
      
      // Clear state
      conversationDynamics.clearRoomState(roomId);
      
      // Verify state is cleared
      expect(conversationDynamics.getConversationState(roomId)).toBeNull();
    });
  });
});