-- 0003_seed_sample_concerts.sql
-- 예시 콘서트 3개와 좌석/등급 데이터를 생성합니다.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE concerts
  ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
DECLARE
  concerts JSONB := jsonb_build_array(
    jsonb_build_object(
      'title', 'MaFia Summer Live 2025',
      'event_at', '2025-07-18T19:30:00+09',
      'venue', 'Seoul Olympic Hall',
      'description', '여름 밤을 뜨겁게 달굴 스페셜 라이브 세트'
    ),
    jsonb_build_object(
      'title', 'MaFia Acoustic Night',
      'event_at', '2025-08-02T18:00:00+09',
      'venue', 'Busan Cinema Center Outdoor Stage',
      'description', '어쿠스틱 편성으로 즐기는 몰입형 사운드'
    ),
    jsonb_build_object(
      'title', 'MaFia Arena Tour: Finale',
      'event_at', '2025-09-12T20:00:00+09',
      'venue', 'Incheon Songdo Convensia Hall A',
      'description', '투어 피날레를 장식하는 대규모 아레나 퍼포먼스'
    )
  );

  grade_template JSONB := jsonb_build_array(
    jsonb_build_object('code', 'SPECIAL', 'price', 250000, 'total', 48, 'zone', 'A', 'per_row', 8),
    jsonb_build_object('code', 'PREMIUM', 'price', 190000, 'total', 64, 'zone', 'B', 'per_row', 8),
    jsonb_build_object('code', 'ADVANCED', 'price', 170000, 'total', 128, 'zone', 'C', 'per_row', 8),
    jsonb_build_object('code', 'REGULAR', 'price', 140000, 'total', 80, 'zone', 'D', 'per_row', 8)
  );

  concert_item JSONB;
  grade_item JSONB;
  v_concert_id UUID;
  v_grade_id UUID;
  seat_total INTEGER;
  seats_per_row INTEGER;
  seat_idx INTEGER;
  row_label TEXT;
  seat_no INTEGER;
BEGIN
  FOR concert_item IN
    SELECT value
    FROM jsonb_array_elements(concerts)
  LOOP
    SELECT id
      INTO v_concert_id
      FROM concerts
     WHERE title = concert_item->>'title'
     LIMIT 1;

    IF v_concert_id IS NULL THEN
      v_concert_id := gen_random_uuid();

      INSERT INTO concerts (id, title, event_at, venue, description)
      VALUES (
        v_concert_id,
        concert_item->>'title',
        (concert_item->>'event_at')::timestamptz,
        concert_item->>'venue',
        concert_item->>'description'
      );
    END IF;

    FOR grade_item IN
      SELECT value
      FROM jsonb_array_elements(grade_template)
    LOOP
      SELECT id
        INTO v_grade_id
        FROM seat_grades
       WHERE seat_grades.concert_id = v_concert_id
         AND grade_code = (grade_item->>'code')::seat_grade
       LIMIT 1;

      IF v_grade_id IS NULL THEN
        v_grade_id := gen_random_uuid();

        INSERT INTO seat_grades (id, concert_id, grade_code, price_krw)
        VALUES (
          v_grade_id,
          v_concert_id,
          (grade_item->>'code')::seat_grade,
          (grade_item->>'price')::integer
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1
          FROM seats
         WHERE concert_id = v_concert_id
           AND grade_id = v_grade_id
      ) THEN
        seat_total := (grade_item->>'total')::integer;
        seats_per_row := (grade_item->>'per_row')::integer;

        FOR seat_idx IN 1..seat_total LOOP
          row_label := 'R' || lpad((((seat_idx - 1) / seats_per_row) + 1)::text, 2, '0');
          seat_no := ((seat_idx - 1) % seats_per_row) + 1;

          INSERT INTO seats (id, concert_id, grade_id, zone, row_label, seat_number)
          VALUES (
            gen_random_uuid(),
            v_concert_id,
            v_grade_id,
            (grade_item->>'zone')::char(1),
            row_label,
            seat_no
          );
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END
$$;

COMMIT;
