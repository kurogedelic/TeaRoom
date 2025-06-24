// Toast Notification System for TeaRoom 2.0

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.toastCounter = 0;
    this.init();
  }
  
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      console.warn('Toast container not found');
      return;
    }
  }
  
  show(message, type = 'info', duration = 4000, actions = []) {
    if (!this.container) {
      console.log(`Toast: ${message}`);
      return null;
    }
    
    const toastId = `toast-${++this.toastCounter}`;
    const toast = this.createToast(toastId, message, type, actions);
    
    this.container.appendChild(toast);
    this.toasts.set(toastId, toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });
    
    // Auto-remove
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toastId);
      }, duration);
    }
    
    return toastId;
  }
  
  createToast(toastId, message, type, actions) {
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin-bottom: 8px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-hover);
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 400px;
      position: relative;
    `;
    
    // Type-specific styling
    const typeStyles = {
      success: { borderColor: 'var(--success)', icon: '✅' },
      error: { borderColor: 'var(--danger)', icon: '❌' },
      warning: { borderColor: 'var(--warning)', icon: '⚠️' },
      info: { borderColor: 'var(--info)', icon: 'ℹ️' }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    toast.style.borderLeftColor = style.borderColor;
    toast.style.borderLeftWidth = '4px';
    
    // Icon
    const icon = document.createElement('span');
    icon.textContent = style.icon;
    icon.style.fontSize = '16px';
    toast.appendChild(icon);
    
    // Message
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      flex: 1;
      font-size: 14px;
      color: var(--text-primary);
      line-height: 1.4;
    `;
    toast.appendChild(messageEl);
    
    // Actions
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.style.cssText = 'display: flex; gap: 8px;';
      
      actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.label;
        button.className = 'btn btn-sm';
        button.style.cssText = `
          padding: 4px 8px;
          font-size: 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary);
        `;
        
        button.addEventListener('click', () => {
          if (action.onClick) {
            action.onClick();
          }
          this.remove(toastId);
        });
        
        actionsContainer.appendChild(button);
      });
      
      toast.appendChild(actionsContainer);
    }
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.addEventListener('click', () => {
      this.remove(toastId);
    });
    
    toast.appendChild(closeBtn);
    
    return toast;
  }
  
  remove(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;
    
    // Animate out
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(toastId);
    }, 300);
  }
  
  success(message, duration = 4000, actions = []) {
    return this.show(message, 'success', duration, actions);
  }
  
  error(message, duration = 6000, actions = []) {
    return this.show(message, 'error', duration, actions);
  }
  
  warning(message, duration = 5000, actions = []) {
    return this.show(message, 'warning', duration, actions);
  }
  
  info(message, duration = 4000, actions = []) {
    return this.show(message, 'info', duration, actions);
  }
  
  clear() {
    this.toasts.forEach((_, toastId) => {
      this.remove(toastId);
    });
  }
}

// Global toast manager instance
window.toast = new ToastManager();

// Convenience global functions
window.showToast = (message, type, duration, actions) => window.toast.show(message, type, duration, actions);
window.showSuccess = (message, duration, actions) => window.toast.success(message, duration, actions);
window.showError = (message, duration, actions) => window.toast.error(message, duration, actions);
window.showWarning = (message, duration, actions) => window.toast.warning(message, duration, actions);
window.showInfo = (message, duration, actions) => window.toast.info(message, duration, actions);