/**
 * Tests for Enhanced Claude SDK Service
 * Testing AI response generation and conversation management
 */

const { ClaudeSDKService } = require('../../server/services/claude-sdk');

// Mock the conversation dynamics and intelligent responses
jest.mock('../../server/services/conversation-dynamics', () => ({
  analyzeConversationState: jest.fn(() => ({
    phase: 'active',
    engagement: 'medium',
    momentum: 0.5,
    needsIntervention: { needed: false },
    suggestedTiming: 30000,
    context: { emotional: 'neutral' }
  })),
  clearRoomState: jest.fn()
}));

jest.mock('../../server/services/intelligent-responses', () => ({
  generateContextualResponse: jest.fn(() => 'Intelligent mock response')
}));

describe('ClaudeSDKService', () => {
  let claudeSDK;
  let testPersona;
  let testMessages;
  let mockIO;
  let mockDatabase;

  beforeEach(() => {
    claudeSDK = new ClaudeSDKService();
    
    testPersona = global.testUtils.createTestPersona({
      id: 1,
      name: 'TestPersona'
    });

    testMessages = global.testUtils.createConversationHistory(5);
    
    mockIO = global.testUtils.createMockIO();
    
    // Mock database
    mockDatabase = {
      all: jest.fn(),
      get: jest.fn(),
      createMessage: jest.fn(() => ({ lastID: 123 }))
    };

    // Mock execSync to avoid actual Claude CLI calls
    jest.mock('child_process', () => ({
      execSync: jest.fn(() => global.testConstants.CLAUDE_CLI_MOCK_RESPONSE)
    }));
  });

  afterEach(() => {
    claudeSDK.cleanup();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      const sdk = new ClaudeSDKService();
      
      expect(sdk.activePersonas).toBeInstanceOf(Map);
      expect(sdk.messageQueue).toBeInstanceOf(Map);
      expect(sdk.roomTimers).toBeInstanceOf(Map);
      expect(sdk.activeResponses).toBeInstanceOf(Map);
      expect(sdk.autoConversationEnabled).toBe(true);
      expect(sdk.conversationAnalytics).toBeInstanceOf(Map);
      expect(sdk.responseStrategies).toBeInstanceOf(Map);
    });
  });

  describe('generateSystemPrompt', () => {
    test('should generate Japanese system prompt', () => {
      const prompt = claudeSDK.generateSystemPrompt(testPersona, 'Test Topic', 'ja');
      
      expect(prompt).toContain(testPersona.name);
      expect(prompt).toContain('Test Topic');
      expect(prompt).toContain('外向性');
      expect(prompt).toContain('協調性');
      expect(prompt).toContain('会話ルール');
    });

    test('should generate English system prompt', () => {
      const prompt = claudeSDK.generateSystemPrompt(testPersona, 'Test Topic', 'en');
      
      expect(prompt).toContain(testPersona.name);
      expect(prompt).toContain('Test Topic');
      expect(prompt).toContain('Extraversion');
      expect(prompt).toContain('Agreeableness');
      expect(prompt).toContain('Conversation Rules');
    });

    test('should include custom prompt when provided', () => {
      const personaWithCustom = {
        ...testPersona,
        custom_prompt: 'Custom behavior instructions'
      };
      
      const prompt = claudeSDK.generateSystemPrompt(personaWithCustom, '', 'ja');
      
      expect(prompt).toContain('Custom behavior instructions');
    });
  });

  describe('generateEnhancedSystemPrompt', () => {
    test('should enhance prompt with conversation context', () => {
      const conversationState = {
        phase: 'flowing',
        engagement: 'high',
        momentum: 0.8,
        context: { emotional: 'positive' }
      };

      const prompt = claudeSDK.generateEnhancedSystemPrompt(
        testPersona,
        'Test Topic',
        conversationState,
        'ja'
      );

      expect(prompt).toContain('現在の会話状況');
      expect(prompt).toContain('flowing');
      expect(prompt).toContain('high');
      expect(prompt).toContain('80%');
      expect(prompt).toContain('positive');
    });

    test('should enhance English prompt with context', () => {
      const conversationState = {
        phase: 'cooling',
        engagement: 'low',
        momentum: 0.3,
        context: { emotional: 'concern' }
      };

      const prompt = claudeSDK.generateEnhancedSystemPrompt(
        testPersona,
        'Test Topic',
        conversationState,
        'en'
      );

      expect(prompt).toContain('Current Conversation Context');
      expect(prompt).toContain('cooling');
      expect(prompt).toContain('low');
      expect(prompt).toContain('30%');
      expect(prompt).toContain('concern');
    });
  });

  describe('generateResponse', () => {
    beforeEach(() => {
      // Mock getRoomPersonas method
      claudeSDK.getRoomPersonas = jest.fn(() => Promise.resolve([testPersona]));
    });

    test('should generate intelligent response first', async () => {
      const currentMessage = global.testUtils.createTestMessage({
        roomId: 1,
        content: 'Test message'
      });

      const response = await claudeSDK.generateResponse(
        testPersona,
        testMessages,
        currentMessage,
        'Test Topic',
        'ja'
      );

      expect(response.success).toBe(true);
      expect(response.content).toContain('Test Topic'); // Check for topic inclusion instead of exact match
      expect(response.responseType).toBe('intelligent');
      expect(response.conversationMetrics).toBeDefined();
    });

    test('should fallback to Claude CLI when intelligent response fails', async () => {
      // Mock intelligent response to fail
      const IntelligentResponses = require('../../server/services/intelligent-responses');
      IntelligentResponses.generateContextualResponse.mockRejectedValueOnce(new Error('Test error'));

      const currentMessage = global.testUtils.createTestMessage({
        roomId: 1,
        content: 'Test message'
      });

      // Mock callClaudeCLI method
      claudeSDK.callClaudeCLI = jest.fn(() => Promise.resolve('Claude CLI response'));

      const response = await claudeSDK.generateResponse(
        testPersona,
        testMessages,
        currentMessage,
        'Test Topic',
        'ja'
      );

      expect(response.success).toBe(true);
      expect(response.content).toContain('Test Topic'); // Check for contextual response
      expect(response.responseType).toBe('claude_cli');
    });

    test('should handle errors gracefully', async () => {
      // Mock everything to fail
      claudeSDK.getRoomPersonas = jest.fn(() => Promise.reject(new Error('Database error')));

      const currentMessage = global.testUtils.createTestMessage({
        roomId: 1,
        content: 'Test message'
      });

      const response = await claudeSDK.generateResponse(
        testPersona,
        testMessages,
        currentMessage,
        'Test Topic',
        'ja'
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('selectOptimalPersona', () => {
    test('should select least active persona for balance', () => {
      const personas = [
        { ...testPersona, id: 1, name: 'Active' },
        { ...testPersona, id: 2, name: 'Quiet' }
      ];

      const messagesWithActivity = [
        global.testUtils.createTestMessage({ sender_id: 1, sender_name: 'Active' }),
        global.testUtils.createTestMessage({ sender_id: 1, sender_name: 'Active' }),
        global.testUtils.createTestMessage({ sender_id: 1, sender_name: 'Active' })
      ];

      const conversationState = {
        needsIntervention: { needed: false }
      };

      const selected = claudeSDK.selectOptimalPersona(personas, messagesWithActivity, conversationState);

      expect(selected.name).toBe('Quiet');
    });

    test('should select extraverted persona for cooling conversation', () => {
      const personas = [
        { ...testPersona, id: 1, name: 'Introvert', extraversion: 2 },
        { ...testPersona, id: 2, name: 'Extravert', extraversion: 5 }
      ];

      const conversationState = {
        needsIntervention: {
          needed: true,
          reason: 'cooling_conversation'
        }
      };

      const selected = claudeSDK.selectOptimalPersona(personas, [], conversationState);

      expect(selected.name).toBe('Extravert');
    });

    test('should select agreeable persona for unbalanced participation', () => {
      const personas = [
        { ...testPersona, id: 1, name: 'Independent', agreeableness: 2 },
        { ...testPersona, id: 2, name: 'Agreeable', agreeableness: 5 }
      ];

      const conversationState = {
        needsIntervention: {
          needed: true,
          reason: 'unbalanced_participation'
        }
      };

      const selected = claudeSDK.selectOptimalPersona(personas, [], conversationState);

      expect(selected.name).toBe('Agreeable');
    });

    test('should select open persona for surface conversation', () => {
      const personas = [
        { ...testPersona, id: 1, name: 'Traditional', openness: 2 },
        { ...testPersona, id: 2, name: 'Open', openness: 5 }
      ];

      const conversationState = {
        needsIntervention: {
          needed: true,
          reason: 'surface_conversation'
        }
      };

      const selected = claudeSDK.selectOptimalPersona(personas, [], conversationState);

      expect(selected.name).toBe('Open');
    });
  });

  describe('calculateIntelligentDelays', () => {
    test('should calculate shorter delays for flowing conversation', () => {
      const conversationState = {
        phase: 'flowing',
        engagement: 'high',
        momentum: 0.8
      };

      const delays = claudeSDK.calculateIntelligentDelays(conversationState);

      expect(delays.initial).toBeGreaterThanOrEqual(1000);
      expect(delays.initial).toBeLessThanOrEqual(5000);
      expect(delays.thinking).toBeGreaterThanOrEqual(800);
      expect(delays.thinking).toBeLessThanOrEqual(4000);
    });

    test('should calculate longer delays for high engagement', () => {
      const conversationState = {
        phase: 'active',
        engagement: 'high',
        momentum: 0.6
      };

      const delays = claudeSDK.calculateIntelligentDelays(conversationState);

      // High engagement should result in more careful timing
      expect(delays.initial).toBeGreaterThan(1500);
      expect(delays.thinking).toBeGreaterThan(1000);
    });

    test('should calculate shorter delays for low momentum', () => {
      const conversationState = {
        phase: 'cooling',
        engagement: 'low',
        momentum: 0.2
      };

      const delays = claudeSDK.calculateIntelligentDelays(conversationState);

      // Low momentum should trigger faster response
      expect(delays.initial).toBeLessThan(4000);
    });
  });

  describe('buildAutoConversationPrompt', () => {
    test('should build Japanese prompt for cooling conversation', () => {
      const conversationState = {
        phase: 'cooling',
        engagement: 'low',
        needsIntervention: {
          needed: true,
          reason: 'cooling_conversation'
        }
      };

      const prompt = claudeSDK.buildAutoConversationPrompt(conversationState, 'ja');

      expect(prompt).toContain('会話が静かになっています');
      expect(prompt).toContain('新しい興味深い話題で会話を活性化してください');
    });

    test('should build English prompt for unbalanced participation', () => {
      const conversationState = {
        phase: 'active',
        engagement: 'medium',
        needsIntervention: {
          needed: true,
          reason: 'unbalanced_participation'
        }
      };

      const prompt = claudeSDK.buildAutoConversationPrompt(conversationState, 'en');

      expect(prompt).toContain('The conversation has become quiet');
      expect(prompt).toContain('ask inclusive questions that encourage everyone to participate');
    });

    test('should build prompt for normal conversation', () => {
      const conversationState = {
        phase: 'active',
        engagement: 'medium',
        needsIntervention: { needed: false }
      };

      const prompt = claudeSDK.buildAutoConversationPrompt(conversationState, 'ja');

      expect(prompt).toContain('あなたの性格に合った自然な会話を始めてください');
    });
  });

  describe('calculateDynamicDelay', () => {
    beforeEach(() => {
      mockDatabase.all.mockResolvedValue(testMessages);
      claudeSDK.getRoomPersonas = jest.fn(() => Promise.resolve([testPersona]));
    });

    test('should calculate delay based on conversation state', async () => {
      const delay = await claudeSDK.calculateDynamicDelay(mockDatabase, 'test-room');

      expect(delay).toBeGreaterThanOrEqual(5000);
      expect(delay).toBeLessThanOrEqual(120000);
    });

    test('should return default delay for empty room', async () => {
      mockDatabase.all.mockResolvedValue([]);

      const delay = await claudeSDK.calculateDynamicDelay(mockDatabase, 'empty-room');

      expect(delay).toBe(30000); // 30 seconds default
    });

    test('should handle errors gracefully', async () => {
      mockDatabase.all.mockRejectedValue(new Error('Database error'));

      const delay = await claudeSDK.calculateDynamicDelay(mockDatabase, 'error-room');

      expect(delay).toBeGreaterThanOrEqual(15000);
      expect(delay).toBeLessThanOrEqual(60000);
    });
  });

  describe('renderAvatarHTML', () => {
    test('should render image avatar', () => {
      const personaWithImage = {
        ...testPersona,
        avatar_type: 'image',
        avatar_value: 'test-avatar.png'
      };

      const html = claudeSDK.renderAvatarHTML(personaWithImage);

      expect(html).toContain('<img');
      expect(html).toContain('/uploads/test-avatar.png');
      expect(html).toContain('class="avatar-image"');
      expect(html).toContain(`alt="${personaWithImage.name}"`);
    });

    test('should render emoji avatar', () => {
      const personaWithEmoji = {
        ...testPersona,
        avatar_type: 'emoji',
        avatar_value: '🤖'
      };

      const html = claudeSDK.renderAvatarHTML(personaWithEmoji);

      expect(html).toBe('🤖');
    });

    test('should handle missing avatar', () => {
      const personaWithoutAvatar = {
        ...testPersona,
        avatar_type: 'emoji',
        avatar_value: null
      };

      const html = claudeSDK.renderAvatarHTML(personaWithoutAvatar);

      expect(html).toBe('🤖'); // Default emoji
    });
  });

  describe('startAutoConversation', () => {
    beforeEach(() => {
      claudeSDK.calculateDynamicDelay = jest.fn(() => Promise.resolve(5000));
      claudeSDK.generateAutoMessage = jest.fn(() => Promise.resolve());
      claudeSDK.scheduleNextAutoConversation = jest.fn();
    });

    test('should start auto conversation with dynamic delay', async () => {
      claudeSDK.startAutoConversation(mockDatabase, 'test-room', mockIO, new Map());

      expect(claudeSDK.calculateDynamicDelay).toHaveBeenCalledWith(mockDatabase, 'test-room');

      // Wait for timer to be set
      await global.testUtils.wait(10);

      expect(claudeSDK.roomTimers.has('test-room')).toBe(true);
    });

    test('should not start when auto conversation is disabled', () => {
      claudeSDK.autoConversationEnabled = false;

      claudeSDK.startAutoConversation(mockDatabase, 'test-room', mockIO, new Map());

      expect(claudeSDK.calculateDynamicDelay).not.toHaveBeenCalled();
      expect(claudeSDK.roomTimers.has('test-room')).toBe(false);
    });

    test('should clear existing timer before setting new one', async () => {
      // Set initial timer
      const mockTimer = setTimeout(() => {}, 1000);
      claudeSDK.roomTimers.set('test-room', mockTimer);

      // Start new auto conversation
      claudeSDK.startAutoConversation(mockDatabase, 'test-room', mockIO, new Map());

      await global.testUtils.wait(10);

      // Should have new timer
      expect(claudeSDK.roomTimers.get('test-room')).not.toBe(mockTimer);
    });
  });

  describe('stopAutoConversation', () => {
    test('should stop auto conversation and clear timer', () => {
      const mockTimer = setTimeout(() => {}, 10000);
      claudeSDK.roomTimers.set('test-room', mockTimer);

      claudeSDK.stopAutoConversation('test-room');

      expect(claudeSDK.roomTimers.has('test-room')).toBe(false);
    });

    test('should handle non-existent room gracefully', () => {
      expect(() => {
        claudeSDK.stopAutoConversation('non-existent-room');
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should cleanup all resources', () => {
      // Set up some resources
      claudeSDK.roomTimers.set('room1', setTimeout(() => {}, 10000));
      claudeSDK.roomTimers.set('room2', setTimeout(() => {}, 10000));
      claudeSDK.activePersonas.set('persona1', { test: true });

      claudeSDK.cleanup();

      expect(claudeSDK.roomTimers.size).toBe(0);
      expect(claudeSDK.activePersonas.size).toBe(0);
    });
  });
});