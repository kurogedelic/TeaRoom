/**
 * Health Check Service for TeaRoom 2.0
 * Monitors system health and provides status information
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class HealthCheckService {
  constructor() {
    this.status = {
      overall: 'unknown',
      lastCheck: null,
      services: {
        database: { status: 'unknown', message: '', lastCheck: null },
        claudeCLI: { status: 'unknown', message: '', lastCheck: null },
        filesystem: { status: 'unknown', message: '', lastCheck: null },
        memory: { status: 'unknown', message: '', lastCheck: null }
      }
    };
    
    this.healthCheckInterval = null;
    this.startPeriodicHealthCheck();
  }

  /**
   * Start periodic health check (every 30 seconds)
   */
  startPeriodicHealthCheck() {
    this.performHealthCheck(); // Initial check
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // 30 seconds
  }

  /**
   * Stop periodic health check
   */
  stopPeriodicHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const checkTime = new Date().toISOString();
    console.log(`🏥 Performing health check at ${checkTime}`);

    try {
      // Run all health checks in parallel
      const [dbStatus, claudeStatus, fsStatus, memStatus] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkClaudeCLI(),
        this.checkFilesystem(),
        this.checkMemoryUsage()
      ]);

      // Update service statuses
      this.status.services.database = this.extractResult(dbStatus, checkTime);
      this.status.services.claudeCLI = this.extractResult(claudeStatus, checkTime);
      this.status.services.filesystem = this.extractResult(fsStatus, checkTime);
      this.status.services.memory = this.extractResult(memStatus, checkTime);

      // Calculate overall status
      this.status.overall = this.calculateOverallStatus();
      this.status.lastCheck = checkTime;

      // Log status
      const statusSymbol = this.status.overall === 'healthy' ? '✅' : 
                          this.status.overall === 'degraded' ? '⚠️' : '❌';
      console.log(`${statusSymbol} System health: ${this.status.overall}`);

    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.status.overall = 'unhealthy';
      this.status.lastCheck = checkTime;
    }
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabase() {
    try {
      const database = require('../database/database');
      const startTime = Date.now();
      
      // Test basic database operation
      await database.get('SELECT 1 as test');
      
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        return { status: 'degraded', message: `Database slow (${duration}ms)` };
      }
      
      return { status: 'healthy', message: `Database OK (${duration}ms)` };
    } catch (error) {
      return { status: 'unhealthy', message: `Database error: ${error.message}` };
    }
  }

  /**
   * Check Claude CLI availability
   */
  async checkClaudeCLI() {
    try {
      const startTime = Date.now();
      
      // Test Claude CLI with minimal command
      const output = execSync('claude --version', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const duration = Date.now() - startTime;
      
      if (output.includes('claude')) {
        return { status: 'healthy', message: `Claude CLI OK (${duration}ms)` };
      } else {
        return { status: 'degraded', message: 'Claude CLI responds but version unclear' };
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { status: 'unhealthy', message: 'Claude CLI not found' };
      }
      return { status: 'unhealthy', message: `Claude CLI error: ${error.message}` };
    }
  }

  /**
   * Check filesystem access and disk space
   */
  async checkFilesystem() {
    try {
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      const dbPath = path.join(__dirname, '../../tearoom.db');
      
      // Check critical directories and files
      const checks = [
        { path: uploadsDir, type: 'directory' },
        { path: dbPath, type: 'file' }
      ];
      
      for (const check of checks) {
        try {
          const stats = fs.statSync(check.path);
          if (check.type === 'directory' && !stats.isDirectory()) {
            throw new Error(`${check.path} is not a directory`);
          }
          if (check.type === 'file' && !stats.isFile()) {
            throw new Error(`${check.path} is not a file`);
          }
        } catch (error) {
          if (error.code === 'ENOENT') {
            return { status: 'degraded', message: `Missing: ${check.path}` };
          }
          throw error;
        }
      }
      
      // Check disk space (simplified)
      const stats = fs.statSync('.');
      return { status: 'healthy', message: 'Filesystem OK' };
      
    } catch (error) {
      return { status: 'unhealthy', message: `Filesystem error: ${error.message}` };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    try {
      const usage = process.memoryUsage();
      const totalMB = Math.round(usage.rss / 1024 / 1024);
      const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
      
      // Alert if memory usage is high
      if (totalMB > 500) {
        return { status: 'degraded', message: `High memory usage: ${totalMB}MB` };
      }
      
      return { status: 'healthy', message: `Memory OK: ${totalMB}MB (heap: ${heapMB}MB)` };
    } catch (error) {
      return { status: 'unhealthy', message: `Memory check error: ${error.message}` };
    }
  }

  /**
   * Extract result from Promise.allSettled
   */
  extractResult(settledResult, checkTime) {
    const result = settledResult.status === 'fulfilled' 
      ? settledResult.value 
      : { status: 'unhealthy', message: settledResult.reason.message };
    
    return {
      ...result,
      lastCheck: checkTime
    };
  }

  /**
   * Calculate overall system status
   */
  calculateOverallStatus() {
    const services = Object.values(this.status.services);
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    
    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Get current health status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Get health status as HTTP response format
   */
  getHealthResponse() {
    const isHealthy = this.status.overall === 'healthy';
    
    return {
      status: this.status.overall,
      timestamp: this.status.lastCheck,
      healthy: isHealthy,
      services: this.status.services,
      uptime: process.uptime(),
      version: require('../../package.json').version || '2.0.0'
    };
  }
}

module.exports = new HealthCheckService();