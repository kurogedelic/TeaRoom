/**
 * Jest Configuration for TeaRoom 2.0
 * Comprehensive testing setup for API, services, and components
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test directories
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    'public/js/**/*.js',
    '!server/app.js', // Exclude main app file
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  moduleDirectories: ['node_modules', 'server', 'public'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global variables
  globals: {
    'NODE_ENV': 'test'
  },
  
  // Transform files
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test patterns to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/data/',
    '/archive/'
  ],
  
  // Coverage output
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true
};