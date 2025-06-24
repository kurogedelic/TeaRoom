// TeaRoom 2.0 - Real-time Voice Recognition and Synthesis Service
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class VoiceService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synthesis = null;
    this.voiceProfiles = new Map();
    this.audioQueue = [];
    this.currentLanguage = 'ja-JP';
    this.speechRate = 1.0;
    this.speechPitch = 1.0;
    this.initialized = false;
    
    this.init();
  }
  
  async init() {
    try {
      // Initialize voice profiles for different personas
      await this.loadVoiceProfiles();
      this.initialized = true;
      console.log('🎤 Voice service initialized');
    } catch (error) {
      console.error('❌ Voice service initialization failed:', error);
    }
  }
  
  async loadVoiceProfiles() {
    // Define voice characteristics for different persona types
    const defaultProfiles = {
      male: {
        pitch: 0.8,
        rate: 1.0,
        voice: 'male',
        language: 'ja-JP'
      },
      female: {
        pitch: 1.2,
        rate: 1.1,
        voice: 'female',
        language: 'ja-JP'
      },
      neutral: {
        pitch: 1.0,
        rate: 1.0,
        voice: 'neutral',
        language: 'ja-JP'
      }
    };
    
    // Set default profiles
    for (const [type, profile] of Object.entries(defaultProfiles)) {
      this.voiceProfiles.set(type, profile);
    }
  }
  
  // Speech Recognition Methods
  async startListening(language = 'ja-JP') {
    if (this.isListening) return false;
    
    try {
      this.currentLanguage = language;
      this.isListening = true;
      console.log(`🎤 Started listening in ${language}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.isListening = false;
      return false;
    }
  }
  
  async stopListening() {
    if (!this.isListening) return;
    
    try {
      this.isListening = false;
      console.log('🔇 Stopped listening');
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
    }
  }
  
  // Speech Synthesis Methods
  async speak(text, personaConfig = {}) {
    if (!text || this.isSpeaking) return false;
    
    try {
      const voiceProfile = this.getVoiceProfile(personaConfig);
      await this.synthesizeSpeech(text, voiceProfile);
      return true;
    } catch (error) {
      console.error('❌ Speech synthesis failed:', error);
      return false;
    }
  }
  
  async synthesizeSpeech(text, voiceProfile) {
    return new Promise((resolve, reject) => {
      this.isSpeaking = true;
      
      // For macOS, use built-in 'say' command
      const sayProcess = spawn('say', [
        '-v', this.getSystemVoice(voiceProfile),
        '-r', Math.round(voiceProfile.rate * 200).toString(),
        text
      ]);
      
      sayProcess.on('close', (code) => {
        this.isSpeaking = false;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Speech synthesis failed with code ${code}`));
        }
      });
      
      sayProcess.on('error', (error) => {
        this.isSpeaking = false;
        reject(error);
      });
    });
  }
  
  getSystemVoice(voiceProfile) {
    // Map voice profiles to macOS system voices
    const voiceMap = {
      'ja-JP': {
        male: 'Kyoko',
        female: 'Otoya',
        neutral: 'Kyoko'
      },
      'en-US': {
        male: 'Alex',
        female: 'Samantha',
        neutral: 'Alex'
      }
    };
    
    const language = voiceProfile.language || 'ja-JP';
    const gender = voiceProfile.voice || 'neutral';
    
    return voiceMap[language]?.[gender] || 'Kyoko';
  }
  
  getVoiceProfile(personaConfig) {
    const gender = personaConfig.gender || 'neutral';
    const language = personaConfig.language || 'ja-JP';
    
    const baseProfile = this.voiceProfiles.get(gender) || this.voiceProfiles.get('neutral');
    
    return {
      ...baseProfile,
      language: language,
      rate: personaConfig.speechRate || baseProfile.rate,
      pitch: personaConfig.speechPitch || baseProfile.pitch
    };
  }
  
  // Audio Processing Methods
  async processAudioInput(audioData, language = 'ja-JP') {
    if (!this.initialized) {
      throw new Error('Voice service not initialized');
    }
    
    try {
      // Simulate speech recognition processing
      // In a real implementation, this would use Web Speech API or cloud services
      const recognizedText = await this.performSpeechRecognition(audioData, language);
      return {
        success: true,
        text: recognizedText,
        language: language,
        confidence: 0.85
      };
    } catch (error) {
      console.error('❌ Audio processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async performSpeechRecognition(audioData, language) {
    // Placeholder for actual speech recognition
    // This would integrate with services like Google Speech-to-Text, Azure Cognitive Services, etc.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('音声認識のテストメッセージです'); // Test message for voice recognition
      }, 1000);
    });
  }
  
  // Voice Command Processing
  async processVoiceCommand(text, context = {}) {
    const commands = this.parseVoiceCommands(text);
    const results = [];
    
    for (const command of commands) {
      try {
        const result = await this.executeVoiceCommand(command, context);
        results.push(result);
      } catch (error) {
        console.error('❌ Voice command execution failed:', error);
        results.push({
          success: false,
          command: command.type,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  parseVoiceCommands(text) {
    const commands = [];
    const lowerText = text.toLowerCase();
    
    // Japanese voice commands
    if (lowerText.includes('メッセージを送信') || lowerText.includes('送信して')) {
      commands.push({ type: 'send_message', text: text });
    }
    
    if (lowerText.includes('新しいルーム') || lowerText.includes('ルームを作成')) {
      commands.push({ type: 'create_room' });
    }
    
    if (lowerText.includes('読み上げ停止') || lowerText.includes('止めて')) {
      commands.push({ type: 'stop_speech' });
    }
    
    // English voice commands
    if (lowerText.includes('send message') || lowerText.includes('send this')) {
      commands.push({ type: 'send_message', text: text });
    }
    
    if (lowerText.includes('create room') || lowerText.includes('new room')) {
      commands.push({ type: 'create_room' });
    }
    
    if (lowerText.includes('stop speaking') || lowerText.includes('stop reading')) {
      commands.push({ type: 'stop_speech' });
    }
    
    // If no specific commands found, treat as regular message
    if (commands.length === 0) {
      commands.push({ type: 'message', text: text });
    }
    
    return commands;
  }
  
  async executeVoiceCommand(command, context) {
    switch (command.type) {
      case 'send_message':
        return await this.handleSendMessage(command.text, context);
      
      case 'create_room':
        return await this.handleCreateRoom(context);
      
      case 'stop_speech':
        return await this.handleStopSpeech();
      
      case 'message':
        return {
          success: true,
          type: 'message',
          text: command.text
        };
      
      default:
        throw new Error(`Unknown voice command: ${command.type}`);
    }
  }
  
  async handleSendMessage(text, context) {
    return {
      success: true,
      type: 'send_message',
      message: text,
      roomId: context.roomId
    };
  }
  
  async handleCreateRoom(context) {
    return {
      success: true,
      type: 'create_room',
      action: 'show_create_room_modal'
    };
  }
  
  async handleStopSpeech() {
    if (this.isSpeaking) {
      // Kill any running speech processes
      try {
        spawn('killall', ['say']);
        this.isSpeaking = false;
      } catch (error) {
        console.error('❌ Failed to stop speech:', error);
      }
    }
    
    return {
      success: true,
      type: 'stop_speech'
    };
  }
  
  // Configuration Methods
  setLanguage(language) {
    this.currentLanguage = language;
    console.log(`🗣️ Voice language set to: ${language}`);
  }
  
  setSpeechRate(rate) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
    console.log(`⚡ Speech rate set to: ${this.speechRate}`);
  }
  
  setSpeechPitch(pitch) {
    this.speechPitch = Math.max(0.5, Math.min(2.0, pitch));
    console.log(`🎵 Speech pitch set to: ${this.speechPitch}`);
  }
  
  // Status Methods
  getStatus() {
    return {
      initialized: this.initialized,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      currentLanguage: this.currentLanguage,
      speechRate: this.speechRate,
      speechPitch: this.speechPitch,
      voiceProfilesCount: this.voiceProfiles.size
    };
  }
  
  // Cleanup
  async cleanup() {
    try {
      await this.stopListening();
      if (this.isSpeaking) {
        spawn('killall', ['say']);
        this.isSpeaking = false;
      }
      console.log('🧹 Voice service cleaned up');
    } catch (error) {
      console.error('❌ Voice service cleanup failed:', error);
    }
  }
}

// Create singleton instance
const voiceService = new VoiceService();

module.exports = {
  VoiceService,
  voiceService
};