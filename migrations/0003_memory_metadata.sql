ALTER TABLE memories ADD COLUMN category TEXT NOT NULL DEFAULT 'about_user'
  CHECK (category IN ('about_user', 'shared_experience', 'commitment', 'relationship'));
ALTER TABLE memories ADD COLUMN sensitivity TEXT NOT NULL DEFAULT 'normal'
  CHECK (sensitivity IN ('normal', 'personal', 'intimate', 'health', 'identity', 'payment'));
ALTER TABLE memories ADD COLUMN confidence REAL NOT NULL DEFAULT 0.5
  CHECK (confidence >= 0 AND confidence <= 1);
ALTER TABLE memories ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0
  CHECK (access_count >= 0 AND typeof(access_count) = 'integer');
ALTER TABLE memories ADD COLUMN last_accessed_at TEXT;
ALTER TABLE memories ADD COLUMN superseded_memory_id TEXT REFERENCES memories(id) ON DELETE SET NULL;
