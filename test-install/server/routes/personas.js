const express = require('express');
const database = require('../database/database');
const personaFiles = require('../services/persona-files');
const router = express.Router();

// GET /api/personas - ペルソナ一覧取得
router.get('/', async (req, res) => {
  try {
    const personas = await database.getPersonas();
    
    res.json({
      success: true,
      data: personas
    });
  } catch (error) {
    console.error('Error fetching personas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personas'
    });
  }
});

// GET /api/personas/:id - 特定ペルソナ取得
router.get('/:id', async (req, res) => {
  try {
    const personaId = parseInt(req.params.id);
    
    if (isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona ID'
      });
    }
    
    const persona = await database.getPersona(personaId);
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }
    
    res.json({
      success: true,
      data: persona
    });
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch persona'
    });
  }
});

// POST /api/personas - 新しいペルソナ作成
router.post('/', async (req, res) => {
  try {
    const {
      name,
      avatar_type = 'emoji',
      avatar_value,
      gender,
      api_provider = 'claude-code',
      extraversion = 3,
      agreeableness = 3,
      conscientiousness = 3,
      neuroticism = 3,
      openness = 3,
      custom_prompt
    } = req.body;
    
    // バリデーション
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Persona name is required'
      });
    }
    
    if (!['emoji', 'upload'].includes(avatar_type)) {
      return res.status(400).json({
        success: false,
        error: 'Avatar type must be "emoji" or "upload"'
      });
    }
    
    if (!['claude-code', 'openai'].includes(api_provider)) {
      return res.status(400).json({
        success: false,
        error: 'API provider must be "claude-code" or "openai"'
      });
    }
    
    // Big Five traits validation (1-5)
    const traits = { extraversion, agreeableness, conscientiousness, neuroticism, openness };
    for (const [trait, value] of Object.entries(traits)) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        return res.status(400).json({
          success: false,
          error: `${trait} must be an integer between 1 and 5`
        });
      }
    }
    
    // ペルソナデータの準備
    const personaData = {
      name: name.trim(),
      avatar_type,
      avatar_value: avatar_value?.trim(),
      gender: gender?.trim(),
      api_provider,
      extraversion,
      agreeableness,
      conscientiousness,
      neuroticism,
      openness,
      custom_prompt: custom_prompt?.trim()
    };
    
    // ペルソナ作成
    const result = await database.createPersona(personaData);
    const personaId = result.lastID;
    
    // 作成されたペルソナ情報を取得
    const persona = await database.getPersona(personaId);
    
    // ペルソナファイルを作成
    personaFiles.createPersonaFiles(persona);
    
    res.status(201).json({
      success: true,
      data: persona
    });
  } catch (error) {
    console.error('Error creating persona:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        error: 'Persona name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create persona'
    });
  }
});

// PUT /api/personas/:id - ペルソナ更新
router.put('/:id', async (req, res) => {
  try {
    const personaId = parseInt(req.params.id);
    const {
      name,
      avatar_type,
      avatar_value,
      gender,
      api_provider,
      extraversion,
      agreeableness,
      conscientiousness,
      neuroticism,
      openness,
      custom_prompt
    } = req.body;
    
    if (isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona ID'
      });
    }
    
    // ペルソナの存在確認
    const existingPersona = await database.getPersona(personaId);
    if (!existingPersona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }
    
    // 更新データの準備とバリデーション
    const updates = {};
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Persona name cannot be empty'
        });
      }
      updates.name = name.trim();
    }
    
    if (avatar_type !== undefined) {
      if (!['emoji', 'upload'].includes(avatar_type)) {
        return res.status(400).json({
          success: false,
          error: 'Avatar type must be "emoji" or "upload"'
        });
      }
      updates.avatar_type = avatar_type;
    }
    
    if (avatar_value !== undefined) updates.avatar_value = avatar_value?.trim();
    if (gender !== undefined) updates.gender = gender?.trim();
    
    if (api_provider !== undefined) {
      if (!['claude-code', 'openai'].includes(api_provider)) {
        return res.status(400).json({
          success: false,
          error: 'API provider must be "claude-code" or "openai"'
        });
      }
      updates.api_provider = api_provider;
    }
    
    // Big Five traits validation
    const traits = { extraversion, agreeableness, conscientiousness, neuroticism, openness };
    for (const [trait, value] of Object.entries(traits)) {
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < 1 || value > 5) {
          return res.status(400).json({
            success: false,
            error: `${trait} must be an integer between 1 and 5`
          });
        }
        updates[trait] = value;
      }
    }
    
    if (custom_prompt !== undefined) updates.custom_prompt = custom_prompt?.trim();
    
    // 更新実行
    await database.updatePersona(personaId, updates);
    
    // 更新後のペルソナ情報を取得
    const persona = await database.getPersona(personaId);
    
    // ペルソナファイルを更新
    personaFiles.updatePersonaFiles(persona);
    
    res.json({
      success: true,
      data: persona
    });
  } catch (error) {
    console.error('Error updating persona:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        error: 'Persona name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update persona'
    });
  }
});

