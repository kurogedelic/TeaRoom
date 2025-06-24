const request = require('supertest');
const app = require('../server/app');
const database = require('../server/database/database');

describe('TeaRoom API Tests', () => {
  
  beforeAll(async () => {
    // Initialize database for testing
    await database.initialize();
  });

  afterAll(async () => {
    // Close database connection
    await database.close();
  });
  
  describe('Health Check', () => {
    test('GET /api/health should return status ok', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });
  });

  describe('Personas API', () => {
    test('GET /api/personas should return personas list', async () => {
      const response = await request(app)
        .get('/api/personas')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Rooms API', () => {
    test('GET /api/rooms should return rooms list', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('System Info', () => {
    test('GET /api/debug/system should return system information', async () => {
      const response = await request(app)
        .get('/api/debug/system')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('server');
      expect(response.body.data).toHaveProperty('paths');
    });
  });

});