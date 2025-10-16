## 콘서트 예약 시스템 – 최소 모듈화 설계(plan)

본 문서는 `docs/001~008/spec.md`와 `docs/state-management.md`를 기준으로, AGENTS.md의 디렉터리/라이브러리 규칙을 준수하여 FE/BE 최소 모듈 구조를 정의합니다.

### 개요(Modules Overview)

- Backend(Hono + Supabase)
  - `src/features/concerts/backend/route.ts`: 콘서트 목록/상세/좌석 요약/좌석맵 API 라우터(`/api/concerts`)
  - `src/features/concerts/backend/service.ts`: 콘서트/좌석 등급/좌석 집계/맵 조회
  - `src/features/concerts/backend/schema.ts`: 목록 파라미터, 상세 파라미터, 응답 스키마(zod)
  - `src/features/concerts/backend/error.ts`: 에러 코드/메시지 상수

  - `src/features/holds/backend/route.ts`: 좌석 홀드 생성/해제/검증(`/api/holds`)
  - `src/features/holds/backend/service.ts`: 홀드 TTL/경합 검사/검증 로직
  - `src/features/holds/backend/schema.ts`: 요청/응답 스키마
  - `src/features/holds/backend/error.ts`: 에러 코드

  - `src/features/reservations/backend/route.ts`: 예약 생성/상세/조회(`/api/reservations`)
  - `src/features/reservations/backend/service.ts`: 트랜잭션 처리(좌석 잠금/검증/생성/정산)
  - `src/features/reservations/backend/schema.ts`: 요청/응답 스키마
  - `src/features/reservations/backend/error.ts`: 에러 코드

- Frontend(Next.js App Router, Client Components)
  - `src/features/concerts/hooks/useConcertListQuery.ts`: 목록 조회 훅(React Query + `@/lib/remote/api-client`)
  - `src/features/concerts/hooks/useConcertDetailQuery.ts`: 상세/좌석 요약 훅
  - `src/features/concerts/hooks/useSeatMapQuery.ts`: 좌석맵 조회 훅

  - `src/features/holds/hooks/useHoldMutation.ts`: 홀드 생성/해제/검증 mutate 훅

  - `src/features/reservations/hooks/useCreateReservation.ts`: 예약 생성 mutate 훅
  - `src/features/reservations/hooks/useReservationSummaryQuery.ts`: 예약 요약 조회 훅
  - `src/features/reservations/hooks/useReservationLookup.ts`: 전화/비번 기반 조회 훅

  - Context + Reducer(상태관리; docs/state-management.md 설계 반영)
    - `src/features/app/context/app-ui-context.tsx`: 전역 로딩/에러/현재 콘서트
    - `src/features/concerts/context/concert-list-context.tsx`
    - `src/features/concerts/context/concert-detail-context.tsx`
    - `src/features/reservations/context/reservation-session-context.tsx`
    - `src/features/reservations/context/reservation-lookup-context.tsx`

  - DTO 재노출
    - `src/features/concerts/lib/dto.ts`: 백엔드 zod 스키마 타입 재수출
    - `src/features/holds/lib/dto.ts`
    - `src/features/reservations/lib/dto.ts`

- Shared
  - `src/backend/http/response.ts`: success/failure/respond(이미 존재)
  - `src/lib/remote/api-client.ts`: axios 클라이언트(이미 존재)
  - `src/constants/auth.ts`, `src/constants/env.ts` 등 기존 상수 규칙 준수


### Diagram(Modules & Flow)

```mermaid
flowchart TB
  subgraph FE[Frontend]
    subgraph Ctx[Contexts]
      AUC[AppUiContext]
      CLC[ConcertListContext]
      CDC[ConcertDetailContext]
      RSC[ReservationSessionContext]
      RLC[ReservationLookupContext]
    end

    subgraph Hooks
      HL[useConcertListQuery]
      HD[useConcertDetailQuery]
      HM[useSeatMapQuery]
      HH[useHoldMutation]
      HR1[useCreateReservation]
      HR2[useReservationSummaryQuery]
      HR3[useReservationLookup]
    end

    API[@/lib/remote/api-client]
  end

  subgraph BE[Backend (Hono)]
    CR[concerts/backend/route.ts]
    CS[concerts/backend/service.ts]
    HRt[holds/backend/route.ts]
    HS[holds/backend/service.ts]
    RR[reservations/backend/route.ts]
    RS[reservations/backend/service.ts]
  end

  subgraph DB[Supabase]
    T1[(concerts)]
    T2[(seat_grades)]
    T3[(seats)]
    T4[(seat_holds)]
    T5[(reservations)]
    T6[(reservation_seats)]
  end

  CLC --> HL --> API --> CR
  CDC --> HD --> API --> CR
  CDC --> HM --> API --> CR

  RSC --> HH --> API --> HRt
  RSC --> HR1 --> API --> RR
  RLC --> HR3 --> API --> RR
  RSC --> HR2 --> API --> RR

  CR --- CS --> T1
  CS --> T2
  CS --> T3
  HRt --- HS --> T4
  RR --- RS --> T5
  RS --> T6
```


