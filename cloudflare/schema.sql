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

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  chunks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '已索引',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rich_menu_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  action_id INTEGER NOT NULL,
  destination TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rich_menu_clicks_time ON rich_menu_clicks(clicked_at);

CREATE TABLE IF NOT EXISTS message_attachments (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  name TEXT NOT NULL,
  base64 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO knowledge_documents (id, title, type, size_bytes, content, chunks) VALUES
('seed-stay-pricing', '住宿價目與基本規定', 'FAQ', 420, '住宿價目：65 籠每日 190 元，88 籠每日 250 元。自備飼料可折 20 元，自備墊料可再折 20 元。住宿滿 6 天贈送 1 天。實際空房必須由人工確認，不可由 AI 直接承諾。', 4),
('seed-transport', '接送服務與範圍', 'FAQ', 260, '雙北地區車程約 30 分鐘內可安排免費接送；超出服務範圍可能加收 100 元起。實際時間、路線與費用需由人工客服確認。', 3),
('seed-shipping', '商品配送說明', 'FAQ', 250, '商品訂單滿 100 元可安排出貨，滿 716 元免運。實際庫存、到貨時間與特殊材積費用需由人工客服確認。', 3),
('seed-handoff', '人工接手規則', 'FAQ', 300, '遇到空房確認、倉鼠生病或受傷、緊急狀況、退款、消費爭議，以及 AI 無法從知識庫確認的問題時，停止自動回覆並轉由人工客服處理。', 3);
