-- REVIEW ONLY: not registered with the migration runner and NOT applied.
-- Run deliberately against the intended environment after reviewing the preview.
-- Retains the legacy enum, cancelled_at, payment records, dates, days and notes.
-- The existing reactivation trigger checks OLD.status = 'expired'; these rows
-- have OLD.status = 'cancelled', so the conversion does not reactivate them.
BEGIN;

SELECT id, user_id, status, start_date, end_date, cancelled_at
FROM public.subscriptions WHERE status = 'cancelled' ORDER BY created_at;

UPDATE public.subscriptions SET status = 'expired'
WHERE status = 'cancelled'
RETURNING id, user_id, status, start_date, end_date, cancelled_at;

-- Leave review execution rolled back. Replace ROLLBACK with COMMIT only when
-- deliberately applying this migration to the approved environment.
ROLLBACK;
