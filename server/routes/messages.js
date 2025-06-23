const express = require('express');
const database = require('../database/database');
const router = express.Router();

// GET /api/rooms/:roomId/search - メッセージ検索
router.get('/:roomId/search', async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const { q: query, limit = 50 } = req.query;
  
  try {
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    // Search messages containing the query
    const messages = await database.all(`
      SELECT m.*, 
             p.avatar_type, p.avatar_value,
             reply_to.content as reply_to_content,
             reply_to.sender_name as reply_to_sender_name
      FROM messages m
      LEFT JOIN personas p ON m.sender_id = p.id
      LEFT JOIN messages reply_to ON m.reply_to_id = reply_to.id
      WHERE m.room_id = ? AND m.content LIKE ?
      ORDER BY m.timestamp DESC
      LIMIT ?
    `, [roomId, `%${query.trim()}%`, parseInt(limit)]);
    
    res.json({
      success: true,
      data: {
        room_id: roomId,
        query: query.trim(),
        messages: messages,
        count: messages.length
      }
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages'
    });
  }
});

// GET /api/rooms/:roomId/messages - ルームのメッセージ一覧取得
router.get('/:roomId/messages', async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
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
    
    // メッセージ取得（新しい順）
    console.log(`📝 Fetching messages for room ${roomId}, limit: ${limit}, offset: ${offset}`);
    const messages = await database.getMessages(roomId, limit, offset);
    console.log(`✅ Found ${messages.length} messages for room ${roomId}`);
    
    // ルームのペルソナ情報も取得
    const roomPersonas = await database.getRoomPersonas(roomId);
    
    // 時系列順に並び替え（古い順）
    messages.reverse();
    
    res.json({
      success: true,
      data: {
        room_id: roomId,
        messages: messages,
        personas: roomPersonas,
        pagination: {
          limit,
          offset,
          has_more: messages.length === limit
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      roomId,
      limit,
      offset
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/rooms/:roomId/messages - 新しいメッセージ送信
router.post('/:roomId/messages', async (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const { content, sender_type = 'user', sender_name = 'User', sender_id, reply_to_id } = req.body;
  
  try {
    
    if (isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room ID'
      });
    }
    
    // バリデーション
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }
    
    if (!['user', 'persona'].includes(sender_type)) {
      return res.status(400).json({
        success: false,
        error: 'Sender type must be "user" or "persona"'
      });
    }
    
    if (!sender_name || sender_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sender name is required'
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
    
    // ペルソナメッセージの場合、ペルソナの存在確認
    if (sender_type === 'persona' && sender_id) {
      const persona = await database.getPersona(sender_id);
      if (!persona) {
        return res.status(400).json({
          success: false,
          error: 'Persona not found'
        });
      }
    }
    
    // リプライ先メッセージの存在確認
    if (reply_to_id) {
      const replyToMessage = await database.get(
        'SELECT id FROM messages WHERE id = ? AND room_id = ?',
        [reply_to_id, roomId]
      );
      if (!replyToMessage) {
        return res.status(400).json({
          success: false,
          error: 'Reply target message not found'
        });
      }
    }
    
    // メッセージ作成
    const result = await database.createMessage(
      roomId,
      sender_type,
      sender_name.trim(),
      content.trim(),
      sender_id || null,
      reply_to_id || null
    );
    
    // 作成されたメッセージ情報を取得
    const message = await database.get(`
      SELECT m.*, 
             p.avatar_type, p.avatar_value,
             reply_to.content as reply_to_content,
             reply_to.sender_name as reply_to_sender_name
      FROM messages m
      LEFT JOIN personas p ON m.sender_id = p.id
      LEFT JOIN messages reply_to ON m.reply_to_id = reply_to.id
      WHERE m.id = ?
    `, [result.lastID]);
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create message'
    });
  }
});

// PUT /api/messages/:messageId/status - メッセージステータス更新
router.put('/:messageId/status', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const { status } = req.body;
    
    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID'
      });
    }
    
    if (!['typing', 'sent', 'error'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be "typing", "sent", or "error"'
      });
    }
    
    // メッセージの存在確認
    const existingMessage = await database.get('SELECT id FROM messages WHERE id = ?', [messageId]);
    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    // ステータス更新
    await database.updateMessageStatus(messageId, status);
    
    res.json({
      success: true,
      message: 'Message status updated successfully'
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message status'
    });
  }
});

// GET /api/messages/parse-mentions - メンション解析（ユーティリティ）
router.post('/parse-mentions', async (req, res) => {
  try {
    const { content, room_id } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    // @メンションの正規表現パターン
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(content)) !== null) {
      const mentionedName = match[1];
      mentions.push({
        name: mentionedName,
        start: match.index,
        end: match.index + match[0].length,
        full_match: match[0]
      });
    }
    
    // ルームが指定されている場合、そのルームのペルソナ名と照合
    let validMentions = mentions;
    if (room_id) {
      const roomId = parseInt(room_id);
      if (!isNaN(roomId)) {
        const roomPersonas = await database.getRoomPersonas(roomId);
        const personaNames = roomPersonas.map(p => p.name.toLowerCase());
        
        validMentions = mentions.filter(mention => 
          personaNames.includes(mention.name.toLowerCase()) || 
          mention.name.toLowerCase() === 'user'
        );
      }
    }
    
    res.json({
      success: true,
      data: {
        original_content: content,
        mentions: mentions,
        valid_mentions: validMentions,
        has_mentions: mentions.length > 0
      }
    });
  } catch (error) {
    console.error('Error parsing mentions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse mentions'
    });
  }
});

module.exports = router;