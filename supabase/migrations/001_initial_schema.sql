-- ════════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- TripSync 초기 스키마 — Supabase(PostgreSQL 15+) 실행용
-- ════════════════════════════════════════════════════════════════════

-- PostGIS 확장 (공간 인덱스용)
CREATE EXTENSION IF NOT EXISTS postgis;
-- pg_cron (정기 캐시 정리용)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── ENUM 타입 ────────────────────────────────────────────────────────
CREATE TYPE user_plan       AS ENUM ('free', 'premium');
CREATE TYPE member_role     AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE transport_mode  AS ENUM ('DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING');
CREATE TYPE marker_category AS ENUM (
  'restaurant', 'cafe', 'attraction', 'lodging',
  'shopping', 'transport', 'activity', 'beach', 'nature', 'culture', 'etc'
);

-- ── updated_at 자동 갱신 트리거 함수 ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Supabase Auth 연동 (auth.users 1:1)
  auth_id          UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 소셜 로그인 메타
  provider         VARCHAR(20)  NOT NULL DEFAULT 'email',
  provider_uid     VARCHAR(255),
  email            VARCHAR(255) UNIQUE,
  email_verified   BOOLEAN      DEFAULT FALSE,
  -- 프로필
  nickname         VARCHAR(50)  NOT NULL,
  avatar_url       TEXT,
  locale           VARCHAR(10)  DEFAULT 'ko',
  -- 플랜
  plan             user_plan    DEFAULT 'free',
  plan_expires_at  TIMESTAMPTZ,
  -- 비정규화 통계 캐시
  trip_count        INT DEFAULT 0,
  public_trip_count INT DEFAULT 0,
  -- 타임스탬프
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  last_login_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email   ON users(email) WHERE email IS NOT NULL;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- FAVORITE FOLDERS (개인 즐겨찾기 폴더)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE favorite_folders (
  id         SERIAL PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(7)   DEFAULT '#6366F1',
  icon       VARCHAR(50)  DEFAULT 'folder',
  sort_order SMALLINT     DEFAULT 0,
  created_at TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX idx_fav_folders_user ON favorite_folders(user_id);

-- ════════════════════════════════════════════════════════════════════
-- FAVORITES (개인 즐겨찾기 장소)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE favorites (
  id               BIGSERIAL   PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id        INT         REFERENCES favorite_folders(id) ON DELETE SET NULL,
  -- 장소 정보
  name             VARCHAR(200) NOT NULL,
  address          TEXT,
  lat              FLOAT8       NOT NULL,
  lng              FLOAT8       NOT NULL,
  category         marker_category DEFAULT 'etc',
  -- 부가 정보
  memo             TEXT,
  phone            VARCHAR(30),
  website          TEXT,
  image_url        TEXT,
  -- 외부 API 참조 ID
  google_place_id  VARCHAR(255),
  kakao_place_id   VARCHAR(100),
  -- 정렬
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT favorites_lat_range CHECK (lat BETWEEN -90  AND 90),
  CONSTRAINT favorites_lng_range CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT favorites_unique_place UNIQUE (user_id, google_place_id)
);

CREATE INDEX idx_favorites_user_folder ON favorites(user_id, folder_id);
-- 공간 인덱스 (반경 N km 내 즐겨찾기 검색용)
CREATE INDEX idx_favorites_geo ON favorites
  USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326));

-- ════════════════════════════════════════════════════════════════════
-- DESTINATIONS (목적지 마스터 — SEO 슬러그 관리)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE destinations (
  id               SERIAL       PRIMARY KEY,
  name_ko          VARCHAR(100) NOT NULL,
  name_en          VARCHAR(100) NOT NULL,
  slug             VARCHAR(100) UNIQUE NOT NULL,  -- "jeju", "tokyo"
  country_code     CHAR(2),                        -- "KR", "JP"
  is_domestic      BOOLEAN GENERATED ALWAYS AS (country_code = 'KR') STORED,
  -- 지도 중심 좌표
  lat              FLOAT8,
  lng              FLOAT8,
  -- 제휴 파트너 ID
  agoda_city_id    INT,
  booking_city     VARCHAR(100),
  klook_city_id    VARCHAR(100)
);

CREATE INDEX idx_destinations_slug ON destinations(slug);
CREATE INDEX idx_destinations_country ON destinations(country_code);

