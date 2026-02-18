-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(120),
  role          VARCHAR(20)  NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('ADMIN', 'MANAGER', 'MEMBER')),
  password_hash VARCHAR(255),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_email UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                     UUID PRIMARY KEY,
  user_id                UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash             VARCHAR(255) NOT NULL,
  expires_at             TIMESTAMPTZ  NOT NULL,
  revoked_at             TIMESTAMPTZ,
  replaced_by_token_hash VARCHAR(255),
  user_agent             TEXT,
  ip                     VARCHAR(64),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at);

-- MAGIC LINK TOKENS
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id          UUID PRIMARY KEY,
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  email       VARCHAR(255) NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_magic_link_token_hash UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_magic_link_email ON magic_link_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON magic_link_tokens(expires_at);

-- PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash)
);

-- OAUTH ACCOUNTS
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id          UUID PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    VARCHAR(50)  NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_oauth_provider_provider_id UNIQUE (provider, provider_id)
);

-- BLOG POSTS
CREATE TABLE IF NOT EXISTS blog_posts (
  id                  UUID PRIMARY KEY,
  title               VARCHAR(255) NOT NULL,
  slug                VARCHAR(300),
  status              VARCHAR(20)  NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  excerpt             TEXT         NOT NULL DEFAULT '',
  content             TEXT         NOT NULL,
  content_format      VARCHAR(20)  NOT NULL DEFAULT 'markdown'
    CHECK (content_format IN ('markdown', 'html')),
  author_id           UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  featured_image_url  VARCHAR(500),
  featured_image_alt  VARCHAR(255),
  is_featured         BOOLEAN      NOT NULL DEFAULT false,
  views               INTEGER      NOT NULL DEFAULT 0,
  tags                TEXT         NOT NULL DEFAULT '',
  categories          TEXT         NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_blog_posts_slug UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created ON blog_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON blog_posts(views DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
