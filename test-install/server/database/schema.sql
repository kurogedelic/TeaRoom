-- TeaRoom 2.0 Database Schema
-- SQLite Database for Modern Chat Interface

-- Rooms（会話ルーム）
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  topic TEXT,
  language TEXT DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  UNIQUE(name)
);

-- Personas（AIペルソナ）
CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  avatar_type TEXT DEFAULT 'emoji' CHECK (avatar_type IN ('emoji', 'upload')),
  avatar_value TEXT, -- emoji character or filename
  gender TEXT,
  api_provider TEXT DEFAULT 'claude-code' CHECK (api_provider IN ('claude-code', 'openai')),
  extraversion INTEGER DEFAULT 3 CHECK (extraversion >= 1 AND extraversion <= 5),
  agreeableness INTEGER DEFAULT 3 CHECK (agreeableness >= 1 AND agreeableness <= 5),
  conscientiousness INTEGER DEFAULT 3 CHECK (conscientiousness >= 1 AND conscientiousness <= 5),
  neuroticism INTEGER DEFAULT 3 CHECK (neuroticism >= 1 AND neuroticism <= 5),
  openness INTEGER DEFAULT 3 CHECK (openness >= 1 AND openness <= 5),
  custom_prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Room_Personas（ルーム参加者）
CREATE TABLE IF NOT EXISTS room_personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, persona_id)
);

-- Messages（メッセージ）
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES personas(id) ON DELETE SET NULL, -- NULL for user messages
  sender_type TEXT DEFAULT 'persona' CHECK (sender_type IN ('persona', 'user')),
  sender_name TEXT NOT NULL, -- For display purposes, especially for user messages
  content TEXT NOT NULL,
  reply_to_id INTEGER REFERENCES messages(id), -- @リプライ用
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'sent' CHECK (status IN ('typing', 'sent', 'error'))
);

-- Settings（ユーザー設定）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_room_personas_room_id ON room_personas(room_id);
CREATE INDEX IF NOT EXISTS idx_room_personas_persona_id ON room_personas(persona_id);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('language', 'ja'),
  ('theme', 'auto'),
  ('notifications', 'true'),
  ('max_messages_per_room', '1000');

-- Create triggers to update updated_at automatically
CREATE TRIGGER IF NOT EXISTS update_rooms_updated_at 
  AFTER UPDATE ON rooms 
  BEGIN 
    UPDATE rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_personas_updated_at 
  AFTER UPDATE ON personas 
  BEGIN 
    UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_settings_updated_at 
  AFTER UPDATE ON settings 
  BEGIN 
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
  END;