### Implementation Plan

#### 0) 공통 규칙
- 모든 Hono 라우트는 `/api` prefix 사용(예: `app.get('/api/concerts', ...)`).
- 클라이언트는 `@/lib/remote/api-client`를 통해서만 호출.
- 서버 상태: `@tanstack/react-query`; UI/세션 상태: Context + useReducer(docs/state-management.md).
- 스키마: `zod` 사용. 경로 필드는 상대 경로 허용(`z.string()` 사용).
- 컴포넌트는 전부 Client Component("use client") 유지.

---

#### 1) Concerts Feature
- Backend
  - Routes(`src/features/concerts/backend/route.ts`)
    - GET `/api/concerts?sort&filter&page` – 목록 + 집계(001)
    - GET `/api/concerts/:id` – 상세(002)
    - GET `/api/concerts/:id/seats/summary` – 등급별 잔여/전체(002)
    - GET `/api/concerts/:id/seats/map` – 좌석맵(003, 프리패치 지원)
  - Service(`service.ts`)
    - 목록/상세/요약/맵 쿼리. 좌석/등급 조인 및 집계. 비정상 값 보정.
  - Schema(`schema.ts`)
    - `ListParams`, `ListItem`, `Detail`, `SeatGradeSummary`, `SeatMapCell` 등 zod 정의
  - Error(`error.ts`)
    - `INVALID_CONCERT_ID`, `CONCERT_NOT_FOUND`, `SEAT_MAP_NOT_AVAILABLE` 등

- Frontend
  - Hooks
    - `useConcertListQuery(filter)` – 키: `['concerts', filter]`
    - `useConcertDetailQuery(id)` – 키: `['concert', id]`
    - `useSeatMapQuery(id)` – 키: `['seatMap', id]`
  - Context
    - `ConcertListContext`: 필터 상태/리패치
    - `ConcertDetailContext`: 강조 등급/리패치

- QA Sheet(프레젠테이션)
  - 목록 빈 상태/오류/로딩 스켈레톤 표시 여부
  - 정렬/필터 변경 시 이전 요청 취소 및 최신 반영
  - 상세 CTA 활성 조건(매진/종료/취소 처리)
  - 게이지/색상/가격 표기 정확성, 시간대 정규화

- Unit Tests(비즈 로직)
  - 집계 로직: 등급별 `remaining = total - reserved` 보정 테스트
  - 맵 변환: DB rows → `SeatMapCell[]` 직렬화 일관성
  - 정렬/필터 적용 SQL 파라미터 바인딩 검증(리포지토리 모킹)

---

#### 2) Holds Feature
- Backend
  - Routes(`src/features/holds/backend/route.ts`)
    - POST `/api/holds` – 좌석 홀드 생성 {seatId, sessionHint}
    - DELETE `/api/holds/:token` – 홀드 해제
    - POST `/api/holds/verify` – 진행 전 좌석 검증 {seatIds[]}
  - Service(`service.ts`)
    - 경합 검사(예약/홀드 중복), TTL 생성, 만료 처리, 검증
  - Schema(`schema.ts`)
    - `CreateHoldInput`, `CreateHoldOutput({holdToken, expiresAt})`, `VerifyInput`, `VerifyOutput`
  - Error(`error.ts`)
    - `SEAT_CONFLICT`, `HOLD_EXPIRED`, `HOLD_NOT_FOUND`

- Frontend
  - Hooks
    - `useHoldMutation()` – create/release/verify 메서드 제공
  - Context
    - `ReservationSessionContext`: 선택 좌석/경고/검증 연계