-- ════════════════════════════════════════════════════════════════════
-- TRIP_ROOMS (팀 협업 방)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE trip_rooms (
  -- 초대 코드가 PK (단톡방 공유용: "TRP-8K2M")
  id               VARCHAR(12)  PRIMARY KEY,
  owner_id         UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  destination_id   INT          REFERENCES destinations(id) ON DELETE SET NULL,
  -- 여행 기본 정보
  title            VARCHAR(200) NOT NULL,
  destination      VARCHAR(100),
  country_code     CHAR(2)      DEFAULT 'KR',
  is_domestic      BOOLEAN GENERATED ALWAYS AS (country_code = 'KR') STORED,
  start_date       DATE,
  end_date         DATE,
  nights           SMALLINT GENERATED ALWAYS AS (
    CASE WHEN end_date IS NOT NULL AND start_date IS NOT NULL
    THEN (end_date - start_date)::SMALLINT ELSE 0 END
  ) STORED,
  -- 공개/잠금
  is_public        BOOLEAN      DEFAULT FALSE,
  is_locked        BOOLEAN      DEFAULT FALSE,
  -- 비정규화 집계
  member_count     SMALLINT     DEFAULT 1,
  marker_count     SMALLINT     DEFAULT 0,
  -- 만료 (무료: 90일, 프리미엄: 무제한)
  expires_at       TIMESTAMPTZ  DEFAULT (now() + INTERVAL '90 days'),
  -- SEO
  seo_title        TEXT,
  seo_description  TEXT,
  cover_image_url  TEXT,
  view_count       INT          DEFAULT 0,
  fork_count       INT          DEFAULT 0,
  -- 타임스탬프
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now(),

  CONSTRAINT trip_rooms_date_check CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_trip_rooms_owner  ON trip_rooms(owner_id);
CREATE INDEX idx_trip_rooms_public ON trip_rooms(is_public, destination, nights)
  WHERE is_public = TRUE;

CREATE TRIGGER trip_rooms_updated_at
  BEFORE UPDATE ON trip_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- TRIP_MEMBERS (방 ↔ 유저 매핑)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE trip_members (
  id               BIGSERIAL    PRIMARY KEY,
  room_id          VARCHAR(12)  NOT NULL REFERENCES trip_rooms(id) ON DELETE CASCADE,
  -- 회원 OR 게스트 (둘 중 하나만)
  user_id          UUID         REFERENCES users(id) ON DELETE CASCADE,
  guest_session    VARCHAR(100),
  guest_nickname   VARCHAR(50),
  -- 권한 & UI
  role             member_role  DEFAULT 'editor',
  cursor_color     VARCHAR(7)   DEFAULT '#6366F1',
  -- 활동 추적
  joined_at        TIMESTAMPTZ  DEFAULT now(),
  last_active_at   TIMESTAMPTZ  DEFAULT now(),
  is_online        BOOLEAN      DEFAULT FALSE,

  CONSTRAINT trip_members_identity CHECK (
    (user_id IS NOT NULL AND guest_session IS NULL) OR
    (user_id IS NULL     AND guest_session IS NOT NULL)
  ),
  CONSTRAINT trip_members_unique_user  UNIQUE (room_id, user_id),
  CONSTRAINT trip_members_unique_guest UNIQUE (room_id, guest_session)
);

CREATE INDEX idx_trip_members_room   ON trip_members(room_id);
CREATE INDEX idx_trip_members_user   ON trip_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_trip_members_online ON trip_members(room_id, is_online) WHERE is_online = TRUE;

-- ════════════════════════════════════════════════════════════════════
-- MARKERS (방 내 지도 마커 — 핵심 테이블)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE markers (
  id               BIGSERIAL    PRIMARY KEY,
  room_id          VARCHAR(12)  NOT NULL REFERENCES trip_rooms(id) ON DELETE CASCADE,
  -- Day 분류
  day_number       SMALLINT     NOT NULL DEFAULT 1,
  -- 부동소수점 순서 (중간값 삽입으로 재번호 매기기 최소화)
  order_index      FLOAT8       NOT NULL,
  -- 장소 정보
  name             VARCHAR(200) NOT NULL,
  address          TEXT,
  lat              FLOAT8       NOT NULL,
  lng              FLOAT8       NOT NULL,
  category         marker_category DEFAULT 'etc',
  -- 체류 정보
  stay_minutes     SMALLINT     DEFAULT 60,
  visit_time       TIME,
  -- 부가 정보
  memo             TEXT,
  booking_url      TEXT,
  image_url        TEXT,
  phone            VARCHAR(30),
  -- 외부 API 참조
  google_place_id  VARCHAR(255),
  kakao_place_id   VARCHAR(100),
  -- 작성자 (회원 OR 게스트)
  added_by_user    UUID         REFERENCES users(id) ON DELETE SET NULL,
  added_by_guest   VARCHAR(50),
  -- 투표 집계 (비정규화)
  vote_up          SMALLINT     DEFAULT 0,
  vote_down        SMALLINT     DEFAULT 0,
  -- 타임스탬프
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now(),

  CONSTRAINT markers_lat_range    CHECK (lat BETWEEN -90  AND 90),
  CONSTRAINT markers_lng_range    CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT markers_day_positive CHECK (day_number  > 0),
  CONSTRAINT markers_order_pos    CHECK (order_index > 0)
);

-- 방 내 순서 정렬 쿼리 최적화 (가장 빈번한 쿼리)
CREATE INDEX idx_markers_room_order ON markers(room_id, day_number, order_index);
-- 공간 인덱스 (근처 장소 검색)
CREATE INDEX idx_markers_geo ON markers
  USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326));

