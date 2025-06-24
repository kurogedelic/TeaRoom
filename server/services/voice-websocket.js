// TeaRoom 2.0 - Voice WebSocket Integration
const { voiceService } = require('./voice-service');

class VoiceWebSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeVoiceSessions = new Map(); // socketId -> session info
    this.setupVoiceHandlers();
    console.log('🎤 Voice WebSocket handler initialized');
  }
  
  setupVoiceHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🎤 Voice session connected: ${socket.id}`);
      
      // Voice recognition events
      socket.on('voice:start_listening', async (data) => {
        await this.handleStartListening(socket, data);
      });
      
      socket.on('voice:stop_listening', async (data) => {
        await this.handleStopListening(socket, data);
      });
      
      socket.on('voice:audio_data', async (data) => {
        await this.handleAudioData(socket, data);
      });
      
      // Voice synthesis events
      socket.on('voice:speak', async (data) => {
        await this.handleSpeak(socket, data);
      });
      
      socket.on('voice:stop_speaking', async (data) => {
        await this.handleStopSpeaking(socket, data);
      });
      
      // Voice command events
      socket.on('voice:command', async (data) => {
        await this.handleVoiceCommand(socket, data);
      });
      
      // Voice settings events
      socket.on('voice:set_language', (data) => {
        this.handleSetLanguage(socket, data);
      });
      
      socket.on('voice:set_speech_rate', (data) => {
        this.handleSetSpeechRate(socket, data);
      });
      
      socket.on('voice:get_status', () => {
        this.handleGetStatus(socket);
      });
      
      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }
  
  async handleStartListening(socket, data) {
    try {
      const { language = 'ja-JP', roomId } = data;
      
      const success = await voiceService.startListening(language);
      
      if (success) {
        // Store session info
        this.activeVoiceSessions.set(socket.id, {
          isListening: true,
          language: language,
          roomId: roomId,
          startTime: Date.now()
        });
        
        socket.emit('voice:listening_started', {
          success: true,
          language: language
        });
        
        // Notify room about voice activity
        if (roomId) {
          socket.to(`room:${roomId}`).emit('voice:user_listening', {
            userId: socket.id,
            language: language
          });
        }
        
        console.log(`🎤 Voice listening started for ${socket.id} in ${language}`);
      } else {
        socket.emit('voice:error', {
          type: 'listening_failed',
          message: 'Failed to start voice recognition'
        });
      }
    } catch (error) {
      console.error('❌ Voice listening start failed:', error);
      socket.emit('voice:error', {
        type: 'listening_error',
        message: error.message
      });
    }
  }
  
  async handleStopListening(socket, data) {
    try {
      await voiceService.stopListening();
      
      const session = this.activeVoiceSessions.get(socket.id);
      if (session) {
        session.isListening = false;
        
        socket.emit('voice:listening_stopped', {
          success: true,
          duration: Date.now() - session.startTime
        });
        
        // Notify room
        if (session.roomId) {
          socket.to(`room:${session.roomId}`).emit('voice:user_stopped_listening', {
            userId: socket.id
          });
        }
        
        console.log(`🔇 Voice listening stopped for ${socket.id}`);
      }
    } catch (error) {
      console.error('❌ Voice listening stop failed:', error);
      socket.emit('voice:error', {
        type: 'stop_listening_error',
        message: error.message
      });
    }
  }
  
  async handleAudioData(socket, data) {
    try {
      const { audioData, language = 'ja-JP' } = data;
      const session = this.activeVoiceSessions.get(socket.id);
      
      if (!session || !session.isListening) {
        socket.emit('voice:error', {
          type: 'not_listening',
          message: 'Voice recognition not active'
        });
        return;
      }
      
      // Process audio data through voice service
      const result = await voiceService.processAudioInput(audioData, language);
      
      if (result.success) {
        socket.emit('voice:recognition_result', {
          text: result.text,
          language: result.language,
          confidence: result.confidence
        });
        
        // If confidence is high enough, also emit as voice command
        if (result.confidence > 0.7) {
          const commands = await voiceService.processVoiceCommand(result.text, {
            roomId: session.roomId,
            userId: socket.id
          });
          
          socket.emit('voice:commands_recognized', {
            text: result.text,
            commands: commands
          });
        }
        
        console.log(`🎤 Voice recognized: "${result.text}" (${result.confidence})`);
      } else {
        socket.emit('voice:recognition_failed', {
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Audio data processing failed:', error);
      socket.emit('voice:error', {
        type: 'audio_processing_error',
        message: error.message
      });
    }
  }
  
  async handleSpeak(socket, data) {
    try {
      const { text, personaConfig = {}, roomId } = data;
      
      if (!text) {
        socket.emit('voice:error', {
          type: 'invalid_text',
          message: 'No text provided for speech synthesis'
        });
        return;
      }
      
      const success = await voiceService.speak(text, personaConfig);
      
      if (success) {
        socket.emit('voice:speaking_started', {
          text: text,
          personaConfig: personaConfig
        });
        
        // Notify room about speech activity
        if (roomId) {
          socket.to(`room:${roomId}`).emit('voice:ai_speaking', {
            text: text,
            personaName: personaConfig.name || 'AI',
            personaConfig: personaConfig
          });
        }
        
        console.log(`🗣️ Speech synthesis started: "${text.substr(0, 50)}..."`);
      } else {
        socket.emit('voice:error', {
          type: 'speech_failed',
          message: 'Failed to start speech synthesis'
        });
      }
    } catch (error) {
      console.error('❌ Speech synthesis failed:', error);
      socket.emit('voice:error', {
        type: 'speech_error',
        message: error.message
      });
    }
  }
  
  async handleStopSpeaking(socket, data) {
    try {
      const result = await voiceService.handleStopSpeech();
      
      socket.emit('voice:speaking_stopped', {
        success: result.success
      });
      
      const session = this.activeVoiceSessions.get(socket.id);
      if (session && session.roomId) {
        socket.to(`room:${session.roomId}`).emit('voice:ai_stopped_speaking', {
          userId: socket.id
        });
      }
      
      console.log(`🔇 Speech synthesis stopped for ${socket.id}`);
    } catch (error) {
      console.error('❌ Stop speaking failed:', error);
      socket.emit('voice:error', {
        type: 'stop_speech_error',
        message: error.message
      });
    }
  }
  
  async handleVoiceCommand(socket, data) {
    try {
      const { text, context = {} } = data;
      const session = this.activeVoiceSessions.get(socket.id);
      
      const commandContext = {
        ...context,
        roomId: session?.roomId,
        userId: socket.id
      };
      
      const results = await voiceService.processVoiceCommand(text, commandContext);
      
      socket.emit('voice:command_results', {
        text: text,
        results: results
      });
      
      // Execute UI actions based on command results
      for (const result of results) {
        if (result.success) {
          await this.executeUIAction(socket, result);
        }
      }
      
      console.log(`🎤 Voice command processed: "${text}"`);
    } catch (error) {
      console.error('❌ Voice command processing failed:', error);
      socket.emit('voice:error', {
        type: 'command_error',
        message: error.message
      });
    }
  }
  
  async executeUIAction(socket, result) {
    switch (result.type) {
      case 'send_message':
        socket.emit('voice:execute_action', {
          action: 'send_message',
          data: {
            message: result.message,
            roomId: result.roomId
          }
        });
        break;
      
      case 'create_room':
        socket.emit('voice:execute_action', {
          action: 'show_modal',
          data: {
            modalId: 'room-modal'
          }
        });
        break;
      
      case 'stop_speech':
        // Already handled in the voice service
        break;
    }
  }
  
  handleSetLanguage(socket, data) {
    try {
      const { language } = data;
      voiceService.setLanguage(language);
      
      const session = this.activeVoiceSessions.get(socket.id);
      if (session) {
        session.language = language;
      }
      
      socket.emit('voice:language_set', {
        language: language
      });
      
      console.log(`🗣️ Voice language set to ${language} for ${socket.id}`);
    } catch (error) {
      console.error('❌ Set language failed:', error);
      socket.emit('voice:error', {
        type: 'set_language_error',
        message: error.message
      });
    }
  }
  
  handleSetSpeechRate(socket, data) {
    try {
      const { rate } = data;
      voiceService.setSpeechRate(rate);
      
      socket.emit('voice:speech_rate_set', {
        rate: rate
      });
      
      console.log(`⚡ Speech rate set to ${rate} for ${socket.id}`);
    } catch (error) {
      console.error('❌ Set speech rate failed:', error);
      socket.emit('voice:error', {
        type: 'set_speech_rate_error',
        message: error.message
      });
    }
  }
  
  handleGetStatus(socket) {
    try {
      const voiceStatus = voiceService.getStatus();
      const session = this.activeVoiceSessions.get(socket.id);
      
      socket.emit('voice:status', {
        ...voiceStatus,
        session: session || null
      });
    } catch (error) {
      console.error('❌ Get voice status failed:', error);
      socket.emit('voice:error', {
        type: 'status_error',
        message: error.message
      });
    }
  }
  
  handleDisconnect(socket) {
    try {
      const session = this.activeVoiceSessions.get(socket.id);
      
      if (session && session.isListening) {
        voiceService.stopListening();
      }
      
      this.activeVoiceSessions.delete(socket.id);
      
      console.log(`🎤 Voice session disconnected: ${socket.id}`);
    } catch (error) {
      console.error('❌ Voice disconnect cleanup failed:', error);
    }
  }
  
  // Broadcast methods for system-wide voice events
  broadcastVoiceStatus() {
    const status = voiceService.getStatus();
    this.io.emit('voice:system_status', status);
  }
  
  async cleanup() {
    try {
      await voiceService.cleanup();
      this.activeVoiceSessions.clear();
      console.log('🧹 Voice WebSocket handler cleaned up');
    } catch (error) {
      console.error('❌ Voice WebSocket cleanup failed:', error);
    }
  }
}

module.exports = VoiceWebSocketHandler;