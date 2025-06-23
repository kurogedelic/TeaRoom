/**
 * Enhanced Error Handler for TeaRoom 2.0
 * Provides user-friendly error messages and system status monitoring
 */

class ErrorHandler {
  constructor() {
    this.connectionStatus = 'unknown';
    this.systemHealth = null;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
    this.healthCheckInterval = null;
    
    this.init();
  }

  init() {
    // Start monitoring system health
    this.startHealthMonitoring();
    
    // Handle global errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event.filename, event.lineno);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event.reason);
      event.preventDefault();
    });

    // Monitor connection status
    window.addEventListener('online', () => this.updateConnectionStatus('online'));
    window.addEventListener('offline', () => this.updateConnectionStatus('offline'));
    
    // Initial connection status
    this.updateConnectionStatus(navigator.onLine ? 'online' : 'offline');
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    this.checkSystemHealth(); // Initial check
    
    this.healthCheckInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 60000); // Check every minute
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check system health via API
   */
  async checkSystemHealth() {
    try {
      const response = await fetch('/api/health');
      const result = await response.json();
      
      this.systemHealth = result.data;
      this.updateSystemStatusUI();
      
      if (!result.success) {
        this.handleSystemDegradation(result.data);
      }
    } catch (error) {
      console.warn('Health check failed:', error);
      this.systemHealth = {
        status: 'unknown',
        message: 'Cannot reach server'
      };
      this.updateSystemStatusUI();
    }
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status) {
    this.connectionStatus = status;
    this.updateConnectionStatusUI();
    
    if (status === 'offline') {
      this.showToast('warning', window.t ? window.t('error.connection_lost') : 'Connection lost. Some features may not work.');
    } else if (status === 'online' && this.retryAttempts > 0) {
      this.showToast('success', window.t ? window.t('error.connection_restored') : 'Connection restored.');
      this.retryAttempts = 0;
    }
  }

  /**
   * Handle global JavaScript errors
   */
  handleGlobalError(error, filename, lineno) {
    console.error('Global error:', error, filename, lineno);
    
    // Don't show toast for every minor error
    if (this.isCriticalError(error)) {
      this.showToast('error', window.t ? window.t('error.unexpected') : 'An unexpected error occurred. Please refresh the page.');
    }
  }

  /**
   * Handle promise rejections
   */
  handlePromiseRejection(reason) {
    console.error('Unhandled promise rejection:', reason);
    
    if (this.isNetworkError(reason)) {
      this.handleNetworkError(reason);
    } else {
      this.showToast('error', window.t ? window.t('error.operation_failed') : 'Operation failed. Please try again.');
    }
  }

  /**
   * Handle API errors with retry logic
   */
  async handleApiError(error, options = {}) {
    const { 
      operation = 'request',
      showToast = true,
      allowRetry = true,
      customMessage = null
    } = options;

    console.error(`API error in ${operation}:`, error);

    // Classify error type
    const errorType = this.classifyError(error);
    let message = customMessage || this.getErrorMessage(errorType, operation);
    
    // Handle different error types
    switch (errorType) {
      case 'NETWORK':
        if (allowRetry && this.retryAttempts < this.maxRetryAttempts) {
          this.retryAttempts++;
          message = `${message} Retrying... (${this.retryAttempts}/${this.maxRetryAttempts})`;
          if (showToast) this.showToast('warning', message);
          return { shouldRetry: true, delay: this.retryAttempts * 1000 };
        }
        break;
        
      case 'AUTH':
        message = window.t ? window.t('error.auth_required') : 'Authentication required. Please refresh the page.';
        break;
        
      case 'RATE_LIMIT':
        message = window.t ? window.t('error.rate_limit') : 'Too many requests. Please wait a moment.';
        break;
        
      case 'SERVER':
        if (this.systemHealth?.status === 'degraded') {
          message = window.t ? window.t('error.system_degraded') : 'System is experiencing issues. Some features may be slow.';
        }
        break;
    }
    
    if (showToast) {
      this.showToast('error', message);
    }
    
    return { shouldRetry: false, message };
  }

  /**
   * Handle system degradation
   */
  handleSystemDegradation(healthData) {
    const degradedServices = Object.entries(healthData.services || {})
      .filter(([, service]) => service.status !== 'healthy')
      .map(([name]) => name);
    
    if (degradedServices.length > 0) {
      const message = window.t 
        ? window.t('error.services_degraded', { services: degradedServices.join(', ') })
        : `Some services are experiencing issues: ${degradedServices.join(', ')}`;
      
      this.showToast('warning', message);
    }
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error) {
    if (this.connectionStatus === 'offline') {
      return; // Don't spam if already offline
    }
    
    this.showToast('error', window.t ? window.t('error.network') : 'Network error. Please check your connection.');
  }

  /**
   * Classify error types
   */
  classifyError(error) {
    if (!error) return 'UNKNOWN';
    
    const message = error.message || error.toString();
    const status = error.status || error.response?.status;
    
    if (!navigator.onLine || message.includes('NetworkError') || message.includes('fetch')) {
      return 'NETWORK';
    }
    
    if (status === 401 || status === 403 || message.includes('auth')) {
      return 'AUTH';
    }
    
    if (status === 429 || message.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    
    if (status >= 500 || message.includes('Internal Server Error')) {
      return 'SERVER';
    }
    
    if (status >= 400 && status < 500) {
      return 'CLIENT';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorType, operation) {
    const messages = {
      NETWORK: window.t ? window.t('error.network') : 'Network connection problem',
      AUTH: window.t ? window.t('error.auth') : 'Authentication error',
      RATE_LIMIT: window.t ? window.t('error.rate_limit') : 'Too many requests',
      SERVER: window.t ? window.t('error.server') : 'Server error',
      CLIENT: window.t ? window.t('error.invalid_request') : 'Invalid request',
      UNKNOWN: window.t ? window.t('error.unknown') : 'An unexpected error occurred'
    };
    
    return messages[errorType] || messages.UNKNOWN;
  }

  /**
   * Check if error is critical
   */
  isCriticalError(error) {
    if (!error) return false;
    
    const message = error.message || error.toString();
    const criticalKeywords = ['TypeError', 'ReferenceError', 'Cannot read property'];
    
    return criticalKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    if (!error) return false;
    
    const message = error.message || error.toString();
    const networkKeywords = ['fetch', 'NetworkError', 'ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED'];
    
    return networkKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Show toast notification
   */
  showToast(type, message) {
    if (window.showToast) {
      window.showToast(type, message);
    } else {
      // Fallback to console
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Update connection status UI
   */
  updateConnectionStatusUI() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = `connection-status ${this.connectionStatus}`;
      statusElement.textContent = this.connectionStatus === 'online' ? '🟢' : '🔴';
      statusElement.title = this.connectionStatus === 'online' ? 'Connected' : 'Offline';
    }
  }

  /**
   * Update system status UI
   */
  updateSystemStatusUI() {
    const statusElement = document.getElementById('system-status');
    if (statusElement && this.systemHealth) {
      const status = this.systemHealth.status;
      const statusIcon = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
      
      statusElement.className = `system-status ${status}`;
      statusElement.textContent = statusIcon;
      statusElement.title = `System Status: ${status}`;
    }
  }

  /**
   * Create status bar element
   */
  createStatusBar() {
    const existingBar = document.getElementById('status-bar');
    if (existingBar) return;

    const statusBar = document.createElement('div');
    statusBar.id = 'status-bar';
    statusBar.className = 'status-bar';
    statusBar.innerHTML = `
      <span id="connection-status" class="connection-status unknown">⚪</span>
      <span id="system-status" class="system-status unknown">⚪</span>
    `;
    
    // Add to header or top of page
    const header = document.querySelector('.chat-header') || document.body;
    header.appendChild(statusBar);
  }
}

// Global instance
window.errorHandler = new ErrorHandler();

// Helper function for other modules
window.handleApiError = (error, options) => window.errorHandler.handleApiError(error, options);