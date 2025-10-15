-- 0002_mafia_reservation_core.sql
-- MaFia Reservation 핵심 스키마
-- Guidelines: idempotent, explicit types, updated_at trigger, RLS off

BEGIN;

-- 안전한 enum 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seat_grade') THEN
    CREATE TYPE seat_grade AS ENUM ('SPECIAL','PREMIUM','ADVANCED','REGULAR');
  END IF;
END$$;

-- updated_at 트리거 함수 (공용)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- concerts
CREATE TABLE IF NOT EXISTS concerts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  event_at TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_concerts_updated_at ON concerts;
CREATE TRIGGER trg_concerts_updated_at
BEFORE UPDATE ON concerts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- seat_grades
CREATE TABLE IF NOT EXISTS seat_grades (
  id UUID PRIMARY KEY,
  concert_id UUID NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  grade_code seat_grade NOT NULL,
  price_krw INTEGER NOT NULL CHECK (price_krw >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (concert_id, grade_code)
);

DROP TRIGGER IF EXISTS trg_seat_grades_updated_at ON seat_grades;
CREATE TRIGGER trg_seat_grades_updated_at
BEFORE UPDATE ON seat_grades
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- seats
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY,
  concert_id UUID NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES seat_grades(id) ON DELETE RESTRICT,
  zone CHAR(1) NOT NULL CHECK (zone IN ('A','B','C','D')),
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL CHECK (seat_number > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (concert_id, zone, row_label, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seats_concert_grade ON seats (concert_id, grade_id);

DROP TRIGGER IF EXISTS trg_seats_updated_at ON seats;
CREATE TRIGGER trg_seats_updated_at
BEFORE UPDATE ON seats
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- seat_holds (임시 점유, TTL)
CREATE TABLE IF NOT EXISTS seat_holds (
  id UUID PRIMARY KEY,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  hold_token TEXT NOT NULL UNIQUE,
  session_hint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_seat ON seat_holds (seat_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON seat_holds (expires_at);

DROP TRIGGER IF EXISTS trg_seat_holds_updated_at ON seat_holds;
CREATE TRIGGER trg_seat_holds_updated_at
BEFORE UPDATE ON seat_holds
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- reservations (비회원)
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY,
  reserver_name TEXT NOT NULL,
  phone_number TEXT NOT NULL CHECK (phone_number ~ '^[0-9]{10,11}$'),
  password_hash TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations (phone_number, created_at DESC);

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- reservation_seats (좌석 배정, 좌석당 단일 예약)
CREATE TABLE IF NOT EXISTS reservation_seats (
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (reservation_id, seat_id),
  UNIQUE (seat_id)
);

-- RLS 비활성화 (명시)
ALTER TABLE concerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE seat_grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE seats DISABLE ROW LEVEL SECURITY;
ALTER TABLE seat_holds DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_seats DISABLE ROW LEVEL SECURITY;

COMMIT;

-- 만료 홀드 정리 예시
-- DELETE FROM seat_holds WHERE expires_at < NOW();


