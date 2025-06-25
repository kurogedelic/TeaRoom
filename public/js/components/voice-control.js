// TeaRoom 2.0 - Voice Control Component
class VoiceControl {
  constructor(app) {
    this.app = app;
    this.isListening = false;
    this.isSpeaking = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.currentLanguage = 'ja-JP';
    
    this.init();
  }
  
  async init() {
    console.log('🎤 Initializing voice control...');
    
    // Setup Web Speech API if available
    this.setupSpeechRecognition();
    this.setupSpeechSynthesis();
    
    // Setup UI elements
    this.setupVoiceUI();
    
    // Setup WebSocket events
    this.setupWebSocketEvents();
    
    // Request microphone permissions
    await this.requestPermissions();
    
    console.log('✅ Voice control initialized');
  }
  
  setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      
      this.recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.isListening = true;
        this.updateVoiceUI();
      };
      
      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          this.handleSpeechResult(finalTranscript);
        }
        
        // Update UI with interim results
        this.updateSpeechIndicator(interimTranscript || finalTranscript);
      };
      
      this.recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        this.showVoiceError(`Speech recognition error: ${event.error}`);
        this.stopListening();
      };
      
      this.recognition.onend = () => {
        console.log('🔇 Speech recognition ended');
        this.isListening = false;
        this.updateVoiceUI();
        this.hideSpeechIndicator();
      };
      
      console.log('✅ Speech recognition setup complete');
    } else {
      console.warn('⚠️ Speech recognition not supported');
    }
  }
  
  setupSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis.onvoiceschanged = () => {
        this.updateAvailableVoices();
      };
      
      console.log('✅ Speech synthesis setup complete');
    } else {
      console.warn('⚠️ Speech synthesis not supported');
    }
  }
  
  setupVoiceUI() {
    // Create voice control button
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voice-control-btn';
    voiceButton.className = 'btn btn-ghost btn-sm';
    voiceButton.innerHTML = '<span id="voice-icon">🎤</span>';
    voiceButton.title = 'Voice Control (Click to start/stop listening)';
    voiceButton.style.display = 'none'; // Hidden by default
    
    // Add to chat actions
    const chatActions = document.querySelector('.chat-actions');
    if (chatActions) {
      chatActions.insertBefore(voiceButton, chatActions.firstChild);
    }
    
    // Voice settings button
    const voiceSettingsBtn = document.createElement('button');
    voiceSettingsBtn.id = 'voice-settings-btn';
    voiceSettingsBtn.className = 'btn btn-ghost btn-sm';
    voiceSettingsBtn.innerHTML = '<span>🎛️</span>';
    voiceSettingsBtn.title = 'Voice Settings';
    voiceSettingsBtn.style.display = 'none';
    
    if (chatActions) {
      chatActions.insertBefore(voiceSettingsBtn, voiceButton.nextSibling);
    }
    
    // Speech indicator
    const speechIndicator = document.createElement('div');
    speechIndicator.id = 'speech-indicator';
    speechIndicator.className = 'speech-indicator';
    speechIndicator.style.display = 'none';
    speechIndicator.innerHTML = `
      <div class="speech-indicator-content">
        <div class="speech-wave">
          <div class="wave-dot"></div>
          <div class="wave-dot"></div>
          <div class="wave-dot"></div>
        </div>
        <span id="speech-text">Listening...</span>
      </div>
    `;
    
    // Add to messages container
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.appendChild(speechIndicator);
    }
    
    // Event listeners
    voiceButton.addEventListener('click', () => {
      this.toggleListening();
    });
    
    voiceSettingsBtn.addEventListener('click', () => {
      this.showVoiceSettings();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + V to toggle voice
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        this.toggleListening();
      }
      
      // Escape to stop listening
      if (e.key === 'Escape' && this.isListening) {
        this.stopListening();
      }
    });
  }
  
  setupWebSocketEvents() {
    if (!this.app.socket) return;
    
    // Voice recognition events
    this.app.socket.on('voice:listening_started', (data) => {
      console.log('🎤 Server confirmed listening started');
    });
    
    this.app.socket.on('voice:listening_stopped', (data) => {
      console.log('🔇 Server confirmed listening stopped');
    });
    
    this.app.socket.on('voice:recognition_result', (data) => {
      console.log('🎤 Voice recognition result:', data.text);
      this.handleServerSpeechResult(data);
    });
    
    this.app.socket.on('voice:commands_recognized', (data) => {
      console.log('🎤 Voice commands recognized:', data.commands);
      this.handleVoiceCommands(data);
    });
    
    // Voice synthesis events
    this.app.socket.on('voice:speaking_started', (data) => {
      console.log('🗣️ AI started speaking');
      this.isSpeaking = true;
      this.updateVoiceUI();
    });
    
    this.app.socket.on('voice:speaking_stopped', (data) => {
      console.log('🔇 AI stopped speaking');
      this.isSpeaking = false;
      this.updateVoiceUI();
    });
    
    // Voice action events
    this.app.socket.on('voice:execute_action', (data) => {
      this.executeVoiceAction(data);
    });
    
    // Error events
    this.app.socket.on('voice:error', (data) => {
      console.error('❌ Voice error:', data);
      this.showVoiceError(data.message);
    });
    
    // Room voice events
    this.app.socket.on('voice:user_listening', (data) => {
      this.showUserListening(data.userId);
    });
    
    this.app.socket.on('voice:ai_speaking', (data) => {
      this.showAISpeaking(data);
    });
  }
  
  async requestPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Microphone permission granted');
      this.showVoiceControls();
    } catch (error) {
      console.warn('⚠️ Microphone permission denied:', error);
      this.showPermissionError();
    }
  }
  
  showVoiceControls() {
    const voiceBtn = document.getElementById('voice-control-btn');
    const settingsBtn = document.getElementById('voice-settings-btn');
    
    if (voiceBtn) voiceBtn.style.display = 'inline-flex';
    if (settingsBtn) settingsBtn.style.display = 'inline-flex';
  }
  
  async toggleListening() {
    if (this.isListening) {
      await this.stopListening();
    } else {
      await this.startListening();
    }
  }
  
  async startListening() {
    if (this.isListening) return;
    
    try {
      // Start local recognition
      if (this.recognition) {
        this.recognition.lang = this.currentLanguage;
        this.recognition.start();
      }
      
      // Notify server
      if (this.app.socket && this.app.currentRoom) {
        this.app.socket.emit('voice:start_listening', {
          language: this.currentLanguage,
          roomId: this.app.currentRoom.id
        });
      }
      
      this.showSpeechIndicator();
      console.log('🎤 Started listening');
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.showVoiceError('Failed to start voice recognition');
    }
  }
  
  async stopListening() {
    if (!this.isListening) return;
    
    try {
      // Stop local recognition
      if (this.recognition) {
        this.recognition.stop();
      }
      
      // Notify server
      if (this.app.socket) {
        this.app.socket.emit('voice:stop_listening');
      }
      
      this.hideSpeechIndicator();
      console.log('🔇 Stopped listening');
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
    }
  }
  
  handleSpeechResult(transcript) {
    console.log('🎤 Speech result:', transcript);
    
    // Send to server for command processing
    if (this.app.socket) {
      this.app.socket.emit('voice:command', {
        text: transcript,
        context: {
          roomId: this.app.currentRoom?.id
        }
      });
    }
  }
  
  handleServerSpeechResult(data) {
    // Update UI with recognized text
    this.updateSpeechIndicator(data.text);
    
    // If confidence is high, auto-fill message input
    if (data.confidence > 0.8) {
      const messageInput = document.getElementById('message-input');
      if (messageInput) {
        messageInput.value = data.text;
        messageInput.focus();
      }
    }
  }
  
  handleVoiceCommands(data) {
    for (const result of data.results) {
      if (result.success) {
        switch (result.type) {
          case 'send_message':
            this.autoSendMessage(result.message);
            break;
          case 'message':
            this.fillMessageInput(result.text);
            break;
        }
      }
    }
  }
  
  executeVoiceAction(data) {
    switch (data.action) {
      case 'send_message':
        this.autoSendMessage(data.data.message);
        break;
      case 'show_modal':
        const modal = document.getElementById(data.data.modalId);
        if (modal) {
          modal.style.display = 'flex';
        }
        break;
    }
  }
  
  autoSendMessage(message) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    if (messageInput && sendButton) {
      messageInput.value = message;
      sendButton.click();
    }
  }
  
  fillMessageInput(text) {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.value = text;
      messageInput.focus();
    }
  }
  
  async speakMessage(text, personaConfig = {}) {
    try {
      // Use Web Speech API for local synthesis
      if (this.synthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = personaConfig.language || this.currentLanguage;
        utterance.rate = personaConfig.speechRate || 1.0;
        utterance.pitch = personaConfig.speechPitch || 1.0;
        
        // Select appropriate voice
        const voices = this.synthesis.getVoices();
        const voice = this.selectVoice(voices, personaConfig);
        if (voice) {
          utterance.voice = voice;
        }
        
        this.synthesis.speak(utterance);
      }
      
      // Also send to server for system-wide synthesis
      if (this.app.socket && this.app.currentRoom) {
        this.app.socket.emit('voice:speak', {
          text: text,
          personaConfig: personaConfig,
          roomId: this.app.currentRoom.id
        });
      }
    } catch (error) {
      console.error('❌ Speech synthesis failed:', error);
    }
  }
  
  selectVoice(voices, personaConfig) {
    const language = personaConfig.language || this.currentLanguage;
    const gender = personaConfig.gender || 'neutral';
    
    // Filter voices by language
    let filteredVoices = voices.filter(voice => 
      voice.lang.startsWith(language.split('-')[0])
    );
    
    if (filteredVoices.length === 0) {
      filteredVoices = voices;
    }
    
    // Try to match gender if specified
    if (gender !== 'neutral') {
      const genderVoices = filteredVoices.filter(voice => 
        voice.name.toLowerCase().includes(gender === 'female' ? 'female' : 'male')
      );
      
      if (genderVoices.length > 0) {
        return genderVoices[0];
      }
    }
    
    return filteredVoices[0] || null;
  }
  
  updateVoiceUI() {
    const voiceIcon = document.getElementById('voice-icon');
    const voiceBtn = document.getElementById('voice-control-btn');
    
    if (voiceIcon && voiceBtn) {
      if (this.isListening) {
        voiceIcon.textContent = '🔴';
        voiceBtn.title = 'Stop listening';
        voiceBtn.classList.add('active');
      } else if (this.isSpeaking) {
        voiceIcon.textContent = '🗣️';
        voiceBtn.title = 'AI is speaking';
        voiceBtn.classList.remove('active');
      } else {
        voiceIcon.textContent = '🎤';
        voiceBtn.title = 'Start listening';
        voiceBtn.classList.remove('active');
      }
    }
  }
  
  showSpeechIndicator() {
    const indicator = document.getElementById('speech-indicator');
    if (indicator) {
      indicator.style.display = 'block';
    }
  }
  
  hideSpeechIndicator() {
    const indicator = document.getElementById('speech-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
  
  updateSpeechIndicator(text) {
    const speechText = document.getElementById('speech-text');
    if (speechText) {
      speechText.textContent = text || 'Listening...';
    }
  }
  
  showVoiceError(message) {
    if (this.app.showToast) {
      this.app.showToast(message, 'error');
    } else {
      console.error('Voice Error:', message);
    }
  }
  
  showPermissionError() {
    this.showVoiceError('Microphone permission required for voice features');
  }
  
  showUserListening(userId) {
    // Visual indication that another user is speaking
    console.log(`👤 User ${userId} is listening`);
  }
  
  showAISpeaking(data) {
    // Visual indication that AI is speaking
    console.log(`🤖 ${data.personaName} is speaking: ${data.text}`);
  }
  
  updateAvailableVoices() {
    const voices = this.synthesis.getVoices();
    console.log(`🗣️ Available voices: ${voices.length}`);
  }
  
  showVoiceSettings() {
    // Create and show voice settings modal
    this.createVoiceSettingsModal();
  }
  
  createVoiceSettingsModal() {
    // Implementation for voice settings modal
    console.log('🎛️ Voice settings modal (to be implemented)');
  }
  
  setLanguage(language) {
    this.currentLanguage = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
    
    // Notify server
    if (this.app.socket) {
      this.app.socket.emit('voice:set_language', { language });
    }
    
    console.log(`🗣️ Voice language set to: ${language}`);
  }
  
  cleanup() {
    if (this.isListening) {
      this.stopListening();
    }
    
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    
    console.log('🧹 Voice control cleaned up');
  }
}

// Export for use in main app
window.VoiceControl = VoiceControl;