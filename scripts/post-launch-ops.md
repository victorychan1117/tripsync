# 가보자고 — 배포 후 운영 안정화 & 사용자 테스트 준비

> **프로덕션 URL:** https://gabojago.app  
> **점검일:** 2026-06-21  
> **Git:** `main` @ `7e8435e`

---

## 1. 프로덕션 QA 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 홈 `/` | ✅ 200 | 히어로·푸터·CTA 정상 |
| 회원가입 `/signup` | ✅ 200 | 이메일 가입만 (OAuth 없음) |
| 로그인 `/login` | ✅ 200 | Google OAuth + 이메일 |
| **Kakao OAuth** | ⚠️ 미구현 | UI·코드에 Kakao 로그인 없음. Supabase에만 설정돼 있으면 동작 안 함 |
| OAuth callback `/auth/callback` | ✅ 코드 확인 | `redirect` 파라미터 전달 구현됨 |
| `/my/*` 미로그인 | ✅ 307 → `/login?redirect=...` | middleware 정상 |
| Explore `/explore` | ✅ 200 | **공개 여행 0건** — 빈 상태 UI |
| 공개 여행 `/t/[id]` | ✅ 404 (비공개/없음) | `/t/TRP-RFCM` 현재 404 (과거 로그에 200 있었음 → 비공개 전환 또는 삭제 추정) |
| robots.txt | ✅ 200 | Sitemap URL 정확 |
| sitemap.xml | ✅ 200 | 정적 4 URL만 (공개 여행·프로필 0) |
| OG image `/landing/hero.png` | ✅ 200 | 절대 URL: `https://gabojago.app/landing/hero.png` |
| canonical (explore) | ✅ | `https://gabojago.app/explore` |
| JSON-LD (explore) | ✅ | `application/ld+json` 포함 |
| 운영 페이지 | ✅ | `/privacy`, `/terms`, `/contact`, `/report` |
| Vercel runtime (2h) | ✅ | 500/401 에러 없음. GET 200 위주 |

### 로그인 필요 — 수동 QA (운영자 계정)

아래는 Vercel 로그상 200 확인됐으나, **본 문서 작성 시 자동 브라우저 테스트는 비로그인** 기준.

- [ ] 여행 생성 `/room/new`
- [ ] 장소 추가/수정/삭제 `/room/[id]/edit`
- [ ] Day 변경·드래그 재정렬
- [ ] 커버 이미지 업로드
- [ ] 공개/비공개 토글 (`set_trip_public` RPC — **Supabase 013·014 적용 필수**)
- [ ] 여행 삭제 (`delete_trip_room` RPC — **Supabase 015 적용 필수**)
- [ ] Explore 노출 (공개 후)
- [ ] 저장·저장 폴더 `/my/saved`
- [ ] 댓글/반응 `/t/[id]`
- [ ] 알림 `/my/notifications`
- [ ] 신고 (댓글 ⋯ 메뉴)
- [ ] 모바일 (375px) 레이아웃

---

## 2. 로그/에러 확인

### Vercel (최근 2h)

```
npx vercel logs https://gabojago.app --since 2h
```

- **Build:** 최신 Production 배포 Ready (52s)
- **Runtime:** `/`, `/explore`, `/my/trips`, `/room/.../edit`, `/t/TRP-RFCM` 등 200
- **에러:** RLS 500, OAuth callback 실패, Storage 업로드 실패 **로그 없음**

### Supabase (Dashboard에서 확인)

| 로그 | 확인 항목 |
|------|-----------|
| Auth | Google OAuth redirect URL에 `https://gabojago.app/auth/callback` 등록 |
| Database | 012~015 migration 적용 여부 |
| Storage | `trip-covers` bucket, 업로드 실패 |
| API | RLS policy violation (42501, PGRST301) |

### 브라우저 (수동)

- Console: Kakao Maps SDK key, Google Maps key 미설정 시 지도 페이지에서만 에러
- Network: `set_trip_public`, `delete_trip_room` RPC 404 → migration 미적용

---

## 3. OAuth / 지도 / Storage

| 항목 | 상태 |
|------|------|
| Google OAuth | UI 있음. Supabase Redirect URLs에 production callback 등록 필요 |
| Kakao OAuth | **코드 미구현** — login/signup에 Kakao 버튼 없음 |
| Kakao Maps | `NEXT_PUBLIC_KAKAO_MAP_KEY` + `KAKAO_REST_API_KEY` (Vercel env) |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` + `GOOGLE_MAPS_SERVER_KEY` |
| Storage `trip-covers` | migration 007. owner RLS via `is_trip_owner` |

**Supabase Auth Redirect URLs (필수):**

```
https://gabojago.app/auth/callback
http://localhost:3000/auth/callback
```

커스텀 도메인 연결 시 동일 경로 추가.

---

## 4. SEO / Search Console 준비

### 제출 URL

| 리소스 | URL |
|--------|-----|
| Sitemap | `https://gabojago.app/sitemap.xml` |
| robots | `https://gabojago.app/robots.txt` |

