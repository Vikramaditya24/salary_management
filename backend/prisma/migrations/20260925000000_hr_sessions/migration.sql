CREATE TABLE "hr_sessions" (
  "token_hash" CHAR(64) NOT NULL PRIMARY KEY,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "hr_sessions_expires_at_idx" ON "hr_sessions" ("expires_at");
