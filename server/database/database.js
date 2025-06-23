const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const dataPaths = require('../utils/data-paths');

class Database {
  constructor(dbPath = null) {
    this.dbPath = dbPath || dataPaths.getDatabasePath();
    this.db = null;
    console.log(`🗄️ Database will be stored at: ${this.dbPath}`);
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', this.dbPath);
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  async initialize() {
    if (!this.db) {
      await this.connect();
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error initializing database:', err.message);
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Persona methods
  async createPersona(data) {
    const sql = `
      INSERT INTO personas (name, avatar_type, avatar_value, gender, api_provider, 
                           extraversion, agreeableness, conscientiousness, neuroticism, openness, 
                           custom_prompt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.name, data.avatar_type, data.avatar_value, data.gender, data.api_provider,
      data.extraversion, data.agreeableness, data.conscientiousness, data.neuroticism, data.openness,
      data.custom_prompt
    ];
    return this.run(sql, params);
  }

  async getPersona(id) {
    const sql = 'SELECT * FROM personas WHERE id = ?';
    return this.get(sql, [id]);
  }

  async getPersonas() {
    const sql = 'SELECT * FROM personas ORDER BY created_at DESC';
    return this.all(sql);
  }

  async updatePersona(id, data) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    
    values.push(id);
    
    const sql = `UPDATE personas SET ${fields.join(', ')} WHERE id = ?`;
    return this.run(sql, values);
  }

  async deletePersona(id) {
    const sql = 'DELETE FROM personas WHERE id = ?';
    return this.run(sql, [id]);
  }

  // Room methods
  async createRoom(data) {
    const sql = `
      INSERT INTO rooms (name, topic, language)
      VALUES (?, ?, ?)
    `;
    const params = [data.name, data.topic, data.language || 'ja'];
    return this.run(sql, params);
  }

  async getRoom(id) {
    const sql = 'SELECT * FROM rooms WHERE id = ?';
    return this.get(sql, [id]);
  }

  async getRooms() {
    const sql = 'SELECT * FROM rooms ORDER BY created_at DESC';
    return this.all(sql);
  }

  async deleteRoom(id) {
    const sql = 'DELETE FROM rooms WHERE id = ?';
    return this.run(sql, [id]);
  }

  // Room-Persona relationship methods
  async addPersonasToRoom(roomId, personaIds) {
    for (const personaId of personaIds) {
      await this.run(`
        INSERT OR IGNORE INTO room_personas (room_id, persona_id)
        VALUES (?, ?)
      `, [roomId, personaId]);
    }
  }

  async getRoomPersonas(roomId) {
    const sql = `
      SELECT p.* FROM personas p
      INNER JOIN room_personas rp ON p.id = rp.persona_id
      WHERE rp.room_id = ?
      ORDER BY rp.joined_at ASC
    `;
    return this.all(sql, [roomId]);
  }

  // Message methods
  async createMessage(roomId, senderType, senderName, content, senderId = null, replyToId = null) {
    const sql = `
      INSERT INTO messages (room_id, sender_id, sender_type, sender_name, content, reply_to_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [roomId, senderId, senderType, senderName, content, replyToId];
    return this.run(sql, params);
  }

  async getMessages(roomId, limit = 100, offset = 0) {
    const sql = `
      SELECT m.*, 
             p.avatar_type, p.avatar_value,
             reply_to.content as reply_to_content,
             reply_to.sender_name as reply_to_sender_name
      FROM messages m
      LEFT JOIN personas p ON m.sender_id = p.id
      LEFT JOIN messages reply_to ON m.reply_to_id = reply_to.id
      WHERE m.room_id = ?
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    return this.all(sql, [roomId, limit, offset]);
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) console.error('Error closing database:', err);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;