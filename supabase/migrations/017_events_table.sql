-- ════════════════════════════════════════════════════════════════════
-- 017_events_table.sql
-- 사용자 행동 이벤트 로그 테이블
-- 클라이언트 직접 insert 불가 — /api/events (service role)만 사용
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT         NOT NULL
                CHECK (event_name IN (
                  'public_trip_viewed',
                  'public_trip_saved',
                  'public_trip_unsaved',
                  'public_trip_cloned',
                  'public_trip_shared',
                  'affiliate_clicked',
                  'explore_card_clicked'
                )),
  room_id     VARCHAR(12)  REFERENCES trip_rooms(id) ON DELETE SET NULL,
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_name_at  ON events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_room      ON events(room_id, event_name);
CREATE INDEX IF NOT EXISTS idx_events_user_at   ON events(user_id, created_at DESC);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 클라이언트 접근 완전 차단 — service role만 insert/select 가능
-- (RLS 정책 없음 = 모든 일반 클라이언트 접근 차단)
