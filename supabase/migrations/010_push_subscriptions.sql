-- 010_push_subscriptions.sql
-- Table to store Web Push subscriptions for background notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions"
ON push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
