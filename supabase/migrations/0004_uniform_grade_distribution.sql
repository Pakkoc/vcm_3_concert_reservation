-- 0004_uniform_grade_distribution.sql
-- 목적: 각 콘서트의 A/B/C/D 모든 구역에 등급(SPECIAL, PREMIUM, ADVANCED, REGULAR) 좌석을 균등 분배
-- 특징: idempotent(재실행해도 동일 결과), 좌석 수가 4로 나누어 떨어지지 않는 경우 균등에 가깝게 분배
-- 주의: seats의 고유 제약( concert_id, zone, row_label, seat_number )을 고려해 row_label을 등급 접미사로 재생성하여 충돌 방지

BEGIN;

-- 좌석을 등급별로 순번(rn)을 매긴 뒤, rn 구간을 A/B/C/D에 균등 배치
-- 이후 동일 등급/구역 내에서 rn을 다시 매겨 row_label을 Rxx-<grade_initial> 형태로 재부여

WITH grade_totals AS (
  SELECT sg.id AS grade_id,
         sg.grade_code::text AS grade_code,
         COUNT(s.*) AS total
  FROM seat_grades sg
  JOIN seats s ON s.grade_id = sg.id
  GROUP BY sg.id, sg.grade_code
),
seat_rn AS (
  SELECT s.id,
         s.grade_id,
         s.row_label,
         s.seat_number,
         gt.grade_code,
         gt.total,
         GREATEST(1, CEIL(gt.total::numeric / 4))::int AS per_zone,
         ROW_NUMBER() OVER (PARTITION BY s.grade_id ORDER BY s.row_label, s.seat_number, s.id) AS rn
  FROM seats s
  JOIN grade_totals gt ON gt.grade_id = s.grade_id
),
new_zone AS (
  SELECT id,
         grade_id,
         grade_code,
         CASE ((rn - 1) / per_zone % 4)
           WHEN 0 THEN 'A'
           WHEN 1 THEN 'B'
           WHEN 2 THEN 'C'
           ELSE 'D'
         END::char(1) AS zone
  FROM seat_rn
),
zone_rn AS (
  SELECT s.id,
         nz.zone,
         nz.grade_code,
         nz.grade_id,
         ROW_NUMBER() OVER (PARTITION BY nz.grade_id, nz.zone ORDER BY s.seat_number, s.id) AS rn_zone
  FROM seats s
  JOIN new_zone nz ON nz.id = s.id
)
-- per-row 좌석 수(8)를 기준으로 seat_number도 재산정하여 유니크 제약 충돌 방지
UPDATE seats t
SET zone = zr.zone,
    row_label = 'R' || LPAD(CEIL(zr.rn_zone::numeric / 8)::text, 2, '0') || '-' || LEFT(zr.grade_code, 1),
    seat_number = ((zr.rn_zone - 1) % 8) + 1
FROM zone_rn zr
WHERE t.id = zr.id;

COMMIT;


