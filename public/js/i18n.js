// Internationalization (i18n) System for TeaRoom 2.0

class I18n {
  constructor() {
    this.currentLang = 'ja';
    this.translations = {
      ja: {
        // App
        'app.title': 'TeaRoom 2.0',
        'app.subtitle': 'モダンAIチャットプラットフォーム',
        
        // Navigation
        'nav.rooms': 'ルーム',
        'nav.create_room': 'ルーム作成',
        'nav.create_persona': 'ペルソナ作成',
        'nav.manage_personas': 'ペルソナ管理',
        'nav.settings': '設定',
        
        // Placeholders
        'placeholder.room_name': 'ルーム名を入力',
        'placeholder.room_topic': '何について話しますか？',
        'placeholder.persona_name': 'ペルソナ名を入力',
        'placeholder.custom_prompt': 'このペルソナの行動に関する追加の指示...',
        
        // Room
        'room.create': 'ルーム作成',
        'room.name': 'ルーム名',
        'room.topic': '議題（任意）',
        'room.language': '言語',
        'room.select_personas': 'ペルソナを選択（2人）',
        'room.personas_help': '会話に参加するペルソナを正確に2人選択してください。',
        'room.empty_state.title': 'ルームが選択されていません',
        'room.empty_state.description': '新しいルームを作成するか、既存のルームを選択してAIペルソナとの会話を始めましょう。',
        'room.empty_state.action': '最初のルームを作成',
        
        // Persona
        'persona.create': 'ペルソナ作成',
        'persona.name': 'ペルソナ名',
        'persona.avatar': 'アバター',
        'persona.emoji': '絵文字',
        'persona.upload': '画像アップロード',
        'persona.gender': '性別（任意）',
        'persona.gender.not_specified': '指定なし',
        'persona.gender.male': '男性',
        'persona.gender.female': '女性',
        'persona.gender.neutral': '中性',
        'persona.api_provider': 'APIプロバイダー',
        'persona.personality': '性格特性（Big Five モデル）',
        'persona.extraversion': '外向性',
        'persona.agreeableness': '協調性',
        'persona.conscientiousness': '誠実性',
        'persona.neuroticism': '神経症的傾向',
        'persona.openness': '開放性',
        'persona.custom_prompt': 'カスタムプロンプト（任意）',
        'persona.custom_prompt_help': 'このペルソナの行動と性格をカスタマイズするための追加指示が含まれます。',
        
        // Personality labels
        'personality.extraversion.low': '内向的',
        'personality.extraversion.high': '外向的',
        'personality.agreeableness.low': '分析的',
        'personality.agreeableness.high': '協調的',
        'personality.conscientiousness.low': '自発的',
        'personality.conscientiousness.high': '几帳面',
        'personality.neuroticism.low': '安定',
        'personality.neuroticism.high': '敏感',
        'personality.openness.low': '伝統的',
        'personality.openness.high': '創造的',
        
        // Messages
        'message.input_placeholder': 'メッセージを入力... @名前 でメンションできます',
        'message.typing': '入力中...',
        'message.send': '送信',
        
        // Auto Chat
        'auto_chat.start': '自動チャット開始',
        'auto_chat.stop': '自動チャット停止',
        'auto_chat.active': '自動チャット中...',
        
        // Search
        'search.title': 'メッセージ検索',
        'search.placeholder': 'メッセージを検索...',
        'search.no_results': 'メッセージが見つかりません',
        'search.results_count': '{count}件の結果',
        
        // Settings
        'settings.title': '設定',
        'settings.language': 'インターフェース言語',
        'settings.theme': 'テーマ',
        'settings.theme.auto': '自動（システム設定）',
        'settings.theme.light': 'ライト',
        'settings.theme.dark': 'ダーク',
        'settings.notifications': '通知を有効にする',
        
        // Languages
        'language.ja': '日本語',
        'language.en': 'English',
        
        // Actions
        'action.create': '作成',
        'action.cancel': 'キャンセル',
        'action.save': '保存',
        'action.delete': '削除',
        'action.edit': '編集',
        'action.close': '閉じる',
        
        // Status
        'status.connected': '接続中',
        'status.disconnected': '切断',
        'status.connecting': '接続中...',
        
        // Notifications
        'notification.room_created': 'ルームが作成されました',
        'notification.persona_created': 'ペルソナが作成されました',
        'notification.settings_saved': '設定が保存されました',
        'notification.user_joined': '{user}が参加しました',
        'notification.user_left': '{user}が退室しました',
        
        // Errors
        'error.network': 'ネットワークエラーが発生しました',
        'error.room_not_found': 'ルームが見つかりません',
        'error.persona_not_found': 'ペルソナが見つかりません',
        'error.invalid_input': '入力値が無効です',
        'error.server_error': 'サーバーエラーが発生しました',
        'error.upload_failed': 'ファイルのアップロードに失敗しました',
      },
      
      en: {
        // App
        'app.title': 'TeaRoom 2.0',
        'app.subtitle': 'Modern AI Chat Platform',
        
        // Navigation
        'nav.rooms': 'Rooms',
        'nav.create_room': 'Create Room',
        'nav.create_persona': 'Create Persona',
        'nav.manage_personas': 'Manage Personas',
        'nav.settings': 'Settings',
        
        // Placeholders
        'placeholder.room_name': 'Enter room name',
        'placeholder.room_topic': 'What would you like to discuss?',
        'placeholder.persona_name': 'Enter persona name',
        'placeholder.custom_prompt': 'Additional instructions for this persona\'s behavior...',
        
        // Room
        'room.create': 'Create Room',
        'room.name': 'Room Name',
        'room.topic': 'Discussion Topic (Optional)',
        'room.language': 'Language',
        'room.select_personas': 'Select Personas (Choose 2)',
        'room.personas_help': 'Select exactly 2 personas to participate in this conversation.',
        'room.empty_state.title': 'No room selected',
        'room.empty_state.description': 'Create a new room or select an existing one to start a conversation with AI personas.',
        'room.empty_state.action': 'Create Your First Room',
        
        // Persona
        'persona.create': 'Create Persona',
        'persona.name': 'Persona Name',
        'persona.avatar': 'Avatar',
        'persona.emoji': 'Emoji',
        'persona.upload': 'Upload Image',
        'persona.gender': 'Gender (Optional)',
        'persona.gender.not_specified': 'Not specified',
        'persona.gender.male': 'Male',
        'persona.gender.female': 'Female',
        'persona.gender.neutral': 'Neutral',
        'persona.api_provider': 'API Provider',
        'persona.personality': 'Personality Traits (Big Five Model)',
        'persona.extraversion': 'Extraversion',
        'persona.agreeableness': 'Agreeableness',
        'persona.conscientiousness': 'Conscientiousness',
        'persona.neuroticism': 'Neuroticism',
        'persona.openness': 'Openness',
        'persona.custom_prompt': 'Custom Prompt (Optional)',
        'persona.custom_prompt_help': 'Additional instructions for customizing this persona\'s behavior and personality.',
        
        // Personality labels
        'personality.extraversion.low': 'Introverted',
        'personality.extraversion.high': 'Extroverted',
        'personality.agreeableness.low': 'Analytical',
        'personality.agreeableness.high': 'Cooperative',
        'personality.conscientiousness.low': 'Spontaneous',
        'personality.conscientiousness.high': 'Organized',
        'personality.neuroticism.low': 'Stable',
        'personality.neuroticism.high': 'Sensitive',
        'personality.openness.low': 'Traditional',
        'personality.openness.high': 'Creative',
        
        // Messages
        'message.input_placeholder': 'Type your message... Use @name to mention someone',
        'message.typing': 'typing...',
        'message.send': 'Send',
        
        // Auto Chat
        'auto_chat.start': 'Start auto chat',
        'auto_chat.stop': 'Stop auto chat',
        'auto_chat.active': 'Auto chat active...',
        
        // Search
        'search.title': 'Search Messages',
        'search.placeholder': 'Search for messages...',
        'search.no_results': 'No messages found',
        'search.results_count': '{count} results',
        
        // Settings
        'settings.title': 'Settings',
        'settings.language': 'Interface Language',
        'settings.theme': 'Theme',
        'settings.theme.auto': 'Auto (System Preference)',
        'settings.theme.light': 'Light',
        'settings.theme.dark': 'Dark',
        'settings.notifications': 'Enable Notifications',
        
        // Languages
        'language.ja': '日本語',
        'language.en': 'English',
        
        // Actions
        'action.create': 'Create',
        'action.cancel': 'Cancel',
        'action.save': 'Save',
        'action.delete': 'Delete',
        'action.edit': 'Edit',
        'action.close': 'Close',
        
        // Status
        'status.connected': 'Connected',
        'status.disconnected': 'Disconnected',
        'status.connecting': 'Connecting...',
        
        // Notifications
        'notification.room_created': 'Room created successfully',
        'notification.persona_created': 'Persona created successfully',
        'notification.settings_saved': 'Settings saved successfully',
        'notification.user_joined': '{user} joined',
        'notification.user_left': '{user} left',
        
        // Errors
        'error.network': 'Network error occurred',
        'error.room_not_found': 'Room not found',
        'error.persona_not_found': 'Persona not found',
        'error.invalid_input': 'Invalid input',
        'error.server_error': 'Server error occurred',
        'error.upload_failed': 'File upload failed',
      }
    };
    
    this.loadLanguage();
    this.init();
  }
  
