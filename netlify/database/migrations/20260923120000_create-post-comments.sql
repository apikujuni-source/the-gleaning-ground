CREATE TABLE post_comments (
  id SERIAL PRIMARY KEY,
  post_path TEXT NOT NULL,
  post_title TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX post_comments_post_path_created_at_idx ON post_comments (post_path, created_at);
CREATE INDEX post_comments_ip_hash_created_at_idx ON post_comments (ip_hash, created_at);
