// Theme Management System for TeaRoom 2.0

class ThemeManager {
  constructor() {
    this.currentTheme = 'auto';
    this.systemPrefersDark = false;
    
    this.init();
  }
  
  init() {
    // Load saved theme
    const savedTheme = localStorage.getItem('tearoom_theme') || 'auto';
    
    // Detect system preference
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark = mediaQuery.matches;
      
      // Listen for system theme changes
      mediaQuery.addEventListener('change', (e) => {
        this.systemPrefersDark = e.matches;
        if (this.currentTheme === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
    
    // Apply theme
    this.setTheme(savedTheme);
    
    // Set up theme toggle button
    this.setupThemeToggle();
  }
  
  setTheme(theme) {
    if (!['auto', 'light', 'dark'].includes(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }
    
    this.currentTheme = theme;
    localStorage.setItem('tearoom_theme', theme);
    this.applyTheme(theme);
    this.updateThemeIcon();
    
    // Trigger theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { 
        theme: theme,
        actualTheme: this.getActualTheme()
      } 
    }));
  }
  
  applyTheme(theme) {
    const root = document.documentElement;
    
    switch (theme) {
      case 'light':
        root.setAttribute('data-theme', 'light');
        break;
      case 'dark':
        root.setAttribute('data-theme', 'dark');
        break;
      case 'auto':
      default:
        root.setAttribute('data-theme', this.systemPrefersDark ? 'dark' : 'light');
        break;
    }
  }
  
  getActualTheme() {
    if (this.currentTheme === 'auto') {
      return this.systemPrefersDark ? 'dark' : 'light';
    }
    return this.currentTheme;
  }
  
  getCurrentTheme() {
    return this.currentTheme;
  }
  
  toggleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }
  
  updateThemeIcon() {
    const themeIcon = document.getElementById('theme-icon');
    if (!themeIcon) return;
    
    const icons = {
      'auto': '🌓',
      'light': '☀️',
      'dark': '🌙'
    };
    
    themeIcon.textContent = icons[this.currentTheme] || '🌓';
    
    // Update tooltip
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const tooltips = {
        'auto': 'Auto (System)',
        'light': 'Light Theme',
        'dark': 'Dark Theme'
      };
      themeToggle.title = tooltips[this.currentTheme] || 'Toggle theme';
    }
  }
  
  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }
  
  // Get theme-appropriate colors
  getThemeColors() {
    const actualTheme = this.getActualTheme();
    
    if (actualTheme === 'dark') {
      return {
        primary: '#1a1a1a',
        secondary: '#2d2d2d',
        accent: '#4dabf7',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
        border: '#404040'
      };
    } else {
      return {
        primary: '#ffffff',
        secondary: '#f8f9fa',
        accent: '#007bff',
        text: '#212529',
        textSecondary: '#6c757d',
        border: '#dee2e6'
      };
    }
  }
}

// Global theme manager instance
window.themeManager = new ThemeManager();

// Auto-update theme when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager.updateThemeIcon();
});