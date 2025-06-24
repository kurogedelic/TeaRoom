/**
 * Tests for Intelligent Response Generator Service
 * Testing contextual response generation and strategy selection
 */

const IntelligentResponseGenerator = require('../../server/services/intelligent-responses');

describe('IntelligentResponseGenerator', () => {
  let intelligentResponses;
  let testPersona;
  let testMessages;
  let conversationState;

  beforeEach(() => {
    intelligentResponses = IntelligentResponseGenerator;
    
    testPersona = global.testUtils.createTestPersona({
      id: 1,
      name: 'TestPersona',
      extraversion: 4,
      agreeableness: 3,
      conscientiousness: 3,
      neuroticism: 2,
      openness: 4
    });

    testMessages = global.testUtils.createConversationHistory(5);
    
    conversationState = global.testConstants.CONVERSATION_STATES.FLOWING;
  });

  describe('generateContextualResponse', () => {
    test('should generate response for flowing conversation', async () => {
      const response = await intelligentResponses.generateContextualResponse(
        testPersona,
        testMessages,
        conversationState,
        'Test Topic',
        'ja'
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(10);
      expect(response.length).toBeLessThan(200); // Keep responses concise
    });

    test('should generate response for cooling conversation', async () => {
      const coolingState = global.testConstants.CONVERSATION_STATES.COOLING;
      
      const response = await intelligentResponses.generateContextualResponse(
        testPersona,
        testMessages,
        coolingState,
        'Test Topic',
        'ja'
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(10);
      // Response should be engaging for cooling conversation
    });

    test('should generate response for dormant conversation', async () => {
      const dormantState = global.testConstants.CONVERSATION_STATES.DORMANT;
      
      const response = await intelligentResponses.generateContextualResponse(
        testPersona,
        testMessages,
        dormantState,
        'Test Topic',
        'ja'
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(10);
    });

    test('should generate English responses', async () => {
      const response = await intelligentResponses.generateContextualResponse(
        testPersona,
        testMessages,
        conversationState,
        'Test Topic',
        'en'
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(10);
    });

    test('should handle empty messages gracefully', async () => {
      const response = await intelligentResponses.generateContextualResponse(
        testPersona,
        [],
        conversationState,
        'Test Topic',
        'ja'
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeResponseContext', () => {
    test('should analyze mention detection', () => {
      const messagesWithMention = [
        global.testUtils.createTestMessage({
          content: `@${testPersona.name} what do you think?`
        })
      ];

      const context = intelligentResponses.analyzeResponseContext(
        messagesWithMention,
        testPersona,
        conversationState
      );

      expect(context.wasMentioned).toBe(true);
    });

    test('should analyze message types', () => {
      const mixedMessages = [
        global.testUtils.createTestMessage({ content: 'What do you think?' }), // question
        global.testUtils.createTestMessage({ content: 'This is amazing!' }), // exclamation
        global.testUtils.createTestMessage({ content: 'I agree with that' }), // agreement
        global.testUtils.createTestMessage({ content: 'My experience is...' }) // personal share
      ];

      const context = intelligentResponses.analyzeResponseContext(
        mixedMessages,
        testPersona,
        conversationState
      );

      expect(context.messageTypes.questions).toBeGreaterThan(0);
      expect(context.messageTypes.exclamations).toBeGreaterThan(0);
      expect(context.messageTypes.agreements).toBeGreaterThan(0);
      expect(context.messageTypes.personal_shares).toBeGreaterThan(0);
    });

    test('should detect conversation patterns', () => {
      const questionMessages = [
        global.testUtils.createTestMessage({ content: 'What do you think?' }),
        global.testUtils.createTestMessage({ content: 'How should we proceed?' }),
        global.testUtils.createTestMessage({ content: 'Any other ideas?' })
      ];

      const context = intelligentResponses.analyzeResponseContext(
        questionMessages,
        testPersona,
        conversationState
      );

      expect(context.patterns.isQuestioningPhase).toBe(true);
    });

    test('should analyze emotional cues', () => {
      const emotionalMessages = [
        global.testUtils.createTestMessage({ content: 'This is so exciting! 🎉' }),
        global.testUtils.createTestMessage({ content: 'Thank you so much! 🙏' }),
        global.testUtils.createTestMessage({ content: 'I am curious about this 🤔' })
      ];

      const context = intelligentResponses.analyzeResponseContext(
        emotionalMessages,
        testPersona,
        conversationState
      );

      expect(context.emotionalCues.excitement).toBeGreaterThan(0);
      expect(context.emotionalCues.appreciation).toBeGreaterThan(0);
      expect(context.emotionalCues.curiosity).toBeGreaterThan(0);
    });
  });

  describe('selectResponseStrategy', () => {
    test('should select direct response for mentions', () => {
      const context = {
        wasMentioned: true,
        patterns: {},
        emotionalCues: {},
        messageTypes: {}
      };

      const strategy = intelligentResponses.selectResponseStrategy(context, conversationState);

      expect(strategy.type).toBe('direct_response');
      expect(strategy.priority).toBe('high');
    });

    test('should select conversation starter for cooling conversation', () => {
      const coolingState = {
        ...conversationState,
        needsIntervention: {
          needed: true,
          reason: 'cooling_conversation'
        }
      };

      const context = {
        wasMentioned: false,
        patterns: {},
        emotionalCues: {},
        messageTypes: {}
      };

      const strategy = intelligentResponses.selectResponseStrategy(context, coolingState);

      expect(strategy.type).toBe('conversation_starter');
      expect(strategy.priority).toBe('high');
    });

    test('should select answer and reflect for questioning phase', () => {
      const context = {
        wasMentioned: false,
        patterns: { isQuestioningPhase: true },
        emotionalCues: {},
        messageTypes: { questions: 2 }
      };

      const strategy = intelligentResponses.selectResponseStrategy(context, conversationState);

      expect(strategy.type).toBe('answer_and_reflect');
      expect(strategy.priority).toBe('high');
    });

    test('should select emotional response for dominant emotions', () => {
      const context = {
        wasMentioned: false,
        patterns: {},
        emotionalCues: { excitement: 3, sadness: 0, curiosity: 1 },
        messageTypes: {}
      };

      const strategy = intelligentResponses.selectResponseStrategy(context, conversationState);

      expect(strategy.type).toBe('emotional_response');
      expect(strategy.emotion).toBe('excitement');
    });
  });

  describe('getPersonaResponseStyle', () => {
    test('should determine style from personality traits', () => {
      const extravertedPersona = global.testUtils.createTestPersona({
        extraversion: 5,
        conscientiousness: 4,
        neuroticism: 1,
        openness: 5,
        agreeableness: 4
      });

      const style = intelligentResponses.getPersonaResponseStyle(extravertedPersona);

      expect(style.verbosity).toBe('verbose');
      expect(style.formality).toBe('formal');
      expect(style.emotiveness).toBe('stable');
      expect(style.creativity).toBe('creative');
      expect(style.cooperation).toBe('agreeable');
    });

    test('should handle introverted persona', () => {
      const introvertedPersona = global.testUtils.createTestPersona({
        extraversion: 1,
        conscientiousness: 2,
        neuroticism: 4,
        openness: 2,
        agreeableness: 2
      });

      const style = intelligentResponses.getPersonaResponseStyle(introvertedPersona);

      expect(style.verbosity).toBe('concise');
      expect(style.formality).toBe('casual');
      expect(style.emotiveness).toBe('emotional');
      expect(style.creativity).toBe('practical');
      expect(style.cooperation).toBe('independent');
    });
  });

  describe('applyPersonalityModifications', () => {
    test('should add enthusiasm for extraverted personas', () => {
      const extravertedPersona = global.testUtils.createTestPersona({
        extraversion: 4
      });

      let response = 'This is interesting';
      response = intelligentResponses.applyPersonalityModifications(response, extravertedPersona, 'ja');

      expect(response).toContain('！');
    });

    test('should add warmth for agreeable personas', () => {
      const agreeablePersona = global.testUtils.createTestPersona({
        agreeableness: 4
      });

      let response = 'I understand your point';
      response = intelligentResponses.applyPersonalityModifications(response, agreeablePersona, 'ja');

      // Should add some warmth markers
      expect(response.length).toBeGreaterThanOrEqual('I understand your point'.length);
    });

    test('should add creativity for open personas', () => {
      const openPersona = global.testUtils.createTestPersona({
        openness: 4
      });

      let response = 'That is a good idea';
      response = intelligentResponses.applyPersonalityModifications(response, openPersona, 'ja');

      // Should potentially add creative elements
      expect(response.length).toBeGreaterThanOrEqual('That is a good idea'.length);
    });
  });

  describe('ensureUniqueness', () => {
    test('should detect similar responses', () => {
      const personaId = 'test-persona-1';
      
      // Track a response
      intelligentResponses.trackResponse(personaId, 'This is a test response');
      
      // Try similar response
      let response = 'This is a test response that is similar';
      response = intelligentResponses.ensureUniqueness(response, personaId);

      // Should be modified to ensure uniqueness
      expect(response).not.toBe('This is a test response that is similar');
    });

    test('should allow unique responses', () => {
      const personaId = 'test-persona-2';
      
      // Track a response
      intelligentResponses.trackResponse(personaId, 'First unique response');
      
      // Try completely different response
      let response = 'Completely different response about other topics';
      const originalResponse = response;
      response = intelligentResponses.ensureUniqueness(response, personaId);

      // Should remain unchanged
      expect(response).toBe(originalResponse);
    });
  });

  describe('calculateSimilarity', () => {
    test('should detect high similarity', () => {
      const str1 = 'This is a test message about programming';
      const str2 = 'This is a test message about coding';
      
      const similarity = intelligentResponses.calculateSimilarity(str1, str2);
      
      expect(similarity).toBeGreaterThan(0.5);
    });

    test('should detect low similarity', () => {
      const str1 = 'This is about programming and coding';
      const str2 = 'Let us discuss cooking and recipes';
      
      const similarity = intelligentResponses.calculateSimilarity(str1, str2);
      
      expect(similarity).toBeLessThan(0.3);
    });

    test('should handle identical strings', () => {
      const str1 = 'Identical test string';
      const str2 = 'Identical test string';
      
      const similarity = intelligentResponses.calculateSimilarity(str1, str2);
      
      expect(similarity).toBe(1);
    });

    test('should handle completely different strings', () => {
      const str1 = 'Alpha beta gamma';
      const str2 = 'Delta epsilon zeta';
      
      const similarity = intelligentResponses.calculateSimilarity(str1, str2);
      
      expect(similarity).toBe(0);
    });
  });

  describe('generateFallbackResponse', () => {
    test('should generate Japanese fallback', () => {
      const response = intelligentResponses.generateFallbackResponse(testPersona, 'ja');
      
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    test('should generate English fallback', () => {
      const response = intelligentResponses.generateFallbackResponse(testPersona, 'en');
      
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });
});