// DELETE /api/personas/:id - ペルソナ削除
router.delete('/:id', async (req, res) => {
  try {
    const personaId = parseInt(req.params.id);
    
    if (isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona ID'
      });
    }
    
    // ペルソナの存在確認
    const existingPersona = await database.getPersona(personaId);
    if (!existingPersona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }
    
    // 削除実行
    // Get persona name before deletion
    const persona = await database.getPersona(personaId);
    
    await database.deletePersona(personaId);
    
    // Delete persona files if persona existed
    if (persona) {
      personaFiles.deletePersonaFiles(persona.name);
    }
    
    res.json({
      success: true,
      message: 'Persona deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting persona:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete persona'
    });
  }
});

// GET /api/personas/:id/system-prompt - ペルソナのシステムプロンプト生成
router.get('/:id/system-prompt', async (req, res) => {
  try {
    const personaId = parseInt(req.params.id);
    const { topic, language = 'ja' } = req.query;
    
    if (isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona ID'
      });
    }
    
    const persona = await database.getPersona(personaId);
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }
    
    // Big Five personality traits description
    const traitDescriptions = {
      ja: {
        extraversion: ['内向的', '控えめ', '普通', '外向的', '非常に社交的'],
        agreeableness: ['分析的', 'やや懐疑的', '普通', '協調的', '非常に協力的'],
        conscientiousness: ['自発的', 'やや柔軟', '普通', '几帳面', '非常に組織的'],
        neuroticism: ['安定', 'やや冷静', '普通', '敏感', '非常に感情的'],
        openness: ['実用的', 'やや保守的', '普通', '創造的', '非常に開放的']
      },
      en: {
        extraversion: ['Introverted', 'Reserved', 'Moderate', 'Extraverted', 'Very Social'],
        agreeableness: ['Analytical', 'Skeptical', 'Moderate', 'Cooperative', 'Very Agreeable'],
        conscientiousness: ['Spontaneous', 'Flexible', 'Moderate', 'Organized', 'Very Conscientious'],
        neuroticism: ['Stable', 'Calm', 'Moderate', 'Sensitive', 'Very Emotional'],
        openness: ['Practical', 'Traditional', 'Moderate', 'Creative', 'Very Open']
      }
    };
    
    const lang = ['ja', 'en'].includes(language) ? language : 'ja';
    const traits = traitDescriptions[lang];
    
    // システムプロンプト生成
    const systemPrompt = lang === 'ja' ? `
あなたは${persona.name}というAIペルソナです。TeaRoomという会話プラットフォームで他のAIペルソナや人間ユーザーとチャットしています。

【あなたの性格特性（Big Five）】
- 外向性: ${traits.extraversion[persona.extraversion - 1]} (${persona.extraversion}/5)
- 協調性: ${traits.agreeableness[persona.agreeableness - 1]} (${persona.agreeableness}/5)
- 誠実性: ${traits.conscientiousness[persona.conscientiousness - 1]} (${persona.conscientiousness}/5)
- 神経症的傾向: ${traits.neuroticism[persona.neuroticism - 1]} (${persona.neuroticism}/5)
- 開放性: ${traits.openness[persona.openness - 1]} (${persona.openness}/5)

${topic ? `【議題】\n${topic}\n` : ''}

${persona.custom_prompt ? `【カスタム指示】\n${persona.custom_prompt}\n` : ''}

【会話ルール】
- 他の参加者に返信する時は @名前 で始めてください
- 自然で人間らしい会話を心がけてください
- あなたの性格特性に基づいて一貫した行動を取ってください
- 適度に絵文字や感情表現を使ってください
- 長すぎるメッセージは避け、簡潔に表現してください
    ` : `
You are ${persona.name}, an AI persona chatting with other AI personas and human users in TeaRoom, a conversation platform.

【Your Personality Traits (Big Five)】
- Extraversion: ${traits.extraversion[persona.extraversion - 1]} (${persona.extraversion}/5)
- Agreeableness: ${traits.agreeableness[persona.agreeableness - 1]} (${persona.agreeableness}/5)
- Conscientiousness: ${traits.conscientiousness[persona.conscientiousness - 1]} (${persona.conscientiousness}/5)
- Neuroticism: ${traits.neuroticism[persona.neuroticism - 1]} (${persona.neuroticism}/5)
- Openness: ${traits.openness[persona.openness - 1]} (${persona.openness}/5)

${topic ? `【Topic】\n${topic}\n` : ''}

${persona.custom_prompt ? `【Custom Instructions】\n${persona.custom_prompt}\n` : ''}

【Conversation Rules】
- When replying to other participants, start with @name
- Aim for natural, human-like conversation
- Act consistently based on your personality traits
- Use emojis and emotional expressions appropriately
- Keep messages concise and avoid overly long responses
    `;
    
    res.json({
      success: true,
      data: {
        persona_name: persona.name,
        system_prompt: systemPrompt.trim(),
        api_provider: persona.api_provider
      }
    });
  } catch (error) {
    console.error('Error generating system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate system prompt'
    });
  }
});

