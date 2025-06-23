/**
 * Jest Test Setup for TeaRoom 2.0
 * Global test configuration and utilities
 */

const path = require('path');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TEAROOM_DATA_PATH = path.join(__dirname, '../test-data');
process.env.DATABASE_PATH = path.join(__dirname, '../test-data/test.db');

// Create test data directory
const testDataDir = process.env.TEAROOM_DATA_PATH;
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
  fs.mkdirSync(path.join(testDataDir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(testDataDir, 'logs'), { recursive: true });
}

// Global test utilities
global.testUtils = {
  // Create test persona
  createTestPersona: (overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    name: 'TestPersona',
    avatar_type: 'emoji',
    avatar_value: '🤖',
    gender: 'neutral',
    api_provider: 'claude-code',
    extraversion: 3,
    agreeableness: 3,
    conscientiousness: 3,
    neuroticism: 3,
    openness: 3,
    custom_prompt: 'Test persona for automated testing',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  // Create test room
  createTestRoom: (overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    name: 'Test Room',
    topic: 'Testing conversation dynamics',
    language: 'ja',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  // Create test message
  createTestMessage: (overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    room_id: 1,
    sender_type: 'user',
    sender_name: 'TestUser',
    sender_id: null,
    content: 'Test message content',
    reply_to_id: null,
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  // Wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean test database
  cleanDatabase: async (database) => {
    if (database && database.exec) {
      await database.exec(`
        DELETE FROM messages;
        DELETE FROM room_personas;
        DELETE FROM rooms;
        DELETE FROM personas;
        DELETE FROM settings;
      `);
    }
  },

  // Mock socket.io
  createMockSocket: () => ({
    id: 'test-socket-' + Math.random(),
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    }),
    broadcast: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    }
  }),

  // Mock io instance
  createMockIO: () => ({
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    }),
    emit: jest.fn(),
    sockets: {
      sockets: new Map()
    }
  }),

  // Create conversation test data
  createConversationHistory: (count = 5) => {
    const messages = [];
    const personas = ['Alice', 'Bob', 'Charlie'];
    
    for (let i = 0; i < count; i++) {
      messages.push({
        id: i + 1,
        room_id: 1,
        sender_type: i % 3 === 0 ? 'user' : 'persona',
        sender_name: personas[i % personas.length],
        sender_id: i % 3 === 0 ? null : (i % 2) + 1,
        content: `Test message ${i + 1} with some content`,
        timestamp: new Date(Date.now() - (count - i) * 60000).toISOString()
      });
    }
    
    return messages.reverse(); // Most recent first
  }
};

// Global test constants
global.testConstants = {
  TEST_PORT: 9999,
  TEST_TIMEOUT: 5000,
  CLAUDE_CLI_MOCK_RESPONSE: 'This is a mock response from Claude CLI for testing.',
  
  // Test conversation states
  CONVERSATION_STATES: {
    FLOWING: {
      phase: 'flowing',
      engagement: 'high',
      momentum: 0.8,
      needsIntervention: { needed: false }
    },
    COOLING: {
      phase: 'cooling',
      engagement: 'medium',
      momentum: 0.4,
      needsIntervention: { needed: true, reason: 'cooling_conversation' }
    },
    DORMANT: {
      phase: 'dormant',
      engagement: 'low',
      momentum: 0.1,
      needsIntervention: { needed: true, reason: 'surface_conversation' }
    }
  }
};

// Console configuration for tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.VERBOSE_TESTS ? originalConsole.log : jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error,
  debug: process.env.VERBOSE_TESTS ? originalConsole.debug : jest.fn()
};

// Cleanup after each test
afterEach(async () => {
  // Clear any timers
  jest.clearAllTimers();
  
  // Reset modules
  jest.resetModules();
  
  // Clear mocks
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Stop health check service to prevent Jest from hanging
  try {
    const healthCheckService = require('../server/services/health-check');
    if (healthCheckService && typeof healthCheckService.stopPeriodicHealthCheck === 'function') {
      healthCheckService.stopPeriodicHealthCheck();
    }
  } catch (error) {
    // Health check service might not be loaded in all tests
  }
  
  // Clean up test data directory
  try {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Failed to clean up test data directory:', error.message);
  }
  
  // Restore console
  global.console = originalConsole;
});