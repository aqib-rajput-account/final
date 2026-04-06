CREATE TABLE IF NOT EXISTS public.realtime_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_event_id ON public.realtime_events (event_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_channels ON public.realtime_events USING GIN (channels);
CREATE INDEX IF NOT EXISTS idx_realtime_events_actor_user_id ON public.realtime_events (actor_user_id, event_id DESC);
