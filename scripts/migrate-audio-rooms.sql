-- ============================================================
-- MosqueConnect: Audio Rooms (Spaces) Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Audio conference rooms
CREATE TABLE IF NOT EXISTS audio_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  topic           text,
  host_id         text NOT NULL,              -- Clerk userId
  host_name       text,
  host_avatar_url text,
  status          text NOT NULL DEFAULT 'scheduled', -- scheduled | live | ended
  stream_call_id  text UNIQUE,               -- Stream.io call id
  recording_url   text,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,
  max_speakers    int DEFAULT 10,
  is_recorded     boolean DEFAULT false,
  listener_count  int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Participants log
CREATE TABLE IF NOT EXISTS audio_room_participants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid REFERENCES audio_rooms(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  user_name  text,
  avatar_url text,
  role       text DEFAULT 'listener',        -- host | speaker | listener
  joined_at  timestamptz DEFAULT now(),
  left_at    timestamptz,
  UNIQUE(room_id, user_id)
);

-- Row Level Security
ALTER TABLE audio_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audio_rooms_read_all" ON audio_rooms
  FOR SELECT USING (true);

CREATE POLICY "audio_rooms_insert_auth" ON audio_rooms
  FOR INSERT WITH CHECK (true); -- any authenticated user via server-side API

CREATE POLICY "audio_rooms_update_host" ON audio_rooms
  FOR UPDATE USING (true); -- enforced at API layer (Clerk auth)

CREATE POLICY "audio_rooms_delete_host" ON audio_rooms
  FOR DELETE USING (true); -- enforced at API layer

ALTER TABLE audio_room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_read_all" ON audio_room_participants
  FOR SELECT USING (true);

CREATE POLICY "participants_write" ON audio_room_participants
  FOR ALL USING (true); -- enforced at API layer

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER audio_rooms_updated_at
  BEFORE UPDATE ON audio_rooms
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RPC for incrementing/decrementing listeners
CREATE OR REPLACE FUNCTION increment_audio_room_listener(target_room_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE audio_rooms
  SET listener_count = listener_count + 1
  WHERE id = target_room_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_audio_room_listener(target_room_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE audio_rooms
  SET listener_count = GREATEST(listener_count - 1, 0)
  WHERE id = target_room_id;
END;
$$ LANGUAGE plpgsql;
