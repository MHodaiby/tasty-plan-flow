CREATE OR REPLACE FUNCTION public.valid_subscription_days(_days smallint[]) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT coalesce(cardinality(_days) BETWEEN 2 AND 5 AND _days <@ ARRAY[0,1,2,3,4]::smallint[] AND array_position(_days,NULL) IS NULL AND cardinality(_days) = (SELECT count(DISTINCT d) FROM unnest(_days) d),false) $$;
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_days_per_week_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_days_per_week_check CHECK (days_per_week BETWEEN 2 AND 5) NOT VALID;
CREATE OR REPLACE FUNCTION public.validate_subscription() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE unchanged_legacy boolean := false;
BEGIN
 IF TG_OP = 'UPDATE' THEN unchanged_legacy := NOT public.valid_subscription_days(old.default_days) AND new.default_days IS NOT DISTINCT FROM old.default_days AND new.days_per_week = old.days_per_week; END IF;
 IF NOT unchanged_legacy THEN
  IF NOT public.valid_subscription_days(new.default_days) THEN RAISE EXCEPTION 'Please select between 2 and 5 distinct days from Sunday to Thursday'; END IF;
  new.days_per_week := cardinality(new.default_days);
 ELSIF new.status = 'active' AND old.status <> 'active' THEN
  RAISE EXCEPTION 'This subscription requires administrator review: choose 2 to 5 days from Sunday to Thursday before activation';
 END IF;
 IF new.status = 'active' AND new.start_date IS NULL THEN RAISE EXCEPTION 'A start date is required to activate a subscription'; END IF;
 IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
  IF TG_OP = 'INSERT' THEN
   IF new.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
   IF new.status <> 'pending_payment' THEN RAISE EXCEPTION 'New requests must be pending payment'; END IF;
   new.start_date := NULL; new.end_date := NULL; new.payment_received_at := NULL; new.activated_at := NULL; new.cancelled_at := NULL; new.admin_notes := NULL;
  ELSE RAISE EXCEPTION 'Only administrators can change subscriptions'; END IF;
 END IF;
 IF new.status = 'active' AND (TG_OP = 'INSERT' OR old.status <> 'active') THEN new.activated_at := coalesce(new.activated_at,now()); END IF;
 IF new.status = 'cancelled' AND (TG_OP = 'INSERT' OR old.status <> 'cancelled') THEN new.cancelled_at := coalesce(new.cancelled_at,now()); END IF;
 new.updated_at := now(); RETURN new;
END $$;
CREATE OR REPLACE FUNCTION public.required_dates(_subscription_id uuid, _week_start date) RETURNS SETOF date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT d::date FROM public.subscriptions s, generate_series(_week_start,_week_start + 4,interval '1 day') d
 WHERE s.id = _subscription_id AND public.valid_subscription_days(s.default_days)
 AND extract(dow FROM d)::smallint = ANY(s.default_days)
 AND s.start_date IS NOT NULL AND d::date >= s.start_date AND (s.end_date IS NULL OR d::date <= s.end_date)
$$;
CREATE OR REPLACE FUNCTION public.guard_subscription_meal_days() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF extract(dow FROM new.delivery_date) NOT BETWEEN 0 AND 4 THEN RAISE EXCEPTION 'Our subscription days run from Sunday to Thursday'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = new.subscription_id AND public.valid_subscription_days(s.default_days) AND s.days_per_week = cardinality(s.default_days)) THEN RAISE EXCEPTION 'This subscription requires administrator review before selecting meals'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER meal_selections_day_guard BEFORE INSERT OR UPDATE ON public.meal_selections FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_meal_days();
CREATE OR REPLACE FUNCTION public.confirm_week(_subscription_id uuid, _menu_id uuid) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub public.subscriptions; menu public.weekly_menus; missing int; ts timestamptz;
BEGIN
 SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
 IF NOT FOUND OR (sub.user_id <> auth.uid() AND NOT public.is_admin()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF sub.status <> 'active' THEN RAISE EXCEPTION 'Only active subscriptions can confirm meals'; END IF;
 IF NOT public.valid_subscription_days(sub.default_days) OR sub.days_per_week <> cardinality(sub.default_days) THEN RAISE EXCEPTION 'This subscription requires administrator review before confirming meals'; END IF;
 SELECT * INTO menu FROM public.weekly_menus WHERE id = _menu_id AND is_published;
 IF NOT FOUND THEN RAISE EXCEPTION 'Menu not available'; END IF;
 IF NOT public.is_admin() AND now() >= public.selection_deadline(menu.week_start) THEN RAISE EXCEPTION 'Meal selection for this week is closed'; END IF;
 SELECT count(*) INTO missing FROM public.required_dates(sub.id,menu.week_start) r WHERE NOT EXISTS (SELECT 1 FROM public.meal_selections ms WHERE ms.subscription_id = sub.id AND ms.delivery_date = r);
 IF missing > 0 THEN RAISE EXCEPTION 'Please choose a meal for every subscribed day (% missing)',missing; END IF;
 INSERT INTO public.week_confirmations(subscription_id,menu_id,user_id) VALUES(sub.id,menu.id,sub.user_id) ON CONFLICT(subscription_id,menu_id) DO UPDATE SET confirmed_at=now() RETURNING confirmed_at INTO ts;
 RETURN ts;
END $$;