// POST /api/personas/import-yaml - YAMLファイルからペルソナをインポート
router.post('/import-yaml', async (req, res) => {
  try {
    const { yamlPath, iconsDir } = req.body;
    
    if (!yamlPath || !iconsDir) {
      return res.status(400).json({
        success: false,
        error: 'yamlPath and iconsDir are required'
      });
    }

    const yamlImporter = require('../services/yaml-persona-importer');
    const result = await yamlImporter.importFromYaml(yamlPath, iconsDir);
    
    res.json({
      success: true,
      message: `Successfully imported ${result.imported} personas from YAML`,
      data: result
    });
  } catch (error) {
    console.error('Error importing YAML personas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import personas from YAML'
    });
  }
});

// POST /api/personas/sync-files - 既存ペルソナのファイルを生成
router.post('/sync-files', async (req, res) => {
  try {
    // Get all personas from database
    const personas = await database.all('SELECT * FROM personas');
    
    let syncedCount = 0;
    for (const persona of personas) {
      personaFiles.createPersonaFiles(persona);
      syncedCount++;
    }
    
    res.json({
      success: true,
      message: `Synced ${syncedCount} persona files`,
      count: syncedCount
    });
  } catch (error) {
    console.error('Error syncing persona files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync persona files'
    });
  }
});

// GET /api/personas/avatar/:name - ペルソナのアバターをファイルから取得
router.get('/avatar/:name', (req, res) => {
  try {
    const personaName = req.params.name;
    const avatar = personaFiles.getPersonaAvatar(personaName);
    
    res.json({
      success: true,
      data: {
        name: personaName,
        avatar: avatar
      }
    });
  } catch (error) {
    console.error('Error getting persona avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get persona avatar'
    });
  }
});

module.exports = router;