CREATE OR REPLACE FUNCTION public.validate_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE unchanged_legacy boolean := false;
BEGIN
 IF TG_OP = 'UPDATE' THEN 
   unchanged_legacy := NOT public.valid_subscription_days(old.default_days) 
     AND new.default_days IS NOT DISTINCT FROM old.default_days 
     AND new.days_per_week = old.days_per_week; 
 END IF;

 IF NOT unchanged_legacy THEN
  IF NOT public.valid_subscription_days(new.default_days) THEN 
    RAISE EXCEPTION 'Please select between 2 and 5 distinct days from Sunday to Thursday'; 
  END IF;
  new.days_per_week := cardinality(new.default_days);
 ELSIF new.status = 'active' AND old.status <> 'active' THEN
  RAISE EXCEPTION 'This subscription requires administrator review: choose 2 to 5 days from Sunday to Thursday before activation';
 END IF;

 IF new.status = 'active' AND new.start_date IS NULL THEN 
   RAISE EXCEPTION 'A start date is required to activate a subscription'; 
 END IF;

 -- 1. Auto-expire if end_date is in the past:
 IF new.end_date IS NOT NULL AND new.end_date < CURRENT_DATE AND new.status IN ('active', 'paused') THEN
   new.status := 'expired';
 END IF;

 -- 2. Auto-reactivate if an expired subscription is given an end_date today or in the future:
 IF TG_OP = 'UPDATE' AND old.status = 'expired' AND new.end_date IS NOT NULL AND new.end_date >= CURRENT_DATE THEN
   IF new.start_date IS NOT NULL THEN
     new.status := 'active';
   END IF;
 END IF;

 IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
  IF TG_OP = 'INSERT' THEN
   IF new.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
   IF new.status <> 'pending_payment' THEN RAISE EXCEPTION 'New requests must be pending payment'; END IF;
   new.start_date := NULL; new.end_date := NULL; new.payment_received_at := NULL; new.activated_at := NULL; new.cancelled_at := NULL; new.admin_notes := NULL;
  ELSE 
   RAISE EXCEPTION 'Only administrators can change subscriptions'; 
  END IF;
 END IF;

 IF new.status = 'active' AND (TG_OP = 'INSERT' OR old.status <> 'active') THEN 
   new.activated_at := coalesce(new.activated_at, now()); 
 END IF;
 IF new.status = 'cancelled' AND (TG_OP = 'INSERT' OR old.status <> 'cancelled') THEN 
   new.cancelled_at := coalesce(new.cancelled_at, now()); 
 END IF;

 new.updated_at := now(); 
 RETURN new;
END $function$;
