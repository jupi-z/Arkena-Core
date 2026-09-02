-- Attendance is one business record per employee and UTC calendar day.
ALTER TABLE "AttendanceRecord" ADD COLUMN "attendanceDay" DATE;

UPDATE "AttendanceRecord"
SET "attendanceDay" = ("attendanceDate" AT TIME ZONE 'UTC')::date;

-- Preserve the earliest record when legacy timestamp-based data contains
-- multiple records for the same employee and calendar day.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "employeeId", "attendanceDay"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "AttendanceRecord"
)
DELETE FROM "AttendanceRecord" record
USING ranked
WHERE record."id" = ranked."id"
  AND ranked.row_number > 1;

ALTER TABLE "AttendanceRecord" ALTER COLUMN "attendanceDay" SET NOT NULL;
DROP INDEX "AttendanceRecord_employeeId_attendanceDate_key";
DROP INDEX "AttendanceRecord_attendanceDate_idx";
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_attendanceDay_key"
  ON "AttendanceRecord"("employeeId", "attendanceDay");
CREATE INDEX "AttendanceRecord_attendanceDay_idx"
  ON "AttendanceRecord"("attendanceDay");
ALTER TABLE "AttendanceRecord" DROP COLUMN "attendanceDate";
