// TeaRoom 2.0 - Main Application

class TeaRoomApp {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.lastSelectedRoomId = null;
    this.rooms = [];
    this.personas = [];
    this.messages = [];
    this.typingUsers = new Map(); // userName -> { avatar, timestamp }
    this.currentEditingPersona = null;
    this.autoChatEnabled = false;
    this.autoChatInterval = null;
    this.personaAvatarMap = new Map(); // Cache for persona avatars
    this.avatarCache = new Map(); // File-based avatar cache
    
    this.init();
  }
  
  async init() {
    console.log('🍵 TeaRoom 2.0 initializing...');
    
    // Wait for i18n to be ready
    await this.waitForI18n();
    
    // Initialize Socket.IO
    this.initSocket();
    
    // Sync persona files first (for existing personas)
    await this.syncPersonaFiles();
    
    // Load initial data
    await this.loadPersonas();
    await this.loadRooms();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup auto-resize for message input
    this.setupMessageInput();
    
    // Setup mention autocomplete
    this.setupMentionAutocomplete();
    
    // Setup typing indicator cleanup
    this.setupTypingCleanup();
    
    console.log('✅ TeaRoom 2.0 ready!');
    
    console.log('📋 App initialized. Create Room button should be working now.');
  }
  
  async waitForI18n() {
    // Wait for i18n to be available
    while (!window.i18n || !window.t) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  initSocket() {
    this.socket = io();
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.updateConnectionStatus(false);
      // Clear room state on disconnect
      this.currentRoom = null;
      document.getElementById('empty-state').style.display = 'block';
      document.getElementById('input-container').style.display = 'none';
    });

    this.socket.on('connect', () => {
      console.log('🔗 Connected to server');
      this.updateConnectionStatus(true);
      // Re-join room if we were in one before disconnection
      if (this.lastSelectedRoomId) {
        console.log(`🔄 Reconnecting to room ${this.lastSelectedRoomId}`);
        this.socket.emit('room:join', { roomId: this.lastSelectedRoomId, userName: 'User' });
      }
    });
    
    this.socket.on('room:joined', (data) => {
      console.log('🚪 Joined room:', data.room.name);
      this.currentRoom = data.room;
      this.currentRoom.personas = data.personas || [];
      
      // Build persona avatar map for efficient lookup
      this.personaAvatarMap.clear();
      this.currentRoom.personas.forEach(persona => {
        this.personaAvatarMap.set(persona.name, {
          avatar_value: persona.avatar_value,
          avatar_type: persona.avatar_type
        });
      });
      
      this.updateChatHeader();
      this.loadMessages();
      
      // Preload avatars for better performance
      this.preloadRoomAvatars();
      
      console.log('✅ Room joined successfully, personas loaded:', this.currentRoom.personas.length);
    });
    
    this.socket.on('message:new', (message) => {
      this.addMessage(message);
    });
    
    this.socket.on('user:typing', (data) => {
      this.handleTypingIndicator(data);
    });
    
    this.socket.on('typing:clear', (data) => {
      this.clearAllTypingIndicators();
    });
    
    this.socket.on('user:joined', (data) => {
      const msg = window.t ? window.t('notification.user_joined', { user: data.userName }) : `${data.userName} joined`;
      showInfo(msg);
    });
    
    this.socket.on('user:left', (data) => {
      const msg = window.t ? window.t('notification.user_left', { user: data.userName }) : `${data.userName} left`;
      showInfo(msg);
    });
    
    this.socket.on('error', (data) => {
      const msg = data.message || (window.t ? window.t('error.server_error') : 'Server error');
      showError(msg);
    });
  }
  
  setupEventListeners() {
    // Room creation
    document.getElementById('create-room-btn').addEventListener('click', (e) => {
      console.log('🏠 Create Room button clicked!');
      e.preventDefault();
      window.modalManager.openModal('room-modal');
    });
    
    document.getElementById('empty-create-room-btn').addEventListener('click', () => {
      modalManager.openModal('room-modal');
    });
    
    document.getElementById('room-create-btn').addEventListener('click', () => {
      this.createRoom();
    });
    
    document.getElementById('room-cancel-btn').addEventListener('click', () => {
      modalManager.closeModal('room-modal');
    });
    
    // Persona creation
    document.getElementById('create-persona-btn').addEventListener('click', () => {
      this.currentEditingPersona = null; // Reset editing state
      modalManager.openModal('persona-modal');
    });
    
    document.getElementById('persona-create-btn').addEventListener('click', () => {
      this.savePersona();
    });
    
    document.getElementById('persona-cancel-btn').addEventListener('click', () => {
      const wasEditingFromManage = this.currentEditingPersona !== null;
      modalManager.closeModal('persona-modal');
      
      // If we were editing from manage modal, reopen it
      if (wasEditingFromManage) {
        setTimeout(() => {
          modalManager.openModal('manage-personas-modal');
        }, 300);
      }
    });

    // Persona management
    document.getElementById('manage-personas-btn').addEventListener('click', () => {
      modalManager.openModal('manage-personas-modal');
    });

    document.getElementById('manage-personas-done-btn').addEventListener('click', () => {
      modalManager.closeModal('manage-personas-modal');
    });

    document.getElementById('add-new-persona-btn').addEventListener('click', () => {
      this.currentEditingPersona = null;
      modalManager.closeModal('manage-personas-modal');
      modalManager.openModal('persona-modal');
    });

    document.getElementById('empty-add-persona-btn').addEventListener('click', () => {
      this.currentEditingPersona = null;
      modalManager.closeModal('manage-personas-modal');
      modalManager.openModal('persona-modal');
    });
    
    // Listen for language changes
    window.addEventListener('languageChanged', (e) => {
      console.log('Language changed to:', e.detail.language);
      this.updateUILanguage();
    });
    
    // Auto chat toggle
    document.getElementById('auto-chat-toggle').addEventListener('click', () => {
      this.toggleAutoChat();
    });

    // Search functionality
    document.getElementById('search-button').addEventListener('click', () => {
      modalManager.openModal('search-modal');
    });
    
    // Search input handling
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.performSearch(e.target.value.trim());
      }, 300); // Debounce search by 300ms
    });

    // JSON Import/Export
    document.getElementById('import-json-btn').addEventListener('click', () => {
      document.getElementById('json-file-input').click();
    });

    document.getElementById('export-json-btn').addEventListener('click', () => {
      this.exportPersonaJSON();
    });

    document.getElementById('json-file-input').addEventListener('change', (e) => {
      this.importPersonaJSON(e.target.files[0]);
    });
    
    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
      modalManager.openModal('settings-modal');
    });
    
    document.getElementById('settings-save-btn').addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('settings-cancel-btn').addEventListener('click', () => {
      modalManager.closeModal('settings-modal');
    });
    
    // Message sending
    document.getElementById('send-button').addEventListener('click', () => {
      this.sendMessage();
    });
    
    // Form validation
    document.getElementById('room-name').addEventListener('input', () => {
      modalManager.updateRoomCreateButton();
    });
    
    // Language change
    window.addEventListener('languageChanged', (e) => {
      this.updateUILanguage();
    });
  }
  
  setupMessageInput() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    let typingTimer;
    let isTyping = false;
    
    messageInput.addEventListener('input', () => {
      // Auto-resize textarea
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
      
      // Update send button state
      const hasContent = messageInput.value.trim().length > 0;
      sendButton.disabled = !hasContent || !this.currentRoom;
      
      // Typing indicator
      if (this.currentRoom && hasContent && !isTyping) {
        isTyping = true;
        this.socket.emit('message:typing', { isTyping: true });
      }
      
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        if (isTyping) {
          isTyping = false;
          this.socket.emit('message:typing', { isTyping: false });
        }
      }, 1000);
    });
    
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
          this.sendMessage();
        }
      }
    });
  }
  
  async loadPersonas() {
    try {
      const response = await fetch('/api/personas');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.personas = result.data;
      } else {
        showError(window.t ? window.t('error.server_error') : 'Server error');
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
      showError(window.t ? window.t('error.network') : 'Network error');
    }
  }
  
  async loadRooms() {
    try {
      const response = await fetch('/api/rooms');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.rooms = result.data;
        this.renderRoomList();
      } else {
        showError(window.t ? window.t('error.server_error') : 'Server error');
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      showError(window.t ? window.t('error.network') : 'Network error');
    }
  }
  
  renderRoomList() {
    const container = document.getElementById('room-list-container');
    const roomCount = document.getElementById('room-count');
    
    container.innerHTML = '';
    roomCount.textContent = this.rooms.length;
    
    if (this.rooms.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: var(--text-secondary); font-size: 14px;';
      emptyMsg.textContent = 'No rooms yet. Create your first room!';
      container.appendChild(emptyMsg);
      return;
    }
    
    this.rooms.forEach(room => {
      const roomElement = this.createRoomElement(room);
      container.appendChild(roomElement);
    });
  }
  
  createRoomElement(room) {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item';
    roomItem.dataset.roomId = room.id;
    
    if (this.currentRoom && this.currentRoom.id === room.id) {
      roomItem.classList.add('active');
    }
    
    const personasText = room.personas ? room.personas.map(p => p.name).join(', ') : '';
    const lastMessage = room.last_message_at ? new Date(room.last_message_at).toLocaleTimeString() : '';
    
    const roomAvatar = room.personas?.[0] ? this.renderAvatarHTML(room.personas[0].avatar_value) : '💬';
    
    roomItem.innerHTML = `
      <div class="room-avatar">${roomAvatar}</div>
      <div class="room-info">
        <div class="room-name">${room.name}</div>
        <div class="room-preview">${personasText}</div>
      </div>
      <div class="room-meta">
        ${lastMessage ? `<div class="room-time">${lastMessage}</div>` : ''}
        ${room.message_count > 0 ? `<div class="room-badge">${room.message_count}</div>` : ''}
      </div>
      <button class="room-delete" title="Delete Room" data-room-id="${room.id}">🗑️</button>
    `;
    
    roomItem.addEventListener('click', (e) => {
      // Don't select room if delete button was clicked
      if (!e.target.classList.contains('room-delete')) {
        this.selectRoom(room);
      }
    });

    // Add delete button event listener
    const deleteBtn = roomItem.querySelector('.room-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteRoom(room.id, room.name);
    });
    
    return roomItem;
  }
  
  selectRoom(room) {
    // Update active room in UI
    document.querySelectorAll('.room-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const roomElement = document.querySelector(`[data-room-id="${room.id}"]`);
    if (roomElement) {
      roomElement.classList.add('active');
    }
    
    // Store selected room ID for reconnection
    this.lastSelectedRoomId = room.id;
    
    // Join room via socket
    this.socket.emit('room:join', { roomId: room.id, userName: 'User' });
    
    // Show input container and search button
    document.getElementById('input-container').style.display = 'block';
    document.getElementById('search-button').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
  }
  
  updateChatHeader() {
    if (!this.currentRoom) {
      // Hide buttons when no room selected
      document.getElementById('auto-chat-toggle').style.display = 'none';
      document.getElementById('search-button').style.display = 'none';
      return;
    }
    
    const chatTitle = document.getElementById('chat-title');
    const chatSubtitle = document.getElementById('chat-subtitle');
    const chatPersonas = document.getElementById('chat-personas');
    
    chatTitle.textContent = this.currentRoom.name;
    chatSubtitle.textContent = this.currentRoom.topic || `${this.currentRoom.language === 'ja' ? '日本語' : 'English'} conversation`;
    
    // Show action buttons
    document.getElementById('auto-chat-toggle').style.display = 'block';
    document.getElementById('search-button').style.display = 'block';
    
    // Show personas
    chatPersonas.innerHTML = '';
    if (this.currentRoom.personas) {
      this.currentRoom.personas.forEach(persona => {
        const avatar = document.createElement('div');
        avatar.className = 'persona-avatar';
        avatar.innerHTML = this.renderAvatarHTML(persona.avatar_value || '👤');
        avatar.title = persona.name;
        chatPersonas.appendChild(avatar);
      });
    }
  }
  
  async loadMessages() {
    if (!this.currentRoom) return;
    
    try {
      const response = await fetch(`/api/rooms/${this.currentRoom.id}/messages`);
      const result = await response.json();
      
      if (result.success) {
        this.messages = result.data.messages;
        
        // Update persona avatar map if personas data is provided
        if (result.data.personas) {
          this.personaAvatarMap.clear();
          result.data.personas.forEach(persona => {
            this.personaAvatarMap.set(persona.name, {
              avatar_value: persona.avatar_value,
              avatar_type: persona.avatar_type
            });
          });
        }
        
        this.renderMessages();
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      showError(window.t ? window.t('error.network') : 'Network error');
    }
  }
  
  async renderMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    for (const message of this.messages) {
      const messageElement = await this.createMessageElement(message);
      container.appendChild(messageElement);
    }
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }
  
  async createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender_type}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    
    // Determine avatar based on message type and sender
    let avatar = '🤖'; // Default for AI
    
    if (message.sender_type === 'user') {
      avatar = '👤';
    } else if (message.sender_type === 'persona') {
      // Use file-based avatar lookup (most reliable)
      avatar = await this.getPersonaAvatarFromCache(message.sender_name) || '🤖';
    }
    
    // Determine if avatar is an image file or emoji/text
    const avatarHTML = this.renderAvatarHTML(avatar);
    
    messageDiv.innerHTML = `
      <div class="message-avatar">${avatarHTML}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-sender">${message.sender_name}</span>
          <span class="message-time">${time}</span>
        </div>
        ${message.reply_to_content ? `
          <div class="message-reply">
            <strong>${message.reply_to_sender_name}:</strong> ${message.reply_to_content}
          </div>
        ` : ''}
        <div class="message-bubble">${this.formatMessageContent(message.content)}</div>
      </div>
    `;
    
    return messageDiv;
  }
  
  formatMessageContent(content) {
    // Simple mention highlighting
    return content.replace(/@(\\w+)/g, '<strong style="color: var(--accent);">@$1</strong>');
  }
  
  async addMessage(message) {
    this.messages.push(message);
    
    const container = document.getElementById('messages-container');
    const messageElement = await this.createMessageElement(message);
    container.appendChild(messageElement);
    
    // Smooth scroll to bottom
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  handleTypingIndicator(data) {
    if (data.isTyping) {
      this.typingUsers.set(data.userName, {
        avatar: data.avatar || '🤖',
        timestamp: Date.now()
      });
    } else {
      this.typingUsers.delete(data.userName);
    }
    
    this.updateTypingIndicator();
  }
  
  clearAllTypingIndicators() {
    this.typingUsers.clear();
    this.updateTypingIndicator();
  }

  updateTypingIndicator() {
    const container = document.getElementById('messages-container');
    
    // Remove all existing typing indicators
    const existingIndicators = container.querySelectorAll('.typing-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    if (this.typingUsers.size === 0) {
      return;
    }
    
    // Create individual typing indicators for each user
    for (const [userName, userInfo] of this.typingUsers.entries()) {
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      typingIndicator.dataset.userName = userName;
      
      const typingAvatar = this.renderAvatarHTML(userInfo.avatar);
      
      typingIndicator.innerHTML = `
        <div class="typing-avatar">${typingAvatar}</div>
        <div class="typing-content">
          <div class="typing-text">${userName} is typing...</div>
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      `;
      
      container.appendChild(typingIndicator);
    }
    
    // Scroll to bottom
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }

  setupTypingCleanup() {
    // Clean up old typing indicators every 5 seconds
    setInterval(() => {
      const now = Date.now();
      const timeout = 10000; // 10 seconds timeout
      
      for (const [userName, userInfo] of this.typingUsers.entries()) {
        if (now - userInfo.timestamp > timeout) {
          this.typingUsers.delete(userName);
        }
      }
      
      this.updateTypingIndicator();
    }, 5000);
  }
  
  sendMessage() {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content || !this.currentRoom) return;
    
    // Send via socket
    this.socket.emit('message:send', { content });
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('send-button').disabled = true;
    
    // Stop typing indicator
    this.socket.emit('message:typing', { isTyping: false });
    
    // Hide mention suggestions
    this.hideMentionSuggestions();
  }
  
  setupMentionAutocomplete() {
    const messageInput = document.getElementById('message-input');
    let mentionSuggestions = null;
    
    messageInput.addEventListener('input', (e) => {
      const text = e.target.value;
      const cursorPos = e.target.selectionStart;
      
      // Find @ mentions
      const beforeCursor = text.substring(0, cursorPos);
      const mentionMatch = beforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        const query = mentionMatch[1].toLowerCase();
        this.showMentionSuggestions(query, cursorPos - mentionMatch[0].length);
      } else {
        this.hideMentionSuggestions();
      }
    });
    
    messageInput.addEventListener('keydown', (e) => {
      const suggestions = document.getElementById('mention-suggestions');
      const items = suggestions?.querySelectorAll('.mention-item') || [];
      
      // Only handle keys if mention suggestions are visible and have items
      if (!suggestions || suggestions.style.display === 'none' || items.length === 0) {
        return;
      }
      
      const activeItem = suggestions.querySelector('.mention-item.active');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeItem?.nextElementSibling || items[0];
        if (activeItem) activeItem.classList.remove('active');
        next?.classList.add('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeItem?.previousElementSibling || items[items.length - 1];
        if (activeItem) activeItem.classList.remove('active');
        prev?.classList.add('active');
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation(); // Prevent message sending
        const selected = activeItem || items[0];
        if (selected) {
          this.insertMention(selected.dataset.name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hideMentionSuggestions();
      }
    });
  }
  
  showMentionSuggestions(query, startPos) {
    const availableNames = [];
    
    // Only add personas from current room (no global personas)
    if (this.currentRoom && this.currentRoom.personas) {
      this.currentRoom.personas.forEach(persona => {
        availableNames.push(persona.name);
      });
    }
    
    // Filter by query
    const filtered = availableNames.filter(name => 
      name.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
      this.hideMentionSuggestions();
      return;
    }
    
    let suggestions = document.getElementById('mention-suggestions');
    if (!suggestions) {
      suggestions = document.createElement('div');
      suggestions.id = 'mention-suggestions';
      suggestions.className = 'mention-suggestions';
      document.body.appendChild(suggestions);
    }
    
    suggestions.innerHTML = '';
    filtered.forEach((name, index) => {
      const item = document.createElement('div');
      item.className = 'mention-item' + (index === 0 ? ' active' : '');
      item.dataset.name = name;
      
      // Find persona details
      const persona = this.personas.find(p => p.name === name);
      const avatar = persona?.avatar_value || '👤';
      
      item.innerHTML = `
        <span class="mention-avatar">${avatar}</span>
        <span class="mention-name">${name}</span>
      `;
      
      item.addEventListener('click', () => {
        this.insertMention(name);
      });
      
      suggestions.appendChild(item);
    });
    
    // Position suggestions
    const messageInput = document.getElementById('message-input');
    const inputRect = messageInput.getBoundingClientRect();
    suggestions.style.display = 'block';
    suggestions.style.left = inputRect.left + 'px';
    suggestions.style.top = (inputRect.top - suggestions.offsetHeight - 5) + 'px';
  }
  
  hideMentionSuggestions() {
    const suggestions = document.getElementById('mention-suggestions');
    if (suggestions) {
      suggestions.style.display = 'none';
    }
  }
  
  insertMention(name) {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    
    // Find the @ position
    const beforeCursor = text.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const startPos = cursorPos - mentionMatch[0].length;
      const newText = text.substring(0, startPos) + `@${name} ` + text.substring(cursorPos);
      messageInput.value = newText;
      messageInput.setSelectionRange(startPos + name.length + 2, startPos + name.length + 2);
    }
    
    this.hideMentionSuggestions();
    messageInput.focus();
  }
  
  async createRoom() {
    const form = document.getElementById('room-form');
    const formData = new FormData(form);
    
    const selectedPersonas = Array.from(document.querySelectorAll('#persona-selection input:checked'))
      .map(cb => parseInt(cb.value));
    
    const roomData = {
      name: formData.get('room-name') || document.getElementById('room-name').value,
      topic: formData.get('room-topic') || document.getElementById('room-topic').value,
      language: formData.get('room-language') || document.getElementById('room-language').value,
      personas: selectedPersonas
    };
    
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess(window.t ? window.t('notification.room_created') : 'Room created successfully');
        modalManager.closeModal('room-modal');
        await this.loadRooms();
        
        // Auto-select the new room
        this.selectRoom(result.data);
      } else {
        showError(result.error || (window.t ? window.t('error.server_error') : 'Server error'));
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      showError(window.t ? window.t('error.network') : 'Network error');
    }
  }
  
  async savePersona() {
    const form = document.getElementById('persona-form');
    
    // Handle avatar upload if needed
    let avatarValue = '';
    const avatarType = document.querySelector('input[name="avatar-type"]:checked').value;
    
    if (avatarType === 'emoji') {
      avatarValue = document.getElementById('persona-emoji').value;
    } else {
      const imageFile = document.getElementById('persona-image').files[0];
      if (imageFile) {
        try {
          avatarValue = await this.uploadAvatar(imageFile);
        } catch (error) {
          showError(window.t ? window.t('error.upload_failed') : 'Upload failed');
          return;
        }
      }
    }
    
    const personaData = {
      name: document.getElementById('persona-name').value,
      avatar_type: avatarType,
      avatar_value: avatarValue,
      gender: document.getElementById('persona-gender').value,
      api_provider: document.querySelector('input[name="api-provider"]:checked').value,
      extraversion: parseInt(document.getElementById('extraversion').value),
      agreeableness: parseInt(document.getElementById('agreeableness').value),
      conscientiousness: parseInt(document.getElementById('conscientiousness').value),
      neuroticism: parseInt(document.getElementById('neuroticism').value),
      openness: parseInt(document.getElementById('openness').value),
      custom_prompt: document.getElementById('persona-prompt').value
    };
    
    // Check for duplicate names (excluding current editing persona)
    const existingPersona = this.personas.find(p => 
      p.name.toLowerCase() === personaData.name.toLowerCase() && 
      (!this.currentEditingPersona || p.id !== this.currentEditingPersona.id)
    );
    
    if (existingPersona) {
      showError('A persona with this name already exists. Please choose a different name.');
      return;
    }

    try {
      const url = this.currentEditingPersona 
        ? `/api/personas/${this.currentEditingPersona.id}`
        : '/api/personas';
      const method = this.currentEditingPersona ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personaData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        const successMsg = this.currentEditingPersona 
          ? 'Persona updated successfully'
          : 'Persona created successfully';
        showSuccess(successMsg);
        
        // Reload personas data
        await this.loadPersonas();
        
        // Check if we need to return to manage-personas-modal
        const wasEditingFromManage = this.currentEditingPersona !== null;
        
        // Close persona modal
        modalManager.closeModal('persona-modal');
        
        // If we were editing from manage modal, reopen it with updated data
        if (wasEditingFromManage) {
          setTimeout(() => {
            modalManager.openModal('manage-personas-modal');
          }, 300);
        }
      } else {
        showError(result.error || (window.t ? window.t('error.server_error') : 'Server error'));
      }
    } catch (error) {
      console.error('Failed to save persona:', error);
      showError(window.t ? window.t('error.network') : 'Network error');
    }
  }
  
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch('/api/upload-avatar', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.filename;
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  }
  
  async saveSettings() {
    const language = document.getElementById('settings-language').value;
    const theme = document.getElementById('settings-theme').value;
    const notifications = document.getElementById('settings-notifications').checked;
    
    try {
      // Save language setting
      await fetch(`/api/settings/language`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: language })
      });
      
      // Save notifications setting
      await fetch(`/api/settings/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: notifications.toString() })
      });
      
      // Apply language change
      if (language !== i18n.getCurrentLanguage()) {
        i18n.setLanguage(language);
      }
      
      // Apply theme change
      if (theme !== themeManager.getCurrentTheme()) {
        themeManager.setTheme(theme);
      }
      
      showSuccess(window.t ? window.t('notification.settings_saved') : 'Settings saved successfully');
      modalManager.closeModal('settings-modal');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError(window.t ? window.t('error.network') : 'Network error');
    }
  }
  
  updateConnectionStatus(connected) {
    // Visual connection status updates could be added here
    console.log(connected ? '✅ Connected' : '❌ Disconnected');
  }
  
  async performSearch(query) {
    if (!query || query.length < 2 || !this.currentRoom) {
      document.getElementById('search-results').innerHTML = '';
      document.getElementById('search-loading').style.display = 'none';
      document.getElementById('search-empty').style.display = 'none';
      return;
    }

    // Show loading
    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-empty').style.display = 'none';

    try {
      const response = await fetch(`/api/rooms/${this.currentRoom.id}/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      document.getElementById('search-loading').style.display = 'none';

      if (result.success && result.data.messages.length > 0) {
        this.displaySearchResults(result.data.messages, query);
      } else {
        document.getElementById('search-empty').style.display = 'block';
      }
    } catch (error) {
      console.error('Search failed:', error);
      document.getElementById('search-loading').style.display = 'none';
      document.getElementById('search-empty').style.display = 'block';
    }
  }

  displaySearchResults(messages, query) {
    const container = document.getElementById('search-results');
    const highlightQuery = query.toLowerCase();
    
    container.innerHTML = messages.map(message => {
      // Highlight search query in content
      const highlightedContent = message.content.replace(
        new RegExp(`(${query})`, 'gi'),
        '<mark style="background: yellow; padding: 0 2px;">$1</mark>'
      );
      
      const avatar = message.avatar_value || (message.sender_type === 'user' ? '👤' : '🤖');
      const time = new Date(message.timestamp).toLocaleString();
      
      return `
        <div class="search-result-item" style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer;" data-message-id="${message.id}">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 16px;">${avatar}</span>
            <strong>${message.sender_name}</strong>
            <span style="font-size: 12px; color: var(--text-muted);">${time}</span>
          </div>
          <div style="font-size: 14px; line-height: 1.4;">${highlightedContent}</div>
        </div>
      `;
    }).join('');

    // Add click handlers to jump to message
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        modalManager.closeModal('search-modal');
        // Could add scroll to message functionality here
        showInfo(window.t ? window.t('search.message_found') : 'Message found in chat');
      });
    });
  }

  updateUILanguage() {
    // Update static text elements when language changes
    if (window.t) {
      document.title = `${window.t('app.title')} - ${window.t('app.subtitle')}`;
      
      // Update placeholders and labels
      const messageInput = document.getElementById('message-input');
      if (messageInput) {
        messageInput.placeholder = window.t('message.input_placeholder');
      }
    }
    
    // Force re-render of dynamic content
    this.renderRoomList();
  }

  // === PERSONA MANAGEMENT METHODS ===

  async loadPersonasForManagement() {
    const container = document.getElementById('personas-list-container');
    const emptyState = document.getElementById('personas-empty-state');
    
    if (this.personas.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    
    container.style.display = 'block';
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    this.personas.forEach(persona => {
      const personaCard = this.createPersonaCard(persona);
      container.appendChild(personaCard);
    });
  }

  createPersonaCard(persona) {
    const card = document.createElement('div');
    card.className = 'persona-card';
    card.dataset.personaId = persona.id;
    
    const avatar = this.renderAvatarHTML(persona.avatar_value);
    
    const traitLabels = ['E', 'A', 'C', 'N', 'O'];
    const traitValues = [
      persona.extraversion,
      persona.agreeableness, 
      persona.conscientiousness,
      persona.neuroticism,
      persona.openness
    ];
    
    const traitBars = traitLabels.map((label, index) => `
      <div class="persona-trait-bar">
        <div class="persona-trait-label">${label}</div>
        <div class="persona-trait-value">
          <div class="persona-trait-fill" style="width: ${(traitValues[index] / 5) * 100}%"></div>
        </div>
      </div>
    `).join('');
    
    card.innerHTML = `
      <div class="persona-card-avatar">
        ${avatar}
      </div>
      <div class="persona-card-info">
        <div class="persona-card-name">${persona.name}</div>
        <div class="persona-card-details">
          <span class="persona-api-badge">
            ${persona.api_provider === 'claude-code' ? '🤖 Claude' : '🧠 OpenAI'}
          </span>
          ${persona.gender ? `<span>${persona.gender}</span>` : ''}
        </div>
        <div class="persona-card-prompt">
          ${persona.custom_prompt || 'No custom prompt'}
        </div>
        <div class="persona-trait-bars">
          ${traitBars}
        </div>
      </div>
      <div class="persona-card-actions">
        <button class="action-icon-btn edit" title="Edit persona" onclick="app.editPersona(${persona.id})">
          ✏️
        </button>
        <button class="action-icon-btn export" title="Export JSON" onclick="app.exportPersonaJSON(${persona.id})">
          💾
        </button>
        <button class="action-icon-btn delete" title="Delete persona" onclick="app.deletePersona(${persona.id})">
          🗑️
        </button>
      </div>
    `;
    
    return card;
  }

  editPersona(personaId) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) return;
    
    this.currentEditingPersona = persona;
    
    // Close manage modal and open edit modal
    modalManager.closeModal('manage-personas-modal');
    modalManager.openModal('persona-modal', { persona });
    
    // Populate form with persona data
    setTimeout(() => {
      document.getElementById('persona-name').value = persona.name;
      
      // Avatar type
      document.querySelector(`input[name="avatar-type"][value="${persona.avatar_type}"]`).checked = true;
      if (persona.avatar_type === 'emoji') {
        document.getElementById('persona-emoji').value = persona.avatar_value;
        document.getElementById('emoji-selector').style.display = 'block';
        document.getElementById('image-upload').style.display = 'none';
      } else {
        document.getElementById('emoji-selector').style.display = 'none';
        document.getElementById('image-upload').style.display = 'block';
      }
      
      document.getElementById('persona-gender').value = persona.gender || '';
      document.querySelector(`input[name="api-provider"][value="${persona.api_provider}"]`).checked = true;
      
      // Big Five traits
      const traits = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
      traits.forEach(trait => {
        const slider = document.getElementById(trait);
        const valueDisplay = document.getElementById(`${trait}-value`);
        slider.value = persona[trait];
        valueDisplay.textContent = persona[trait];
      });
      
      document.getElementById('persona-prompt').value = persona.custom_prompt || '';
      
      // Update modal title and button
      document.querySelector('#persona-modal .modal-title').textContent = 'Edit Persona';
      document.getElementById('persona-create-btn').textContent = 'Update Persona';
    }, 100);
  }

  async deletePersona(personaId) {
    const persona = this.personas.find(p => p.id === personaId);
    if (!persona) return;
    
    const confirmed = await this.showConfirmDialog(
      'Delete Persona',
      `Are you sure you want to delete "${persona.name}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Persona deleted successfully');
        await this.loadPersonas();
        this.loadPersonasForManagement();
      } else {
        showError(result.error || 'Failed to delete persona');
      }
    } catch (error) {
      console.error('Failed to delete persona:', error);
      showError('Network error occurred');
    }
  }

  async deleteRoom(roomId, roomName) {
    const confirmed = await this.showConfirmDialog(
      'Delete Room',
      `Are you sure you want to delete "${roomName}"? All messages in this room will be permanently deleted.`,
      'Delete',
      'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Room deleted successfully');
        
        // If current room was deleted, clear the chat
        if (this.currentRoom && this.currentRoom.id === roomId) {
          this.currentRoom = null;
          this.updateChatHeader();
          this.clearMessages();
          document.getElementById('empty-state').style.display = 'block';
          document.getElementById('input-container').style.display = 'none';
        }
        
        await this.loadRooms();
      } else {
        showError(result.error || 'Failed to delete room');
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      showError('Network error occurred');
    }
  }

  exportPersonaJSON(personaId = null) {
    let persona;
    
    if (personaId) {
      // Export specific persona
      persona = this.personas.find(p => p.id === personaId);
      if (!persona) return;
    } else {
      // Export current form data
      persona = this.getPersonaFormData();
    }
    
    // Clean up the data for export
    const exportData = {
      name: persona.name,
      avatar_type: persona.avatar_type,
      avatar_value: persona.avatar_value,
      gender: persona.gender,
      api_provider: persona.api_provider,
      personality_traits: {
        extraversion: persona.extraversion,
        agreeableness: persona.agreeableness,
        conscientiousness: persona.conscientiousness,
        neuroticism: persona.neuroticism,
        openness: persona.openness
      },
      custom_prompt: persona.custom_prompt,
      export_date: new Date().toISOString(),
      export_source: 'TeaRoom 2.0'
    };
    
    // Show JSON preview
    const jsonPreview = document.getElementById('json-preview');
    jsonPreview.style.display = 'block';
    jsonPreview.value = JSON.stringify(exportData, null, 2);
    
    // Download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${persona.name.replace(/[^a-zA-Z0-9]/g, '_')}_persona.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Persona exported successfully');
  }

  async importPersonaJSON(file) {
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate required fields
      if (!data.name || !data.personality_traits) {
        throw new Error('Invalid persona JSON format');
      }
      
      // Populate form with imported data
      document.getElementById('persona-name').value = data.name;
      
      if (data.avatar_type) {
        document.querySelector(`input[name="avatar-type"][value="${data.avatar_type}"]`).checked = true;
        if (data.avatar_type === 'emoji' && data.avatar_value) {
          document.getElementById('persona-emoji').value = data.avatar_value;
        }
      }
      
      if (data.gender) {
        document.getElementById('persona-gender').value = data.gender;
      }
      
      if (data.api_provider) {
        document.querySelector(`input[name="api-provider"][value="${data.api_provider}"]`).checked = true;
      }
      
      // Import personality traits
      const traits = ['extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
      traits.forEach(trait => {
        if (data.personality_traits[trait]) {
          const slider = document.getElementById(trait);
          const valueDisplay = document.getElementById(`${trait}-value`);
          slider.value = data.personality_traits[trait];
          valueDisplay.textContent = data.personality_traits[trait];
        }
      });
      
      if (data.custom_prompt) {
        document.getElementById('persona-prompt').value = data.custom_prompt;
      }
      
      // Show JSON preview
      const jsonPreview = document.getElementById('json-preview');
      jsonPreview.style.display = 'block';
      jsonPreview.value = JSON.stringify(data, null, 2);
      
      showSuccess('Persona data imported successfully');
      
    } catch (error) {
      console.error('Failed to import persona:', error);
      showError('Failed to import persona: ' + error.message);
    }
  }

  getPersonaFormData() {
    return {
      name: document.getElementById('persona-name').value,
      avatar_type: document.querySelector('input[name="avatar-type"]:checked').value,
      avatar_value: document.getElementById('persona-emoji').value,
      gender: document.getElementById('persona-gender').value,
      api_provider: document.querySelector('input[name="api-provider"]:checked').value,
      extraversion: parseInt(document.getElementById('extraversion').value),
      agreeableness: parseInt(document.getElementById('agreeableness').value),
      conscientiousness: parseInt(document.getElementById('conscientiousness').value),
      neuroticism: parseInt(document.getElementById('neuroticism').value),
      openness: parseInt(document.getElementById('openness').value),
      custom_prompt: document.getElementById('persona-prompt').value
    };
  }

  async showConfirmDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001;';
      
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <h4>${title}</h4>
          <p>${message}</p>
          <div class="confirm-dialog-actions">
            <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
            <button class="btn btn-danger" id="confirm-ok">${confirmText}</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const cleanup = () => {
        document.body.removeChild(overlay);
      };
      
      overlay.querySelector('#confirm-ok').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
    });
  }

  // Auto Chat Functionality
  toggleAutoChat() {
    if (this.autoChatEnabled) {
      this.stopAutoChat();
    } else {
      this.startAutoChat();
    }
  }

  startAutoChat() {
    if (!this.currentRoom || !this.currentRoom.personas || this.currentRoom.personas.length < 2) {
      showError('Need at least 2 personas in the room for auto chat');
      return;
    }

    this.autoChatEnabled = true;
    this.updateAutoChatButton();
    
    // Start auto chat with initial delay
    this.scheduleAutoChat(3000); // 3 seconds initial delay
    
    console.log('🤖 Auto chat started');
    showInfo(window.t ? window.t('auto_chat.active') : 'Auto chat active...');
  }

  stopAutoChat() {
    this.autoChatEnabled = false;
    if (this.autoChatInterval) {
      clearTimeout(this.autoChatInterval);
      this.autoChatInterval = null;
    }
    this.updateAutoChatButton();
    
    console.log('⏸️ Auto chat stopped');
  }

  scheduleAutoChat(delay = null) {
    if (!this.autoChatEnabled || !this.currentRoom) return;

    // Clear existing timeout
    if (this.autoChatInterval) {
      clearTimeout(this.autoChatInterval);
    }

    // Random delay between 5-15 seconds if not specified
    const randomDelay = delay || (5000 + Math.random() * 10000);
    
    this.autoChatInterval = setTimeout(() => {
      if (this.autoChatEnabled && this.currentRoom) {
        this.triggerAutoChat();
      }
    }, randomDelay);
  }

  async triggerAutoChat() {
    if (!this.autoChatEnabled || !this.currentRoom || !this.currentRoom.personas) return;

    try {
      // Check if any AI is currently typing
      const isAnyAITyping = Array.from(this.typingUsers.keys()).some(userName => 
        userName !== 'User' && this.currentRoom.personas.some(p => p.name === userName)
      );

      if (isAnyAITyping) {
        // If AI is typing, wait a bit longer
        this.scheduleAutoChat(3000);
        return;
      }

      // Trigger AI response from a random persona
      const availablePersonas = this.currentRoom.personas.filter(p => p.name !== 'User');
      if (availablePersonas.length === 0) return;

      const randomPersona = availablePersonas[Math.floor(Math.random() * availablePersonas.length)];
      
      // Send auto trigger message to server
      const response = await fetch(`/api/rooms/${this.currentRoom.id}/auto-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: randomPersona.id,
          trigger_type: 'auto'
        })
      });

      if (response.ok) {
        console.log(`🤖 Auto chat triggered for ${randomPersona.name}`);
      }

    } catch (error) {
      console.error('Auto chat error:', error);
    }

    // Schedule next auto chat
    this.scheduleAutoChat();
  }

  updateAutoChatButton() {
    const button = document.getElementById('auto-chat-toggle');
    const icon = document.getElementById('auto-chat-icon');
    
    if (this.autoChatEnabled) {
      icon.textContent = '⏸️';
      button.title = window.t ? window.t('auto_chat.stop') : 'Stop auto chat';
      button.classList.add('active');
    } else {
      icon.textContent = '▶️';
      button.title = window.t ? window.t('auto_chat.start') : 'Start auto chat';
      button.classList.remove('active');
    }
  }

  // File-based avatar management
  async getPersonaAvatarFromCache(personaName) {
    // Check memory cache first
    if (this.avatarCache.has(personaName)) {
      return this.avatarCache.get(personaName);
    }

    // Fetch from file-based API
    try {
      const response = await fetch(`/api/personas/avatar/${encodeURIComponent(personaName)}`);
      const result = await response.json();
      
      if (result.success) {
        // Cache the result
        this.avatarCache.set(personaName, result.data.avatar);
        return result.data.avatar;
      }
    } catch (error) {
      console.error(`Failed to get avatar for ${personaName}:`, error);
    }

    // Fallback to database/room data
    if (this.personaAvatarMap.has(personaName)) {
      const personaData = this.personaAvatarMap.get(personaName);
      const avatar = personaData.avatar_value || '🤖';
      this.avatarCache.set(personaName, avatar);
      return avatar;
    }

    return '🤖';
  }

  // Preload avatars for current room personas
  async preloadRoomAvatars() {
    if (!this.currentRoom || !this.currentRoom.personas) return;

    const promises = this.currentRoom.personas.map(persona => 
      this.getPersonaAvatarFromCache(persona.name)
    );

    await Promise.all(promises);
    console.log('🎭 Preloaded avatars for room personas');
  }

  // Sync persona files on startup
  async syncPersonaFiles() {
    try {
      const response = await fetch('/api/personas/sync-files', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        console.log(`📁 Synced ${result.count} persona files`);
      }
    } catch (error) {
      console.error('Failed to sync persona files:', error);
    }
  }

  // Render avatar as image or emoji
  renderAvatarHTML(avatar) {
    // Check if avatar is a file (ends with image extension)
    if (avatar && (avatar.endsWith('.png') || avatar.endsWith('.jpg') || avatar.endsWith('.jpeg') || avatar.endsWith('.gif') || avatar.endsWith('.webp'))) {
      return `<img src="/uploads/${avatar}" alt="Avatar" class="avatar-image" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><span style="display:none;">👤</span>`;
    } else {
      // Emoji or text avatar
      return avatar || '👤';
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TeaRoomApp();
});