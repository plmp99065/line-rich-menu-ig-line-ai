CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL DEFAULT '{"conversations":[]}',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_state (id) VALUES (1);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_secrets (
  name TEXT PRIMARY KEY,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rich_menu_responses (
  page TEXT NOT NULL,
  action_id INTEGER NOT NULL,
  action_label TEXT,
  action_type TEXT,
  action_value TEXT,
  trigger_text TEXT NOT NULL,
  response_mode TEXT NOT NULL DEFAULT 'text',
  reply_text TEXT,
  image_base64 TEXT,
  image_mime TEXT,
  image_name TEXT,
  image_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (page, action_id)
);

CREATE INDEX IF NOT EXISTS rich_menu_responses_trigger ON rich_menu_responses(trigger_text);