### Google Search Console 절차

1. 속성 추가: `https://gabojago.app`
2. 소유권 확인 (DNS TXT 또는 HTML)
3. Sitemap → 위 sitemap URL 제출
4. URL 검사 → 대표 URL 색인 요청

### 공유 테스트 URL (공개 여행 생성 후 교체)

현재 공개 여행 없음. 아래 템플릿 사용:

```
https://gabojago.app/
https://gabojago.app/explore
https://gabojago.app/t/{TRIP_ID}   ← 공개 후
https://gabojago.app/u/{USER_ID}   ← 공개 여행 있는 작성자
```

**카카오톡/디스코드 OG 테스트:** 공개 여행 URL + `/explore` + `/`

### SEO 체크리스트

- [x] robots.txt Allow/Disallow
- [x] sitemap.xml 동적 생성 (service role)
- [x] canonical — `APP_URL` 기반 (`gabojago.app` 설정됨)
- [x] OG image 절대 URL
- [x] JSON-LD (`/explore`, `/t/`, `/u/`)
- [ ] **공개 여행 URL이 sitemap에 포함** — 콘텐츠 필요

---

## 5. 초기 공개 여행 콘텐츠

### 현재 상태: ❌ 미충족

- Explore: **0건**
- Sitemap: 정적 4페이지만
- 최소 권장 11개 중 **0개**

### 권장 샘플 (운영자가 직접 생성)

| # | 유형 | 예시 제목 | 장소 | Day |
|---|------|-----------|------|-----|
| 1 | 국내 | 서울 2박 핵심 코스 | 5+ | 3 |
| 2 | 국내 | 제주 동쪽 해안 드라이브 | 5+ | 2 |
| 3 | 국내 | 부산 1박2일 맛집 투어 | 4+ | 2 |
| 4 | 일본 | 오사카 3박4일 | 6+ | 4 |
| 5 | 일본 | 교토 2박3일 | 5+ | 3 |
| 6 | 일본 | 도쿄 당일치기 | 4+ | 1 |
| 7 | 해외 | 방콕 4박5일 | 6+ | 5 |
| 8 | 해외 | 다낭 3박4일 | 5+ | 4 |
| 9 | 당일 | 수원/가평 당일치기 | 3+ | 1 |
| 10 | 2박+ | 제주 3박4일 가족여행 | 8+ | 4 |

**각 여행 체크:**

- [ ] 커버 이미지 업로드
- [ ] 장소 3개 이상, Day별 구성
- [ ] 제목에 도시·기간 키워드
- [ ] **공개 여행** 토글 ON
- [ ] 작성자 프로필 닉네임·아바타 자연스러움
- [ ] `/t/{id}` 비로그인 접근 확인
- [ ] Explore 노출 확인

---

## 6. 사용자 행동 분석 이벤트 설계

> **이번 작업:** 도구 미연동. 이벤트 스키마만 정의.

### 추천 도구 (Next.js App Router 기준)

| 우선순위 | 도구 | 이유 |
|----------|------|------|
| 1 | **Vercel Web Analytics** | 배포 환경과 동일, 페이지뷰·Core Web Vitals |
| 2 | **PostHog** (cloud) | 이벤트·퍼널·세션 리플레이, 무료 티어 |
| 3 | **Plausible** | GDPR 친화, 경량 |

소규모 MVP: **Vercel Analytics + PostHog** 조합 권장.

### 이벤트 정의

| 이벤트 | 트리거 위치 | properties |
|--------|-------------|------------|
| `sign_up_completed` | `signup/page.tsx` 가입 성공 | `method`: email |
| `login_completed` | `login/page.tsx` 로그인 성공 | `method`: google \| email |
| `trip_created` | `api/rooms/route.ts` POST 201 | `room_id`, `destination` |
| `place_added` | `RoomEditor` 장소 추가 성공 | `room_id`, `category`, `day` |
| `trip_published` | `TripDetailClient` 공개 토글 ON | `room_id` |
| `trip_unpublished` | 공개 토글 OFF | `room_id` |
| `explore_viewed` | `explore/page.tsx` mount (client) | `trip_count` |
| `public_trip_viewed` | `t/[tripId]/page.tsx` (server log or client) | `trip_id`, `destination` |
| `trip_saved` | `ExploreClient` / `TripPublicView` 저장 | `room_id` |
| `trip_unsaved` | 저장 해제 | `room_id` |
| `trip_cloned` | `clone_public_trip` RPC 성공 | `source_id`, `new_id` |
| `comment_created` | `TripComments` insert 성공 | `room_id` |
| `reaction_clicked` | `TripReactions` toggle | `room_id`, `type` |
| `cover_uploaded` | `uploadTripCover` 성공 | `room_id` |
| `trip_deleted` | `delete_trip_room` RPC 성공 | `room_id` |

