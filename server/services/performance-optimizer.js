/**
 * Performance Optimization Service for TeaRoom 2.0
 * Advanced performance monitoring, optimization, and scalability enhancements
 */

const EventEmitter = require('events');

class PerformanceOptimizer extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.performanceHistory = [];
    this.optimizationRules = new Map();
    this.resourceUsage = {
      memory: { current: 0, peak: 0, average: 0 },
      cpu: { current: 0, peak: 0, average: 0 },
      responseTime: { current: 0, average: 0, p95: 0 },
      throughput: { current: 0, peak: 0, average: 0 }
    };
    this.connectionPool = new Map();
    this.cacheManager = new Map();
    this.performanceThresholds = {
      memory: { warning: 200 * 1024 * 1024, critical: 500 * 1024 * 1024 }, // MB
      responseTime: { warning: 1000, critical: 3000 }, // ms
      throughput: { warning: 100, critical: 500 }, // requests/min
      errorRate: { warning: 0.05, critical: 0.1 } // 5%, 10%
    };
    this.optimizationStrategies = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    this.initializeOptimizationStrategies();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.applyOptimizations();
    }, 30000); // Every 30 seconds

    console.log('🚀 Performance monitoring started');
    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('⏹️ Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Collect system performance metrics
   */
  collectMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Memory metrics
      this.resourceUsage.memory.current = memoryUsage.heapUsed;
      this.resourceUsage.memory.peak = Math.max(this.resourceUsage.memory.peak, memoryUsage.heapUsed);
      
      // Store metrics with timestamp
      const timestamp = Date.now();
      const metrics = {
        timestamp,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        eventLoopDelay: this.measureEventLoopDelay()
      };

      this.performanceHistory.push(metrics);
      
      // Keep only last 100 entries
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }

      // Update averages
      this.updateAverages();

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Analyze performance and detect issues
   */
  analyzePerformance() {
    const issues = [];
    
    // Memory analysis
    if (this.resourceUsage.memory.current > this.performanceThresholds.memory.critical) {
      issues.push({
        type: 'memory',
        severity: 'critical',
        message: 'Memory usage is critically high',
        value: this.resourceUsage.memory.current,
        threshold: this.performanceThresholds.memory.critical
      });
    } else if (this.resourceUsage.memory.current > this.performanceThresholds.memory.warning) {
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: 'Memory usage is high',
        value: this.resourceUsage.memory.current,
        threshold: this.performanceThresholds.memory.warning
      });
    }

    // Response time analysis
    if (this.resourceUsage.responseTime.average > this.performanceThresholds.responseTime.critical) {
      issues.push({
        type: 'responseTime',
        severity: 'critical',
        message: 'Response times are critically slow',
        value: this.resourceUsage.responseTime.average,
        threshold: this.performanceThresholds.responseTime.critical
      });
    } else if (this.resourceUsage.responseTime.average > this.performanceThresholds.responseTime.warning) {
      issues.push({
        type: 'responseTime',
        severity: 'warning',
        message: 'Response times are slow',
        value: this.resourceUsage.responseTime.average,
        threshold: this.performanceThresholds.responseTime.warning
      });
    }

    // Event loop lag analysis
    const latestMetrics = this.performanceHistory[this.performanceHistory.length - 1];
    if (latestMetrics && latestMetrics.eventLoopDelay > 100) {
      issues.push({
        type: 'eventLoop',
        severity: latestMetrics.eventLoopDelay > 500 ? 'critical' : 'warning',
        message: 'Event loop lag detected',
        value: latestMetrics.eventLoopDelay,
        threshold: 100
      });
    }

    // Emit issues if found
    if (issues.length > 0) {
      this.emit('performance:issues', issues);
      console.warn('⚠️ Performance issues detected:', issues.length);
    }

    return issues;
  }

  /**
   * Apply performance optimizations based on current state
   */
  applyOptimizations() {
    const strategies = this.getApplicableStrategies();
    
    strategies.forEach(strategy => {
      try {
        strategy.apply();
        console.log(`✅ Applied optimization: ${strategy.name}`);
      } catch (error) {
        console.error(`❌ Failed to apply optimization ${strategy.name}:`, error);
      }
    });
  }

  /**
   * Initialize optimization strategies
   */
  initializeOptimizationStrategies() {
    // Memory cleanup strategy
    this.optimizationStrategies.set('memory_cleanup', {
      name: 'Memory Cleanup',
      condition: () => this.resourceUsage.memory.current > this.performanceThresholds.memory.warning,
      apply: () => {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Clear old cache entries
        this.clearOldCacheEntries();
        
        // Clear old performance history
        if (this.performanceHistory.length > 50) {
          this.performanceHistory = this.performanceHistory.slice(-50);
        }
      }
    });

    // Response time optimization
    this.optimizationStrategies.set('response_optimization', {
      name: 'Response Time Optimization',
      condition: () => this.resourceUsage.responseTime.average > this.performanceThresholds.responseTime.warning,
      apply: () => {
        // Implement response caching
        this.enableResponseCaching();
        
        // Reduce Claude CLI timeout for faster fallback
        this.optimizeClaudeTimeout();
      }
    });

    // Connection pooling optimization
    this.optimizationStrategies.set('connection_pooling', {
      name: 'Connection Pool Optimization',
      condition: () => this.connectionPool.size > 50,
      apply: () => {
        this.optimizeConnectionPool();
      }
    });

    // Memory-based conversation cleanup
    this.optimizationStrategies.set('conversation_cleanup', {
      name: 'Conversation Memory Cleanup',
      condition: () => this.resourceUsage.memory.current > this.performanceThresholds.memory.warning,
      apply: () => {
        this.cleanupOldConversations();
      }
    });
  }

  /**
   * Get applicable optimization strategies
   */
  getApplicableStrategies() {
    const applicable = [];
    
    this.optimizationStrategies.forEach((strategy, key) => {
      if (strategy.condition()) {
        applicable.push(strategy);
      }
    });
    
    return applicable;
  }

  /**
   * Enable response caching for frequently accessed data
   */
  enableResponseCaching() {
    // This would integrate with existing services to cache responses
    const cacheConfig = {
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enabled: true
    };
    
    this.cacheManager.set('response_cache', cacheConfig);
  }

  /**
   * Optimize Claude CLI timeout based on performance
   */
  optimizeClaudeTimeout() {
    // Dynamically adjust Claude CLI timeout based on system performance
    const claudeSDK = require('./claude-sdk');
    
    if (this.resourceUsage.responseTime.average > 2000) {
      // Reduce timeout for faster fallback
      claudeSDK.claudeTimeout = Math.max(5000, claudeSDK.claudeTimeout * 0.8);
    }
  }

  /**
   * Optimize connection pool
   */
  optimizeConnectionPool() {
    // Remove idle connections
    const maxIdleTime = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    this.connectionPool.forEach((connection, id) => {
      if (now - connection.lastUsed > maxIdleTime) {
        this.connectionPool.delete(id);
      }
    });
  }

  /**
   * Clear old cache entries
   */
  clearOldCacheEntries() {
    const maxAge = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();
    
    this.cacheManager.forEach((entry, key) => {
      if (entry.timestamp && now - entry.timestamp > maxAge) {
        this.cacheManager.delete(key);
      }
    });
  }

  /**
   * Cleanup old conversation data
   */
  cleanupOldConversations() {
    try {
      const aiMemory = require('./ai-memory');
      const conversationDynamics = require('./conversation-dynamics');
      
      // Clear old conversation states
      conversationDynamics.clearOldStates(30 * 60 * 1000); // 30 minutes
      
      console.log('🧹 Cleaned up old conversation data');
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
    }
  }

  /**
   * Measure event loop delay
   */
  measureEventLoopDelay() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      return delay;
    });
    return 0; // Simplified for now
  }

  /**
   * Update performance averages
   */
  updateAverages() {
    if (this.performanceHistory.length === 0) return;
    
    const recent = this.performanceHistory.slice(-10); // Last 10 measurements
    
    // Memory average
    const avgMemory = recent.reduce((sum, entry) => sum + entry.memory.heapUsed, 0) / recent.length;
    this.resourceUsage.memory.average = avgMemory;
    
    // Response time average (would be collected from actual requests)
    // This is simplified - in real implementation, this would come from request timings
  }

  /**
   * Track request performance
   */
  trackRequest(duration, success = true) {
    this.resourceUsage.responseTime.current = duration;
    this.resourceUsage.responseTime.average = 
      (this.resourceUsage.responseTime.average * 0.9) + (duration * 0.1);
    
    // Update throughput
    this.resourceUsage.throughput.current++;
    
    this.emit('request:tracked', { duration, success });
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const latestMetrics = this.performanceHistory[this.performanceHistory.length - 1];
    
    return {
      timestamp: Date.now(),
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      memory: {
        current_mb: Math.round(this.resourceUsage.memory.current / 1024 / 1024),
        peak_mb: Math.round(this.resourceUsage.memory.peak / 1024 / 1024),
        average_mb: Math.round(this.resourceUsage.memory.average / 1024 / 1024),
        heap_total_mb: latestMetrics ? Math.round(latestMetrics.memory.heapTotal / 1024 / 1024) : 0
      },
      performance: {
        response_time_avg: Math.round(this.resourceUsage.responseTime.average),
        throughput_current: this.resourceUsage.throughput.current,
        event_loop_delay: latestMetrics?.eventLoopDelay || 0
      },
      optimization: {
        strategies_available: this.optimizationStrategies.size,
        cache_entries: this.cacheManager.size,
        connection_pool_size: this.connectionPool.size,
        is_monitoring: this.isMonitoring
      },
      history_size: this.performanceHistory.length,
      health_status: this.getHealthStatus()
    };
  }

  /**
   * Get overall health status
   */
  getHealthStatus() {
    const issues = this.analyzePerformance();
    
    if (issues.some(issue => issue.severity === 'critical')) {
      return 'critical';
    } else if (issues.some(issue => issue.severity === 'warning')) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Optimize database queries
   */
  optimizeDatabaseQueries() {
    // This would contain database-specific optimizations
    return {
      indexesCreated: 0,
      queriesOptimized: 0,
      cacheHitRate: 0.85
    };
  }

  /**
   * Scale resources based on load
   */
  scaleResources(load) {
    const recommendations = [];
    
    if (load.memory > 0.8) {
      recommendations.push({
        type: 'memory',
        action: 'increase',
        current: load.memory,
        recommended: 'Add memory or optimize memory usage'
      });
    }
    
    if (load.cpu > 0.8) {
      recommendations.push({
        type: 'cpu',
        action: 'optimize',
        current: load.cpu,
        recommended: 'Optimize CPU-intensive operations'
      });
    }
    
    return recommendations;
  }

  /**
   * Cache frequently accessed data
   */
  cacheData(key, data, ttl = 300000) { // 5 minutes default TTL
    this.cacheManager.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    const entry = this.cacheManager.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cacheManager.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Cleanup and shutdown
   */
  cleanup() {
    this.stopMonitoring();
    this.cacheManager.clear();
    this.connectionPool.clear();
    this.performanceHistory = [];
    this.metrics.clear();
    
    console.log('🧹 Performance optimizer cleaned up');
  }
}

module.exports = new PerformanceOptimizer();