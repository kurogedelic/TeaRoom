// Modal Management System for TeaRoom 2.0

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.modals = new Map();
    this.init();
  }
  
  init() {
    // Register all modals
    this.registerModal('room-modal');
    this.registerModal('persona-modal');
    this.registerModal('manage-personas-modal');
    this.registerModal('settings-modal');
    this.registerModal('search-modal');
    
    // Global ESC key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });
  }
  
  registerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`Modal ${modalId} not found`);
      return;
    }
    
    const config = {
      element: modal,
      closeButtons: modal.querySelectorAll('.modal-close, [data-modal-close]'),
      overlay: modal
    };
    
    this.modals.set(modalId, config);
    
    // Add click handlers
    config.closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(modalId));
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modalId);
      }
    });
  }
  
  openModal(modalId, data = {}) {
    console.log(`🔓 Opening modal: ${modalId}`);
    const config = this.modals.get(modalId);
    if (!config) {
      console.error(`Modal ${modalId} not registered`);
      return;
    }
    
    // Close any active modal first
    if (this.activeModal) {
      this.closeModal(this.activeModal);
    }
    
    // Show modal
    config.element.style.display = 'flex';
    this.activeModal = modalId;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Animate in
    requestAnimationFrame(() => {
      config.element.style.opacity = '1';
    });
    
    // Focus first input
    const firstInput = config.element.querySelector('input, textarea, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
    
    // Initialize modal content if needed
    this.initializeModal(modalId, data);
    
    // Trigger modal opened event
    window.dispatchEvent(new CustomEvent('modalOpened', { 
      detail: { modalId, data } 
    }));
  }
  
  closeModal(modalId) {
    const config = this.modals.get(modalId);
    if (!config || this.activeModal !== modalId) {
      return;
    }
    
    // Animate out
    config.element.style.opacity = '0';
    
    setTimeout(() => {
      config.element.style.display = 'none';
      this.activeModal = null;
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Clean up modal content
      this.cleanupModal(modalId);
      
      // Trigger modal closed event
      window.dispatchEvent(new CustomEvent('modalClosed', { 
        detail: { modalId } 
      }));
    }, 200);
  }
  
  initializeModal(modalId, data) {
    switch (modalId) {
      case 'room-modal':
        this.initializeRoomModal(data);
        break;
      case 'persona-modal':
        this.initializePersonaModal(data);
        break;
      case 'manage-personas-modal':
        this.initializeManagePersonasModal(data);
        break;
      case 'settings-modal':
        this.initializeSettingsModal(data);
        break;
    }
  }
  
  cleanupModal(modalId) {
    switch (modalId) {
      case 'room-modal':
        this.cleanupRoomModal();
        break;
      case 'persona-modal':
        this.cleanupPersonaModal();
        break;
      case 'manage-personas-modal':
        this.cleanupManagePersonasModal();
        break;
      case 'settings-modal':
        this.cleanupSettingsModal();
        break;
    }
  }
  
  // Room Modal
  initializeRoomModal(data) {
    const form = document.getElementById('room-form');
    if (data.room) {
      // Edit mode
      document.querySelector('#room-modal .modal-title').textContent = 'Edit Room';
      document.getElementById('room-name').value = data.room.name || '';
      document.getElementById('room-topic').value = data.room.topic || '';
      document.getElementById('room-language').value = data.room.language || 'ja';
    } else {
      // Create mode
      document.querySelector('#room-modal .modal-title').textContent = window.t ? window.t('room.create') : 'Create Room';
      form.reset();
    }
    
    // Load personas for selection
    this.loadPersonasForRoom();
  }
  
  cleanupRoomModal() {
    const form = document.getElementById('room-form');
    form.reset();
    document.getElementById('room-create-btn').disabled = true;
    document.getElementById('persona-selection').innerHTML = '';
  }
  
  async loadPersonasForRoom() {
    try {
      const response = await fetch('/api/personas');
      const result = await response.json();
      
      if (result.success) {
        const container = document.getElementById('persona-selection');
        container.innerHTML = '';
        
        result.data.forEach(persona => {
          const div = document.createElement('div');
          div.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; cursor: pointer;';
          
          // Render avatar properly (image or emoji)
          const avatarHTML = window.app ? window.app.renderAvatarHTML(persona.avatar_value || '👤') : (persona.avatar_value || '👤');
          
          div.innerHTML = `
            <input type="checkbox" id="persona-${persona.id}" value="${persona.id}" style="margin: 0;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 12px; overflow: hidden;">
              ${avatarHTML}
            </div>
            <span style="flex: 1; font-size: 14px;">${persona.name}</span>
          `;
          
          // Handle checkbox change
          const checkbox = div.querySelector('input');
          checkbox.addEventListener('change', this.updateRoomCreateButton.bind(this));
          
          // Make entire div clickable
          div.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
              checkbox.checked = !checkbox.checked;
              checkbox.dispatchEvent(new Event('change'));
            }
          });
          
          container.appendChild(div);
        });
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  }
  
  updateRoomCreateButton() {
    const checkboxes = document.querySelectorAll('#persona-selection input[type="checkbox"]:checked');
    const roomName = document.getElementById('room-name').value.trim();
    const createBtn = document.getElementById('room-create-btn');
    
    createBtn.disabled = !(checkboxes.length === 2 && roomName);
  }
  
  // Persona Modal
  initializePersonaModal(data) {
    const form = document.getElementById('persona-form');
    const isEditing = window.app && window.app.currentEditingPersona;
    
    if (isEditing) {
      // Edit mode - form will be populated by app.js
      document.querySelector('#persona-modal .modal-title').textContent = 'Edit Persona';
      document.getElementById('persona-create-btn').textContent = 'Update Persona';
    } else {
      // Create mode
      document.querySelector('#persona-modal .modal-title').textContent = window.t ? window.t('persona.create') : 'Create Persona';
      document.getElementById('persona-create-btn').textContent = window.t ? window.t('action.create') : 'Create Persona';
      form.reset();
      
      // Set random values for personality traits (more interesting personas)
      const sliders = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
      sliders.forEach(trait => {
        const randomValue = Math.floor(Math.random() * 5) + 1; // Random value 1-5
        document.getElementById(trait).value = randomValue;
        document.getElementById(`${trait}-value`).textContent = randomValue;
      });
      
      // Randomly select an emoji avatar
      const emojiSelect = document.getElementById('persona-emoji');
      if (emojiSelect) {
        const options = emojiSelect.options;
        const randomIndex = Math.floor(Math.random() * options.length);
        emojiSelect.selectedIndex = randomIndex;
      }
      
      // Hide JSON preview
      const jsonPreview = document.getElementById('json-preview');
      if (jsonPreview) {
        jsonPreview.style.display = 'none';
        jsonPreview.value = '';
      }
    }
    
    // Setup avatar type toggle
    this.setupAvatarTypeToggle();
    
    // Setup personality sliders
    this.setupPersonalitySliders();
  }
  
  cleanupPersonaModal() {
    const form = document.getElementById('persona-form');
    form.reset();
    
    // Reset editing state
    if (window.app) {
      window.app.currentEditingPersona = null;
    }
    
    // Reset modal title and button text
    document.querySelector('#persona-modal .modal-title').textContent = window.t ? window.t('persona.create') : 'Create Persona';
    document.getElementById('persona-create-btn').textContent = window.t ? window.t('action.create') : 'Create Persona';
    
    // Set random values for personality traits (more interesting personas)
    const sliders = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
    sliders.forEach(trait => {
      const randomValue = Math.floor(Math.random() * 5) + 1; // Random value 1-5
      document.getElementById(trait).value = randomValue;
      document.getElementById(`${trait}-value`).textContent = randomValue;
    });
    
    // Randomly select an emoji avatar
    const emojiSelect = document.getElementById('persona-emoji');
    if (emojiSelect) {
      const options = emojiSelect.options;
      const randomIndex = Math.floor(Math.random() * options.length);
      emojiSelect.selectedIndex = randomIndex;
    }
    
    // Reset avatar type to emoji
    const emojiRadio = document.querySelector('input[name="avatar-type"][value="emoji"]');
    if (emojiRadio) {
      emojiRadio.checked = true;
      document.getElementById('emoji-selector').style.display = 'block';
      document.getElementById('image-upload').style.display = 'none';
    }
  }
  
  setupAvatarTypeToggle() {
    const avatarTypeRadios = document.querySelectorAll('input[name="avatar-type"]');
    const emojiSelector = document.getElementById('emoji-selector');
    const imageUpload = document.getElementById('image-upload');
    
    avatarTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'emoji') {
          emojiSelector.style.display = 'block';
          imageUpload.style.display = 'none';
        } else {
          emojiSelector.style.display = 'none';
          imageUpload.style.display = 'block';
        }
      });
    });
  }
  
  setupPersonalitySliders() {
    const sliders = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
    
    sliders.forEach(trait => {
      const slider = document.getElementById(trait);
      const valueDisplay = document.getElementById(`${trait}-value`);
      
      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
      });
    });
  }
  
  // Manage Personas Modal
  initializeManagePersonasModal(data) {
    // Load personas list - this will be handled by app.js
    window.app.loadPersonasForManagement();
  }
  
  cleanupManagePersonasModal() {
    const container = document.getElementById('personas-list-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  // Settings Modal
  initializeSettingsModal(data) {
    // Load current settings
    this.loadCurrentSettings();
  }
  
  cleanupSettingsModal() {
    // Nothing specific to clean up
  }
  
  async loadCurrentSettings() {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      
      if (result.success) {
        const settings = result.data;
        
        document.getElementById('settings-language').value = settings.language || 'ja';
        document.getElementById('settings-theme').value = themeManager.getCurrentTheme();
        document.getElementById('settings-notifications').checked = settings.notifications === 'true';
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  isModalOpen() {
    return this.activeModal !== null;
  }
  
  getActiveModal() {
    return this.activeModal;
  }
}

// Global modal manager instance
window.modalManager = new ModalManager();