### 구현 시 파일 (참고)

```
src/lib/analytics/events.ts    — 타입 + track() 래퍼
src/lib/analytics/track.ts     — PostHog/Vercel 분기
```

---

## 7. 실제 사용자 테스트 체크리스트

### 테스트 안내 (지인에게 전달)

> 가보자고 베타 테스트에 참여해주세요. (약 15~20분)  
> URL: https://gabojago.app  
> 불편한 점은 자유롭게 적어주세요.

### 시나리오

1. [ ] 회원가입 또는 Google 로그인
2. [ ] 새 여행 만들기 (제목·목적지·날짜)
3. [ ] 지도에서 장소 **3개 이상** 추가
4. [ ] Day 탭 전환·장소 순서 변경
5. [ ] (선택) 커버 이미지 업로드
6. [ ] 여행 **공개**로 전환
7. [ ] Explore에서 내 여행 또는 다른 여행 확인
8. [ ] 다른 공개 여행 **저장**
9. [ ] 저장 폴더 만들고 이동
10. [ ] 공개 여행에 **댓글·반응** 남기기
11. [ ] 모바일(또는 창 축소)에서 동일 흐름

### 피드백 수집 질문

1. 처음 봤을 때 **무슨 서비스인지** 바로 이해됐나요? (1~5)
2. 여행 만들기가 **쉬웠나요**? (1~5)
3. **지도 편집**이 불편하지 않았나요? (1~5)
4. **모바일**에서 쓰기 괜찮았나요? (1~5)
5. **저장/담기** 기능 의미가 이해됐나요? (1~5)
6. **다시 사용**할 의향이 있나요? (1~5)
7. 가장 불편했던 점 (자유 서술)
8. 버그·오류 (화면 캡처 + URL)

### Google Form 템플릿 필드

- 이름(선택), OS/브라우저, 위 1~8번, 테스트 일시

---

## 8. Supabase migration 확인

출시 전 **SQL Editor**에서 `scripts/verify-supabase.sql` 실행.

필수 migration: **001~015** (특히 012~015: RLS·공개토글·삭제)

---

## 9. Vercel 환경 변수 체크

| 변수 | Production |
|------|------------|
| `NEXT_PUBLIC_APP_URL` | `https://gabojago.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (sitemap용) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 지도 필수 |
| `KAKAO_REST_API_KEY` | 장소검색·경로 |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | 해외 지도 |

---

## 10. 다음 개선 우선순위

| 순위 | 항목 | 유형 |
|------|------|------|
| P0 | **공개 여행 샘플 8~11개** seed | 운영/콘텐츠 |
| P0 | Supabase **012~015** migration 적용 확인 | 인프라 |
| P1 | Google Search Console sitemap 제출 | SEO |
| P1 | Kakao OAuth UI 추가 (Supabase 설정돼 있다면) | 기능 — 별도 스프린트 |
| P2 | Vercel Analytics 또는 PostHog 연동 | 분석 |
| P3 | E2E 테스트 (Playwright) | QA 자동화 |
| P3 | `next/image` 마이그레이션 | 성능 |

---

## 11. 도메인 연결 (`gabojago.app`)

### Vercel

1. Project → **Settings → Domains** → `gabojago.app` (+ `www.gabojago.app` 권장) 추가
2. DNS: Vercel이 안내하는 A/CNAME 레코드 등록
3. **Environment Variables** (Production):
   ```
   NEXT_PUBLIC_APP_URL=https://gabojago.app
   ```
4. Redeploy

### Supabase Auth

| 설정 | 값 |
|------|-----|
| Site URL | `https://gabojago.app` |
| Redirect URLs | `https://gabojago.app/auth/callback` |
| | `http://localhost:3000/auth/callback` |

### Google OAuth (Cloud Console)

Authorized redirect URI: Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`)

---

## 부록: 수정한 파일 (이번 운영 작업)

**코드 버그 수정 없음** — 프로덕션 점검 + 운영 문서만 추가.

| 파일 | 내용 |
|------|------|
| `scripts/post-launch-ops.md` | 본 문서 (신규) |
