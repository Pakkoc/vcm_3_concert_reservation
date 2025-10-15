# MaFia Reservation – 데이터베이스 설계 최종본

본 문서는 확정된 유저플로우에 명시된 데이터만으로 구성한 데이터플로우와 PostgreSQL 최소 스키마를 정리합니다.

---

## 1) 데이터플로우(요약)

- 메인 목록 조회
  - READ: `concerts` 기본정보
  - READ: 등급/좌석 집계(총좌석=좌석 수, 신청인원=예약좌석 수) → 카드의 신청인원/수용인원 계산

- 콘서트 상세
  - READ: `concerts`
  - READ: `seat_grades`(가격), 등급별 좌석 집계(총좌석, 남은좌석=총 − 예약)

- 좌석 선택
  - READ: `seats`(zone/row/seat_no, grade)
  - READ: 좌석 상태(예약 여부=`reservation_seats` 존재, 홀드 여부=`seat_holds`의 유효 hold)
  - WRITE: 좌석 선택 시 `seat_holds` 삽입/갱신(좌석별 TTL)

- 예약 정보 입력(체크아웃)
  - TX(원자성)
    - READ FOR UPDATE: 선택 좌석/홀드 유효성 검증
    - WRITE: `reservations` 생성(예약자명, 전화번호, 비밀번호 해시, 합계금액)
    - WRITE: `reservation_seats` 다건 삽입(좌석 배정, 좌석당 단일 예약 보장)
    - DELETE: 관련 `seat_holds` 제거

- 예약 완료
  - READ: `reservations` + `reservation_seats` + `seats` + `seat_grades` → 예약 요약 표시

- 예약 조회(목록)
  - READ: 전화번호 + 비밀번호 검증 후 `reservations` 목록(최신순)

- 예약 상세 조회
  - READ: `reservations` + `reservation_seats` + `seats` + `seat_grades` 상세

- 공통/유지관리
  - DELETE: 만료된 `seat_holds` 정리(스케줄러)
  - 제약: `reservation_seats.seat_id` UNIQUE로 이중 배정 방지

---

## 2) 엔터티 스키마(요약)

### concerts
- `id` UUID PK
- `title` TEXT
- `event_at` TIMESTAMPTZ
- `venue` TEXT
- `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ

### seat_grades
- `id` UUID PK
- `concert_id` UUID FK → `concerts(id)` ON DELETE CASCADE
- `grade_code` ENUM('SPECIAL','PREMIUM','ADVANCED','REGULAR')
- `price_krw` INTEGER(≥0)
- UNIQUE(`concert_id`, `grade_code`)

### seats
- `id` UUID PK
- `concert_id` UUID FK → `concerts(id)` ON DELETE CASCADE
- `grade_id` UUID FK → `seat_grades(id)` ON DELETE RESTRICT
- `zone` CHAR(1) ∈ {A,B,C,D}
- `row_label` TEXT
- `seat_number` INTEGER(>0)
- UNIQUE(`concert_id`, `zone`, `row_label`, `seat_number`)
- INDEX(`concert_id`, `grade_id`)

### seat_holds (임시 점유, TTL)
- `id` UUID PK
- `seat_id` UUID FK → `seats(id)` ON DELETE CASCADE
- `hold_token` TEXT UNIQUE
- `session_hint` TEXT (옵션)
- `expires_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- INDEX(`seat_id`), INDEX(`expires_at`)

### reservations (비회원 예약)
- `id` UUID PK
- `reserver_name` TEXT
- `phone_number` TEXT(숫자만 10~11) CHECK
- `password_hash` TEXT
- `total_amount` INTEGER(≥0)
- `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- INDEX(`phone_number`, `created_at`)

### reservation_seats (좌석 배정)
- `reservation_id` UUID FK → `reservations(id)` ON DELETE CASCADE
- `seat_id` UUID FK → `seats(id)` ON DELETE RESTRICT
- PK(`reservation_id`, `seat_id`)
- UNIQUE(`seat_id`)  — 좌석 이중 배정 방지

---

## 3) 무결성 및 트랜잭션 가이드
- 체크아웃 트랜잭션(원자성)
  1) 선택 좌석 집합에 대해 `FOR UPDATE`로 최신 상태/경합 검사
  2) `reservations` INSERT → 생성 ID 확보
  3) `reservation_seats` 일괄 INSERT(UNIQUE(seat_id)로 경합 차단)
  4) 관련 `seat_holds` DELETE
  5) COMMIT

- 집계 쿼리(개념)
  - 등급별 총좌석:
    - `SELECT grade_id, COUNT(*) FROM seats WHERE concert_id=$1 GROUP BY grade_id;`
  - 등급별 예약좌석:
    - `SELECT s.grade_id, COUNT(*) FROM reservation_seats rs JOIN seats s ON s.id=rs.seat_id WHERE s.concert_id=$1 GROUP BY s.grade_id;`
  - 만료 홀드 정리:
    - `DELETE FROM seat_holds WHERE expires_at < NOW();`

- 보안/정책
  - 전화번호는 숫자만(10~11) CHECK
  - 비밀번호 원문 저장 금지(해시만 저장)
  - RLS는 사용하지 않음(명시적으로 비활성화)

---

본 스키마는 유저플로우에 명시된 데이터로만 구성된 최소 모델입니다. 필요 시 확장(결제/취소/관리자 기능 등)이 가능합니다.
