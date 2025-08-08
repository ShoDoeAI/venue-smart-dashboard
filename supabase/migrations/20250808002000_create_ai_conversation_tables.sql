-- Create AI conversation tables if they don't exist

-- AI Conversations table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- AI Messages table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_venue_id ON ai_conversations(venue_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ai_conversations TO authenticated;
GRANT SELECT, INSERT ON ai_messages TO authenticated;
GRANT SELECT ON ai_conversations TO anon;
GRANT SELECT ON ai_messages TO anon;