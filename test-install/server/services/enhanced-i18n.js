/**
 * Enhanced Internationalization Service for TeaRoom 2.0
 * Advanced multilingual support with cultural context awareness
 */

class EnhancedI18n {
  constructor() {
    this.locales = new Map();
    this.currentLocale = 'ja';
    this.fallbackLocale = 'en';
    this.culturalContext = new Map();
    this.conversationPatterns = new Map();
    this.loadLocales();
    this.initializeCulturalContext();
  }

  /**
   * Load locale files
   */
  async loadLocales() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const localesDir = path.join(__dirname, '../../public/locales');
      const localeFiles = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'));
      
      for (const file of localeFiles) {
        const locale = path.basename(file, '.json');
        const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
        this.locales.set(locale, content);
      }
      
      console.log('📚 Loaded locales:', Array.from(this.locales.keys()));
    } catch (error) {
      console.error('Failed to load locales:', error);
    }
  }

  /**
   * Initialize cultural context patterns
   */
  initializeCulturalContext() {
    // Japanese cultural context
    this.culturalContext.set('ja', {
      formality: {
        levels: ['casual', 'polite', 'formal', 'honorific'],
        default: 'polite',
        markers: {
          casual: ['だよ', 'だね', 'じゃん'],
          polite: ['です', 'ます', 'ですね'],
          formal: ['であります', 'いたします'],
          honorific: ['いらっしゃいます', 'でございます']
        }
      },
      emotionalExpression: {
        subtle: true,
        indirectness: 0.8,
        emoticonStyle: 'japanese',
        commonEmoticons: ['(^^)', '(^_^)', '(>_<)', '(T_T)'],
        commonEmoji: ['😊', '🤗', '💦', '😅']
      },
      conversationStyle: {
        pauseFrequency: 'high',
        questionStyle: 'indirect',
        agreementStyle: 'harmonious',
        topicTransition: 'gradual'
      },
      timeExpression: {
        relative: true,
        seasonalAwareness: true,
        timeOfDayGreetings: {
          morning: ['おはようございます', 'おはよう'],
          afternoon: ['こんにちは'],
          evening: ['こんばんは'],
          night: ['お疲れ様でした']
        }
      }
    });

    // English cultural context
    this.culturalContext.set('en', {
      formality: {
        levels: ['casual', 'professional', 'formal'],
        default: 'casual',
        markers: {
          casual: ['yeah', 'cool', 'awesome'],
          professional: ['certainly', 'indeed', 'absolutely'],
          formal: ['I would be delighted', 'it would be my pleasure']
        }
      },
      emotionalExpression: {
        subtle: false,
        indirectness: 0.3,
        emoticonStyle: 'western',
        commonEmoticons: [':)', ':D', ':(', ';)'],
        commonEmoji: ['😄', '🎉', '👍', '🤔']
      },
      conversationStyle: {
        pauseFrequency: 'medium',
        questionStyle: 'direct',
        agreementStyle: 'expressive',
        topicTransition: 'smooth'
      },
      timeExpression: {
        relative: false,
        seasonalAwareness: false,
        timeOfDayGreetings: {
          morning: ['Good morning', 'Morning!'],
          afternoon: ['Good afternoon', 'Hey there!'],
          evening: ['Good evening', 'Hello!'],
          night: ['Good night', 'Have a great evening!']
        }
      }
    });

    // Conversation patterns by language
    this.conversationPatterns.set('ja', {
      greetings: {
        first_meeting: ['初めまして', 'よろしくお願いします'],
        regular: ['こんにちは', 'お疲れ様です', 'いかがですか'],
        casual: ['やあ', 'おはよ', 'こんちは']
      },
      topic_starters: [
        '最近どうですか？',
        '何か面白いことありましたか？',
        'ところで、',
        'そういえば、',
        '今日はいい天気ですね'
      ],
      agreement_expressions: [
        'そうですね',
        '確かに',
        'おっしゃる通りです',
        'なるほど',
        'その通りです'
      ],
      question_patterns: [
        'どう思いますか？',
        'いかがでしょうか？',
        '〜についてはどうですか？',
        'ご意見をお聞かせください'
      ],
      transition_phrases: [
        'ところで',
        'そういえば',
        'それはそうと',
        '話は変わりますが',
        'ちなみに'
      ]
    });

    this.conversationPatterns.set('en', {
      greetings: {
        first_meeting: ['Nice to meet you', 'Pleasure to meet you'],
        regular: ['Hello', 'Hi there', 'How are you doing?'],
        casual: ['Hey', 'What\'s up?', 'Howdy']
      },
      topic_starters: [
        'How are things going?',
        'What\'s new?',
        'By the way,',
        'Speaking of which,',
        'It\'s a lovely day, isn\'t it?'
      ],
      agreement_expressions: [
        'I agree',
        'Absolutely',
        'That\'s right',
        'Exactly',
        'You\'re absolutely right'
      ],
      question_patterns: [
        'What do you think?',
        'How do you feel about that?',
        'What\'s your take on this?',
        'I\'d love to hear your thoughts'
      ],
      transition_phrases: [
        'By the way',
        'Speaking of which',
        'That reminds me',
        'On another note',
        'Incidentally'
      ]
    });
  }

  /**
   * Get culturally appropriate response template
   */
  getCulturalResponseTemplate(language, context, personaTrait) {
    const cultural = this.culturalContext.get(language);
    const patterns = this.conversationPatterns.get(language);
    
    if (!cultural || !patterns) {
      return this.getBasicTemplate(language);
    }

    const template = {
      greeting: this.selectGreeting(patterns, context),
      topicStarter: this.selectTopicStarter(patterns, context),
      agreementPhrase: this.selectAgreementPhrase(patterns, personaTrait),
      questionPattern: this.selectQuestionPattern(patterns, context),
      transitionPhrase: this.selectTransitionPhrase(patterns, context),
      formality: this.determineFormality(cultural, personaTrait),
      emotionalMarkers: this.getEmotionalMarkers(cultural, context)
    };

    return template;
  }

  /**
   * Select appropriate greeting based on context
   */
  selectGreeting(patterns, context) {
    const timeOfDay = this.getTimeOfDay();
    const isFirstInteraction = context.isFirstInteraction || false;
    const formalityLevel = context.formalityLevel || 'regular';

    if (isFirstInteraction) {
      return this.randomSelect(patterns.greetings.first_meeting);
    }

    if (formalityLevel === 'casual') {
      return this.randomSelect(patterns.greetings.casual);
    }

    return this.randomSelect(patterns.greetings.regular);
  }

  /**
   * Select topic starter based on conversation context
   */
  selectTopicStarter(patterns, context) {
    if (context.needsEnergyBoost) {
      // Select more energetic topic starters
      return patterns.topic_starters.filter(starter => 
        starter.includes('面白い') || starter.includes('What\'s new')
      )[0] || this.randomSelect(patterns.topic_starters);
    }

    return this.randomSelect(patterns.topic_starters);
  }

  /**
   * Select agreement phrase based on persona traits
   */
  selectAgreementPhrase(patterns, personaTrait) {
    if (personaTrait && personaTrait.agreeableness >= 4) {
      // More enthusiastic agreement for agreeable personas
      const enthusiastic = patterns.agreement_expressions.filter(expr =>
        expr.includes('おっしゃる通り') || expr.includes('absolutely')
      );
      if (enthusiastic.length > 0) {
        return this.randomSelect(enthusiastic);
      }
    }

    return this.randomSelect(patterns.agreement_expressions);
  }

  /**
   * Select question pattern based on context
   */
  selectQuestionPattern(patterns, context) {
    if (context.needsInclusion) {
      // Select more inclusive question patterns
      return patterns.question_patterns.filter(pattern =>
        pattern.includes('皆') || pattern.includes('everyone')
      )[0] || this.randomSelect(patterns.question_patterns);
    }

    return this.randomSelect(patterns.question_patterns);
  }

  /**
   * Select transition phrase
   */
  selectTransitionPhrase(patterns, context) {
    return this.randomSelect(patterns.transition_phrases);
  }

  /**
   * Determine formality level
   */
  determineFormality(cultural, personaTrait) {
    if (!personaTrait) return cultural.formality.default;

    // Higher conscientiousness tends toward formality
    if (personaTrait.conscientiousness >= 4) {
      return 'formal';
    }

    // Higher extraversion tends toward casual
    if (personaTrait.extraversion >= 4) {
      return 'casual';
    }

    return cultural.formality.default;
  }

  /**
   * Get emotional markers based on cultural context
   */
  getEmotionalMarkers(cultural, context) {
    const markers = {
      emoticons: cultural.emotionalExpression.commonEmoticons,
      emoji: cultural.emotionalExpression.commonEmoji,
      style: cultural.emotionalExpression.emoticonStyle,
      intensity: context.emotionalIntensity || 0.5
    };

    return markers;
  }

  /**
   * Apply cultural adaptation to response
   */
  applyCulturalAdaptation(response, language, context = {}, personaTrait = null) {
    const template = this.getCulturalResponseTemplate(language, context, personaTrait);
    const cultural = this.culturalContext.get(language);

    if (!cultural) return response;

    let adaptedResponse = response;

    // Apply formality adjustments
    if (language === 'ja') {
      adaptedResponse = this.adjustJapanesePoliteness(adaptedResponse, template.formality);
    }

    // Add cultural markers
    if (context.addEmotional && Math.random() < 0.3) {
      const marker = this.randomSelect(template.emotionalMarkers.emoji);
      adaptedResponse += ' ' + marker;
    }

    // Add transition phrases if needed
    if (context.isTopicChange && Math.random() < 0.4) {
      adaptedResponse = template.transitionPhrase + ' ' + adaptedResponse;
    }

    // Apply indirectness for Japanese
    if (language === 'ja' && cultural.emotionalExpression.indirectness > 0.5) {
      adaptedResponse = this.addJapaneseIndirectness(adaptedResponse);
    }

    return adaptedResponse;
  }

  /**
   * Adjust Japanese politeness level
   */
  adjustJapanesePoliteness(text, formalityLevel) {
    const cultural = this.culturalContext.get('ja');
    const markers = cultural.formality.markers[formalityLevel] || cultural.formality.markers.polite;

    // Simple politeness adjustment (in a real implementation, this would be more sophisticated)
    if (formalityLevel === 'casual') {
      text = text.replace(/です/g, 'だ').replace(/ます/g, 'る');
    } else if (formalityLevel === 'formal') {
      text = text.replace(/だ/g, 'です').replace(/る$/g, 'ます');
    }

    return text;
  }

  /**
   * Add Japanese indirectness
   */
  addJapaneseIndirectness(text) {
    const indirectMarkers = ['かもしれません', 'と思います', 'のではないでしょうか'];
    
    if (Math.random() < 0.3) {
      const marker = this.randomSelect(indirectMarkers);
      text = text.replace(/です$/, marker);
    }

    return text;
  }

  /**
   * Generate culturally appropriate conversation starter
   */
  generateCulturalConversationStarter(language, context = {}) {
    const patterns = this.conversationPatterns.get(language);
    if (!patterns) return this.getBasicStarter(language);

    const template = this.getCulturalResponseTemplate(language, context);
    
    let starter = '';

    // Add time-appropriate greeting if needed
    if (context.includeGreeting) {
      starter += template.greeting + ' ';
    }

    // Add main topic starter
    starter += template.topicStarter;

    // Add question if appropriate
    if (context.makeItQuestion && Math.random() < 0.7) {
      starter += ' ' + template.questionPattern;
    }

    return this.applyCulturalAdaptation(starter, language, context);
  }

  /**
   * Detect language from message content
   */
  detectLanguage(text) {
    // Simple language detection based on character patterns
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    const englishPattern = /^[a-zA-Z0-9\s.,!?;:'"()]+$/;

    if (japanesePattern.test(text)) {
      return 'ja';
    } else if (englishPattern.test(text)) {
      return 'en';
    }

    // Default fallback based on current locale
    return this.currentLocale;
  }

  /**
   * Get time-appropriate greeting
   */
  getTimeOfDayGreeting(language) {
    const cultural = this.culturalContext.get(language);
    if (!cultural) return '';

    const timeOfDay = this.getTimeOfDay();
    const greetings = cultural.timeExpression.timeOfDayGreetings[timeOfDay];
    
    return this.randomSelect(greetings) || '';
  }

  /**
   * Helper methods
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  randomSelect(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getBasicTemplate(language) {
    return {
      greeting: language === 'ja' ? 'こんにちは' : 'Hello',
      topicStarter: language === 'ja' ? '最近どうですか？' : 'How are things going?',
      agreementPhrase: language === 'ja' ? 'そうですね' : 'I agree',
      questionPattern: language === 'ja' ? 'どう思いますか？' : 'What do you think?',
      transitionPhrase: language === 'ja' ? 'ところで' : 'By the way'
    };
  }

  getBasicStarter(language) {
    return language === 'ja' ? '最近どうですか？' : 'How are things going?';
  }

  /**
   * Set current locale
   */
  setLocale(locale) {
    if (this.locales.has(locale)) {
      this.currentLocale = locale;
    }
  }

  /**
   * Get current locale
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Translate text using loaded locales
   */
  t(key, params = {}) {
    const locale = this.locales.get(this.currentLocale) || this.locales.get(this.fallbackLocale);
    if (!locale) return key;

    const keys = key.split('.');
    let value = locale;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }

    // Replace parameters
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }

    return value || key;
  }
}

module.exports = new EnhancedI18n();