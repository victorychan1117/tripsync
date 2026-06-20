-- ════════════════════════════════════════════════════════════════════
-- 005_saved_trips.sql
-- 공개 여행 저장 기능 — Supabase Dashboard SQL Editor 에 붙여넣기
-- ════════════════════════════════════════════════════════════════════
--
-- 기존 favorites 테이블은 장소(lat/lng 필수) 저장용이므로
-- 여행 저장에는 별도 테이블을 사용.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saved_trips (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id    VARCHAR(12)  NOT NULL REFERENCES trip_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ  DEFAULT now(),
  CONSTRAINT saved_trips_unique UNIQUE (user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_trips_user ON saved_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trips_room ON saved_trips(room_id);

ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 insert / select / delete
CREATE POLICY "saved_trips_own" ON saved_trips
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
