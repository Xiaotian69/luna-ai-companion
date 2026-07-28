CREATE TABLE companion_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  relationship_preset TEXT NOT NULL CHECK (relationship_preset IN ('girlfriend', 'boyfriend', 'friend', 'custom')),
  custom_relationship TEXT NOT NULL DEFAULT '',
  user_address TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL,
  speaking_style TEXT NOT NULL DEFAULT '',
  boundaries TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO companion_profile (
  id,
  display_name,
  avatar_url,
  relationship_preset,
  custom_relationship,
  user_address,
  personality,
  speaking_style,
  boundaries,
  created_at,
  updated_at
) VALUES (
  1,
  'Luna',
  '',
  'friend',
  '',
  '',
  '温柔、聪明、自然，略有成熟感，有自己的表达方式。',
  '闲聊简短自然，认真问题可以详细，不连续追问。',
  '明确自己是 AI，不编造现实身体或经历，不制造情感依赖。',
  '1970-01-01T00:00:00.000Z',
  '1970-01-01T00:00:00.000Z'
);
