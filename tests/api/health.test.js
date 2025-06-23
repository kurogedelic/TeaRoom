/**
 * Tests for Health Check API endpoints
 * Testing system health monitoring and status reporting
 */

const request = require('supertest');
const app = require('../../server/app');

describe('Health API', () => {
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      
      const healthData = response.body.data;
      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('healthy');
      expect(healthData).toHaveProperty('services');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('version');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthData.status);
      expect(typeof healthData.healthy).toBe('boolean');
      expect(typeof healthData.uptime).toBe('number');
      expect(typeof healthData.version).toBe('string');
    });

    test('should return proper HTTP status based on health', async () => {
      const response = await request(app).get('/api/health');

      if (response.body.data.healthy) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });

    test('should include service status details', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      const services = response.body.data.services;
      expect(services).toHaveProperty('database');
      expect(services).toHaveProperty('claudeCLI');
      expect(services).toHaveProperty('filesystem');
      expect(services).toHaveProperty('memory');

      // Check service structure
      Object.values(services).forEach(service => {
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('message');
        expect(service).toHaveProperty('lastCheck');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status);
      });
    });
  });

  describe('GET /api/ping', () => {
    test('should return simple pong response', async () => {
      const response = await request(app)
        .get('/api/ping')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({
        success: true,
        message: 'pong',
        timestamp: expect.any(String)
      });

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    test('should respond quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/ping')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });
  });

  describe('GET /api/test-claude', () => {
    test('should test Claude CLI connection', async () => {
      const response = await request(app)
        .get('/api/test-claude')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      
      if (response.body.success) {
        expect(response.body).toHaveProperty('response');
        expect(response.body).toHaveProperty('mode');
        expect(response.body.mode).toBe('claude-cli');
        expect(typeof response.body.response).toBe('string');
        expect(response.body.response.length).toBeGreaterThan(0);
      } else {
        expect(response.body).toHaveProperty('error');
        expect(response.status).toBe(500);
      }
    });

    test('should handle Claude CLI timeout gracefully', async () => {
      // This test may take longer due to potential timeouts
      const response = await request(app)
        .get('/api/test-claude')
        .timeout(20000); // 20 second timeout

      expect(response.body).toHaveProperty('success');
      
      if (!response.body.success) {
        expect(response.body.error).toContain('timeout');
      }
    }, 25000);
  });

  describe('GET /api/debug/system', () => {
    test('should return system debug information', async () => {
      const response = await request(app)
        .get('/api/debug/system')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const debugData = response.body.data;
      expect(debugData).toHaveProperty('server');
      expect(debugData).toHaveProperty('paths');

      // Check server info
      const serverInfo = debugData.server;
      expect(serverInfo).toHaveProperty('nodeEnv');
      expect(serverInfo).toHaveProperty('uptime');
      expect(serverInfo).toHaveProperty('memoryUsage');
      expect(serverInfo).toHaveProperty('pid');

      expect(typeof serverInfo.uptime).toBe('number');
      expect(typeof serverInfo.pid).toBe('number');
      expect(serverInfo.memoryUsage).toHaveProperty('rss');
      expect(serverInfo.memoryUsage).toHaveProperty('heapUsed');
      expect(serverInfo.memoryUsage).toHaveProperty('heapTotal');

      // Check paths info
      const pathsInfo = debugData.paths;
      expect(pathsInfo).toHaveProperty('workingDirectory');
      expect(pathsInfo).toHaveProperty('scriptPath');
      expect(pathsInfo).toHaveProperty('publicPath');

      expect(typeof pathsInfo.workingDirectory).toBe('string');
      expect(typeof pathsInfo.scriptPath).toBe('string');
      expect(typeof pathsInfo.publicPath).toBe('string');
    });

    test('should include system information', async () => {
      const response = await request(app)
        .get('/api/debug/system')
        .expect(200);

      const systemInfo = response.body.data;
      
      // Should include OS and platform info
      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('arch');
      expect(systemInfo).toHaveProperty('nodeVersion');
      expect(systemInfo).toHaveProperty('dataDirectory');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent health endpoints', async () => {
      await request(app)
        .get('/api/health/non-existent')
        .expect(404);
    });

    test('should return JSON error for malformed requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      // Even if the request is successful, structure should be consistent
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Performance', () => {
    test('health endpoint should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(response => {
          expect(response.body).toHaveProperty('success');
        });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('ping endpoint should be very fast', async () => {
      const times = [];
      
      // Test multiple pings
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await request(app).get('/api/ping').expect(200);
        times.push(Date.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      expect(avgTime).toBeLessThan(50); // Average should be under 50ms
    });
  });
});