- QA Sheet(프레젠테이션)
  - 4석 초과 시 경고 및 추가 불가
  - 경합(409) 시 충돌 좌석만 해제되고 안내 노출
  - 홀드 만료 타이머 UI 반영(선택 유도)

- Unit Tests(비즈 로직)
  - 경합 검출: 같은 seatId 중복 홀드/예약 시 실패
  - TTL: `expiresAt` 기준 만료 판단
  - 검증: 입력 seatIds subset 검증, 누락/만료 좌석 반환

---

#### 3) Reservations Feature
- Backend
  - Routes(`src/features/reservations/backend/route.ts`)
    - POST `/api/reservations` – 예약 생성 {name, phone, pin4Hash, seatIds, holdToken}
    - GET `/api/reservations/:id` – 예약 요약(완료/상세)
    - POST `/api/reservations/lookup` – 전화/비번 기반 목록 조회(006)
  - Service(`service.ts`)
    - 트랜잭션: 좌석 잠금(SELECT FOR UPDATE), 검증, 예약/배정 insert, 홀드 삭제
    - 총 금액 계산, 마스킹된 표시용 전화번호 생성
  - Schema(`schema.ts`)
    - `CreateReservationInput`, `ReservationSummary`, `LookupInput`, `LookupListItem`
  - Error(`error.ts`)
    - `VALIDATION_FAILED(422)`, `HOLD_CONFLICT(409)`, `IDEMPOTENT_REPLAY`, `RESERVATION_NOT_FOUND`

- Frontend
  - Hooks
    - `useCreateReservation()`
    - `useReservationSummaryQuery(id)`
    - `useReservationLookup()`
  - Context
    - `ReservationSessionContext`: 폼/제출/결과
    - `ReservationLookupContext`: 조회 입력/결과

- QA Sheet(프레젠테이션)
  - 입력 검증(이름/전화 10~11자리/핀 4자리)과 에러 메시지 매핑
  - 성공 후 완료 페이지 전환 및 요약 표시(민감정보 비노출)
  - 조회 실패 메시지 일반화(존재 유무 노출 금지)

- Unit Tests(비즈 로직)
  - 금액 합산 정확성(좌석 가격 합)
  - 트랜잭션 경합 시 롤백 보장
  - 조회 정렬(created_at DESC)과 페이징 일관성

---

#### 4) Context + Reducer(연결)
- 파일 생성(스켈레톤):
  - `src/features/app/context/app-ui-context.tsx`
  - `src/features/concerts/context/concert-list-context.tsx`
  - `src/features/concerts/context/concert-detail-context.tsx`
  - `src/features/reservations/context/reservation-session-context.tsx`
  - `src/features/reservations/context/reservation-lookup-context.tsx`
- 원칙: docs/state-management.md의 액션/상태/노출 API 그대로 반영. 서버 데이터는 훅을 통해 주입.

QA Sheet(상태/UX)
- 전역 로딩 인디케이터/오류 토스트 동작 확인
- 선택 좌석 변화 시 n석/합계/버튼 활성 파생값 반영
- 실시간 전이(APPLY_RESERVED_TRANSITION) 시 선택 목록 자동 정합

---

#### 5) 통합 및 라우팅
- `src/backend/hono/app.ts`에 `registerConcertRoutes`, `registerHoldRoutes`, `registerReservationRoutes` 연결
- Next.js 라우터 `src/app/api/[[...hono]]/route.ts`는 그대로(`handle(createHonoApp())`)

---

#### 6) 테스트 전략 요약
- 비즈니스 로직: service.ts를 단위 테스트(쿼리 계층 모킹).
- 프레젠테이션: QA 시트 시나리오별 스냅샷/DOM 상태 검증(React Testing Library) – 선택 사항.
- 통신: `api-client` 오류 메시지 추출(`extractApiErrorMessage`) 통합 확인.

---

#### 7) 작업 순서 제안(Incremental)
1) Concerts Feature(목록/상세/요약/맵) – BE → hooks → 컨텍스트 → UI 연결
2) Holds Feature(홀드 create/verify/release) – 경합 처리
3) Reservations Feature(생성/요약/조회) – 트랜잭션/검증/마스킹
4) Context 스켈레톤 배치 및 페이지 연동(메인→상세→좌석→정보→완료)
5) 에러/오프라인 공통(008) – 전역 인터셉터 정책 적용(리트라이/멱등 키)


