const express = require('express');
const database = require('../database/database');
const router = express.Router();

// GET /api/rooms - ルーム一覧取得
router.get('/', async (req, res) => {
  try {
    const rooms = await database.getRooms();
    
    // 各ルームの参加ペルソナ情報も取得
    for (const room of rooms) {
      room.personas = await database.getRoomPersonas(room.id);
    }
    
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
});

// GET /api/rooms/:id - 特定ルーム取得
router.get('/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }
    
    const room = await database.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // 参加ペルソナ情報を取得
    room.personas = await database.getRoomPersonas(roomId);
    
    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room'
    });
  }
});

// POST /api/rooms - 新しいルーム作成
router.post('/', async (req, res) => {
  try {
    const { name, topic, language = 'ja', personas = [] } = req.body;
    
    // バリデーション
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required'
      });
    }
    
    if (!['ja', 'en'].includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Language must be "ja" or "en"'
      });
    }
    
    if (personas.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 personas are required'
      });
    }
    
    // ペルソナの存在確認
    for (const personaId of personas) {
      const persona = await database.getPersona(personaId);
      if (!persona) {
        return res.status(400).json({
          success: false,
          error: `Persona with ID ${personaId} not found`
        });
      }
    }
    
    // ルーム作成
    const roomData = {
      name: name.trim(),
      topic: topic?.trim(),
      language
    };
    const result = await database.createRoom(roomData);
    const roomId = result.lastID;
    
    // ペルソナをルームに追加
    await database.addPersonasToRoom(roomId, personas);
    
    // 作成されたルーム情報を取得
    const room = await database.getRoom(roomId);
    room.personas = await database.getRoomPersonas(roomId);
    
    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        error: 'Room name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
});

// PUT /api/rooms/:id - ルーム更新
router.put('/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { name, topic, language } = req.body;
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }
    
    // ルームの存在確認
    const existingRoom = await database.getRoom(roomId);
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // 更新データの準備
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (topic !== undefined) updates.topic = topic?.trim();
    if (language !== undefined) {
      if (!['ja', 'en'].includes(language)) {
        return res.status(400).json({
          success: false,
          error: 'Language must be "ja" or "en"'
        });
      }
      updates.language = language;
    }
    
    // 更新実行
    await database.updateRoom(roomId, updates);
    
    // 更新後のルーム情報を取得
    const room = await database.getRoom(roomId);
    room.personas = await database.getRoomPersonas(roomId);
    
    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error updating room:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        error: 'Room name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update room'
    });
  }
});

// DELETE /api/rooms/:id - ルーム削除（論理削除）
router.delete('/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }
    
    // ルームの存在確認
    const existingRoom = await database.getRoom(roomId);
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // 論理削除実行
    await database.deleteRoom(roomId);
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
});

// POST /api/rooms/:id/personas/:personaId - ペルソナをルームに追加
router.post('/:id/personas/:personaId', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const personaId = parseInt(req.params.personaId);
    
    if (isNaN(roomId) || isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID or persona ID'
      });
    }
    
    // ルームとペルソナの存在確認
    const room = await database.getRoom(roomId);
    const persona = await database.getPersona(personaId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found'
      });
    }
    
    // ペルソナをルームに追加
    await database.addPersonaToRoom(roomId, personaId);
    
    res.json({
      success: true,
      message: 'Persona added to room successfully'
    });
  } catch (error) {
    console.error('Error adding persona to room:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        success: false,
        error: 'Persona is already in this room'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add persona to room'
    });
  }
});

// DELETE /api/rooms/:id/personas/:personaId - ペルソナをルームから削除
router.delete('/:id/personas/:personaId', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const personaId = parseInt(req.params.personaId);
    
    if (isNaN(roomId) || isNaN(personaId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID or persona ID'
      });
    }
    
    // ペルソナをルームから削除
    const result = await database.removePersonaFromRoom(roomId, personaId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Persona not found in this room'
      });
    }
    
    res.json({
      success: true,
      message: 'Persona removed from room successfully'
    });
  } catch (error) {
    console.error('Error removing persona from room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove persona from room'
    });
  }
});

// POST /api/rooms/:roomId/auto-chat - 自動チャットトリガー
router.post('/:roomId/auto-chat', async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const { persona_id, trigger_type = 'auto' } = req.body;
  
  try {
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }
    
    // ルームの存在確認
    const room = await database.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // ペルソナの存在確認
    const persona = await database.getPersona(persona_id);
    if (!persona) {
      return res.status(400).json({
        success: false,
        error: 'Persona not found'
      });
    }
    
    // ペルソナがそのルームに参加しているか確認
    const roomPersonas = await database.getRoomPersonas(roomId);
    const isPersonaInRoom = roomPersonas.some(p => p.id === persona_id);
    
    if (!isPersonaInRoom) {
      return res.status(400).json({
        success: false,
        error: 'Persona is not in this room'
      });
    }
    
    // Claude SDKを使ってAI応答を生成
    const claudeSDK = require('../services/claude-sdk');
    const io = req.app.get('io');
    
    // 非同期でAI応答を処理（レスポンスはすぐに返す）
    setImmediate(async () => {
      try {
        await claudeSDK.processMessage({
          roomId,
          content: `[${trigger_type}_trigger]`, // 自動トリガーマーカー
          sender_type: 'system',
          sender_name: 'AutoChat',
          trigger_persona_id: persona_id
        }, io);
      } catch (error) {
        console.error('Auto chat processing error:', error);
      }
    });
    
    res.json({
      success: true,
      message: 'Auto chat triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering auto chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger auto chat'
    });
  }
});

module.exports = router;