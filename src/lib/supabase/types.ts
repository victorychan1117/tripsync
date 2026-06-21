// ════════════════════════════════════════════════════════════════════
// Supabase DB 타입 정의
// 실제 프로젝트에서는 `npm run db:generate-types` 로 자동 생성
// ════════════════════════════════════════════════════════════════════

export type UserPlan      = 'free' | 'premium';
export type MemberRole    = 'owner' | 'editor' | 'viewer';
export type TransportMode = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING';
export type MarkerCategory =
  | 'restaurant' | 'cafe'   | 'attraction' | 'lodging'
  | 'shopping'   | 'transport' | 'activity' | 'beach'
  | 'nature'     | 'culture'   | 'etc';

// ── Row 타입 (DB 조회 결과) ────────────────────────────────────────

export interface User {
  id:                string;
  auth_id:           string;
  provider:          string;
  provider_uid:      string | null;
  email:             string | null;
  email_verified:    boolean;
  nickname:          string;
  avatar_url:        string | null;
  locale:            string;
  plan:              UserPlan;
  plan_expires_at:   string | null;
  trip_count:        number;
  public_trip_count: number;
  created_at:        string;
  updated_at:        string;
  last_login_at:     string | null;
}

export interface FavoriteFolder {
  id:         number;
  user_id:    string;
  name:       string;
  color:      string;
  icon:       string;
  sort_order: number;
  created_at: string;
}

export interface Favorite {
  id:              number;
  user_id:         string;
  folder_id:       number | null;
  name:            string;
  address:         string | null;
  lat:             number;
  lng:             number;
  category:        MarkerCategory;
  memo:            string | null;
  phone:           string | null;
  website:         string | null;
  image_url:       string | null;
  google_place_id: string | null;
  kakao_place_id:  string | null;
  sort_order:      number;
  created_at:      string;
}

export interface Destination {
  id:            number;
  name_ko:       string;
  name_en:       string;
  slug:          string;
  country_code:  string;
  is_domestic:   boolean;
  lat:           number | null;
  lng:           number | null;
  agoda_city_id: number | null;
  booking_city:  string | null;
  klook_city_id: string | null;
}

export interface TripRoom {
  id:                string;
  owner_id:          string;
  destination_id:    number | null;
  title:             string;
  destination:       string | null;
  country_code:      string;
  is_domestic:       boolean;
  start_date:        string | null;
  end_date:          string | null;
  nights:            number;
  is_public:         boolean;
  is_locked:         boolean;
  member_count:      number;
  marker_count:      number;
  expires_at:        string;
  seo_title:         string | null;
  seo_description:   string | null;
  cover_image_url:   string | null;
  view_count:        number;
  fork_count:        number;
  created_at:        string;
  updated_at:        string;
}

export interface TripMember {
  id:              number;
  room_id:         string;
  user_id:         string | null;
  guest_session:   string | null;
  guest_nickname:  string | null;
  role:            MemberRole;
  cursor_color:    string;
  joined_at:       string;
  last_active_at:  string;
  is_online:       boolean;
}

export interface Marker {
  id:              number;
  room_id:         string;
  day_number:      number;
  order_index:     number;
  name:            string;
  address:         string | null;
  lat:             number;
  lng:             number;
  category:        MarkerCategory;
  stay_minutes:    number;
  visit_time:      string | null;
  memo:            string | null;
  booking_url:     string | null;
  image_url:       string | null;
  phone:           string | null;
  google_place_id: string | null;
  kakao_place_id:  string | null;
  added_by_user:   string | null;
  added_by_guest:  string | null;
  vote_up:         number;
  vote_down:       number;
  created_at:      string;
  updated_at:      string;
}

export interface RouteCache {
  id:           number;
  origin_lat:   number;
  origin_lng:   number;
  dest_lat:     number;
  dest_lng:     number;
  mode:         TransportMode;
  duration_sec: number;
  distance_m:   number;
  polyline:     string | null;
  summary:      string | null;
  api_provider: string;
  cached_at:    string;
  expires_at:   string;
}

// ── Insert / Update 타입 ────────────────────────────────────────────

export type MarkerInsert = Omit<Marker,
  'id' | 'vote_up' | 'vote_down' | 'created_at' | 'updated_at'
>;

export type MarkerUpdate = Partial<Omit<Marker,
  'id' | 'room_id' | 'created_at' | 'updated_at'
>>;

export type TripRoomInsert = Omit<TripRoom,
  'is_domestic' | 'nights' | 'member_count' | 'marker_count' |
  'view_count'  | 'fork_count' | 'created_at' | 'updated_at'
>;

// ── 실시간 이벤트 페이로드 타입 ────────────────────────────────────

export type RealtimeMarkerPayload =
  | { eventType: 'INSERT'; new: Marker; old: null }
  | { eventType: 'UPDATE'; new: Marker; old: Marker }
  | { eventType: 'DELETE'; new: null;   old: Marker };

export interface PresenceUser {
  userId:    string;
  nickname:  string;
  color:     string;
  joinedAt:  string;
  cursorLat?: number;
  cursorLng?: number;
}

// ── UI 전용 확장 타입 ─────────────────────────────────────────────

export interface MarkerWithRoute extends Marker {
  route?: RouteSegment | null;
}

export interface RouteSegment {
  durationSec:  number;
  distanceM:    number;
  durationText: string;
  distanceText: string;
  polyline:     string | null;
}

// ── 공개 여행 댓글 / 반응 ───────────────────────────────────────────

export type TripReactionType = 'like' | 'bookmark' | 'want_to_go' | 'beautiful';

export interface TripComment {
  id:         number;
  room_id:    string;
  user_id:    string;
  content:    string;
  is_hidden:  boolean;
  created_at: string;
  updated_at: string;
}

export type CommentReportReason = 'spam' | 'abuse' | 'privacy' | 'inappropriate' | 'other';

export interface CommentReport {
  id:          number;
  comment_id:  number;
  reporter_id: string;
  reason:      CommentReportReason;
  detail:      string | null;
  created_at:  string;
}

export interface TripReaction {
  id:            number;
  room_id:       string;
  user_id:       string;
  reaction_type: TripReactionType;
  created_at:    string;
}

export type NotificationType = 'trip_comment' | 'trip_reaction' | 'trip_saved' | 'trip_cloned';

export interface Notification {
  id:         number;
  user_id:    string;
  actor_id:   string | null;
  room_id:    string | null;
  type:       NotificationType;
  title:      string;
  message:    string | null;
  link_url:   string | null;
  is_read:    boolean;
  created_at: string;
}

// ── 저장한 여행 / 폴더 ───────────────────────────────────────────────

export interface SavedTripFolderRow {
  id:         number;
  user_id:    string;
  name:       string;
  emoji:      string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SavedTripRow {
  id:         number;
  user_id:    string;
  room_id:    string;
  folder_id:  number | null;
  created_at: string;
}
