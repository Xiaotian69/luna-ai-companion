CREATE INDEX IF NOT EXISTS idx_memories_active_retrieval
ON memories(importance DESC, updated_at DESC, access_count DESC, id ASC)
WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_memories_active_unnormalized
ON memories(created_at, id)
WHERE is_active = 1 AND normalized_content IS NULL;
