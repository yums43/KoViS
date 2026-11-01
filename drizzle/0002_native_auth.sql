-- KoVIS native authentication: additive migration, does not modify existing Sites identities.
-- Apply only after reviewing against the production D1 database.
CREATE TABLE IF NOT EXISTS auth_credentials (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algorithm TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  email_verified_at TEXT,
  password_changed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id, expires_at);
CREATE TABLE IF NOT EXISTS auth_one_time_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify_email','reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE INDEX IF NOT EXISTS auth_one_time_user ON auth_one_time_tokens(user_id, purpose);