  loadLanguage() {
    const saved = localStorage.getItem('tearoom_language');
    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    } else {
      // Auto-detect browser language
      const browserLang = navigator.language.substring(0, 2);
      if (this.translations[browserLang]) {
        this.currentLang = browserLang;
      }
    }
    
    // Update document language
    document.documentElement.lang = this.currentLang;
  }
  
  setLanguage(lang) {
    if (!this.translations[lang]) {
      console.warn(`Language '${lang}' not supported`);
      return;
    }
    
    this.currentLang = lang;
    localStorage.setItem('tearoom_language', lang);
    document.documentElement.lang = lang;
    
    // Update all elements with data-i18n
    this.updateElements();
    
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }
  
  updateElements() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });
    
    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
    
    // Update elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
  }
  
  init() {
    // Initialize after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.updateElements());
    } else {
      this.updateElements();
    }
  }
  
  t(key, replacements = {}) {
    const translation = this.translations[this.currentLang]?.[key] || this.translations['en']?.[key] || key;
    
    // Replace placeholders like {user} with values
    return translation.replace(/\{([^}]+)\}/g, (match, placeholder) => {
      return replacements[placeholder] || match;
    });
  }
  
  getCurrentLanguage() {
    return this.currentLang;
  }
  
  getSupportedLanguages() {
    return Object.keys(this.translations);
  }
}

// Global i18n instance
window.i18n = new I18n();

// Utility function for easy access
window.t = (key, replacements) => window.i18n.t(key, replacements);