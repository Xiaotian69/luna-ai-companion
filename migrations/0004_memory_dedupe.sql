ALTER TABLE memories ADD COLUMN normalized_content TEXT;

CREATE UNIQUE INDEX idx_memories_active_normalized_content
  ON memories(normalized_content)
  WHERE is_active = 1 AND normalized_content IS NOT NULL;
