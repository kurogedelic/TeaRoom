const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class YamlPersonaImporter {
  constructor() {
    // Mapping from YAML personas to icon files
    this.iconMapping = {
      '水色': 'mercury_norm.png',
      '黒髪': 'darkhair_norm.png', 
      '眼鏡': 'glasses_norm.png',
      '金髪': 'blonde_norm.png'
    };

    // Personality traits mapping based on descriptions
    this.personalityMapping = {
      '水色': {
        extraversion: 4, // 直感的で感覚重視
        agreeableness: 5, // 純粋な情熱、すぐ影響される
        conscientiousness: 2, // 直感重視、理論より感覚
        neuroticism: 3, // 普通
        openness: 5 // 音集めが趣味、新しいものに興味
      },
      '黒髪': {
        extraversion: 2, // 完璧主義者、コレクター
        agreeableness: 3, // こだわりが強い
        conscientiousness: 5, // 完璧主義者
        neuroticism: 4, // コンプレックスあり
        openness: 3 // クラシック愛好、現代音楽理解できない
      },
      '眼鏡': {
        extraversion: 2, // 一見クール
        agreeableness: 3, // 実験的
        conscientiousness: 3, // 抜けている部分あり
        neuroticism: 2, // クール
        openness: 5 // 実験音楽、独自アプローチ
      },
      '金髪': {
        extraversion: 5, // 元気なムードメーカー
        agreeableness: 4, // ムードメーカー
        conscientiousness: 2, // 飽きっぽい、使いこなせない
        neuroticism: 1, // 元気
        openness: 4 // 最新ガジェット好き
      }
    };
  }

  async importFromYaml(yamlPath, iconsDir) {
    try {
      // Read YAML file
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const personas = yaml.load(yamlContent);

      const results = [];

      for (const [key, persona] of Object.entries(personas)) {
        console.log(`🎭 Processing persona: ${key} (${persona.名前})`);
        
        const result = await this.createPersonaFromYaml(key, persona, iconsDir);
        results.push(result);
      }

      return {
        success: true,
        imported: results.length,
        personas: results
      };

    } catch (error) {
      console.error('Error importing personas from YAML:', error);
      throw error;
    }
  }

  async createPersonaFromYaml(key, personaData, iconsDir) {
    const database = require('../database/database');
    const personaFiles = require('./persona-files');

    // Build persona object
    const personality = this.personalityMapping[key] || {
      extraversion: 3,
      agreeableness: 3, 
      conscientiousness: 3,
      neuroticism: 3,
      openness: 3
    };

    // Copy icon file to uploads directory
    const iconFile = this.iconMapping[key];
    const avatarValue = await this.copyIconFile(iconFile, iconsDir, personaData.名前);

    const personaObj = {
      name: personaData.名前,
      avatar_type: 'upload',
      avatar_value: avatarValue,
      gender: 'not_specified',
      api_provider: 'claude-code',
      extraversion: personality.extraversion,
      agreeableness: personality.agreeableness,
      conscientiousness: personality.conscientiousness,
      neuroticism: personality.neuroticism,
      openness: personality.openness,
      custom_prompt: this.buildCustomPrompt(personaData)
    };

    // Create persona in database
    const result = await database.createPersona(personaObj);
    const createdPersona = await database.getPersona(result.lastID);

    // Create persona files
    personaFiles.createPersonaFiles(createdPersona);

    console.log(`✅ Created persona: ${createdPersona.name} with avatar: ${avatarValue}`);
    
    return createdPersona;
  }

  async copyIconFile(iconFileName, iconsDir, personaName) {
    const fs = require('fs').promises;
    const path = require('path');

    const sourcePath = path.join(iconsDir, iconFileName);
    
    // Use Application Support uploads directory
    const dataPaths = require('../config/data-paths');
    const uploadsDir = dataPaths.getUploadsPath();
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(iconFileName);
    const timestamp = Date.now();
    const fileName = `${personaName.toLowerCase()}_${timestamp}${ext}`;
    const destPath = path.join(uploadsDir, fileName);

    // Copy file
    await fs.copyFile(sourcePath, destPath);
    
    console.log(`📁 Copied ${iconFileName} -> ${fileName} (${destPath})`);
    
    return fileName;
  }

  buildCustomPrompt(personaData) {
    const description = Array.isArray(personaData.説明) 
      ? personaData.説明.join('\n- ') 
      : personaData.説明;

    return `${personaData.キャッチフレーズ}

特徴:
- ${description}

口癖: "${personaData.口癖}"

あなたは音楽制作に関わる${personaData.名前}として、この性格と特徴を反映して会話してください。`;
  }
}

module.exports = new YamlPersonaImporter();