CREATE TRIGGER markers_updated_at
  BEFORE UPDATE ON markers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- PLACE_VOTES (장소 투표)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE place_votes (
  id         BIGSERIAL   PRIMARY KEY,
  marker_id  BIGINT      NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  guest_session VARCHAR(100),
  vote       SMALLINT    NOT NULL CHECK (vote IN (1, -1)),

  CONSTRAINT place_votes_unique_user  UNIQUE (marker_id, user_id),
  CONSTRAINT place_votes_unique_guest UNIQUE (marker_id, guest_session)
);

-- ════════════════════════════════════════════════════════════════════
-- PLACE_COMMENTS (장소 댓글 — 팀 협업)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE place_comments (
  id            BIGSERIAL   PRIMARY KEY,
  marker_id     BIGINT      NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  guest_nickname VARCHAR(50),
  content       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_place_comments_marker ON place_comments(marker_id);

-- ════════════════════════════════════════════════════════════════════
-- ROUTE_CACHE (Directions API 응답 캐시 — 비용 절감 핵심)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE route_cache (
  id           BIGSERIAL      PRIMARY KEY,
  -- 좌표 (소수점 4자리 반올림 ≈ 11m 오차 허용)
  origin_lat   NUMERIC(8,4)   NOT NULL,
  origin_lng   NUMERIC(9,4)   NOT NULL,
  dest_lat     NUMERIC(8,4)   NOT NULL,
  dest_lng     NUMERIC(9,4)   NOT NULL,
  mode         transport_mode NOT NULL,
  -- 결과
  duration_sec INT            NOT NULL,
  distance_m   INT            NOT NULL,
  polyline     TEXT,
  summary      TEXT,
  -- 캐시 메타
  api_provider VARCHAR(20)    NOT NULL DEFAULT 'google',
  cached_at    TIMESTAMPTZ    DEFAULT now(),
  expires_at   TIMESTAMPTZ    DEFAULT (now() + INTERVAL '7 days'),

  CONSTRAINT route_cache_unique UNIQUE (origin_lat, origin_lng, dest_lat, dest_lng, mode)
);

CREATE INDEX idx_route_cache_coords
  ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng, mode);

-- 만료 캐시 자동 삭제 (매일 새벽 3시)
SELECT cron.schedule(
  'cleanup-route-cache',
  '0 3 * * *',
  'DELETE FROM route_cache WHERE expires_at < now()'
);

-- ════════════════════════════════════════════════════════════════════
-- AFFILIATE_CLICKS (제휴 클릭 추적)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE affiliate_clicks (
  id          BIGSERIAL    PRIMARY KEY,
  room_id     VARCHAR(12)  REFERENCES trip_rooms(id) ON DELETE SET NULL,
  marker_id   BIGINT       REFERENCES markers(id) ON DELETE SET NULL,
  partner     VARCHAR(50)  NOT NULL,
  destination VARCHAR(100),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(100),
  ip_hash     VARCHAR(64),
  clicked_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_partner ON affiliate_clicks(partner, clicked_at);

-- ════════════════════════════════════════════════════════════════════
-- SEO_PAGES (Sitemap 추적)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE seo_pages (
  id            SERIAL       PRIMARY KEY,
  room_id       VARCHAR(12)  REFERENCES trip_rooms(id) ON DELETE CASCADE,
  url_path      TEXT         UNIQUE NOT NULL,
  last_modified TIMESTAMPTZ  DEFAULT now(),
  priority      NUMERIC(2,1) DEFAULT 0.8,
  change_freq   VARCHAR(20)  DEFAULT 'weekly',
  indexed       BOOLEAN      DEFAULT FALSE,
  index_requested_at TIMESTAMPTZ
);

CREATE INDEX idx_seo_pages_indexed ON seo_pages(indexed, last_modified);
