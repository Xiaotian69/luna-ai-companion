CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'interrupted'))
);

CREATE TABLE conversation_summaries (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  covered_until_message_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  importance REAL NOT NULL CHECK (importance >= 0 AND importance <= 1),
  source_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  source_message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE relationship_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  familiarity REAL NOT NULL DEFAULT 0,
  current_mood TEXT NOT NULL DEFAULT '平静',
  recent_events TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE usage_daily (
  usage_date TEXT PRIMARY KEY,
  chat_calls INTEGER NOT NULL DEFAULT 0,
  tts_calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE rate_limits (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at, id);
CREATE INDEX idx_memories_active_importance ON memories(is_active, importance DESC);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

INSERT INTO relationship_state (id, updated_at) VALUES (1, '1970-01-01T00:00:00.000Z');
