-- Run against the app database in a transaction; all test changes roll back.
BEGIN;
DO $$
DECLARE d smallint[]; s public.subscriptions; customer uuid; menu uuid; meal uuid; delivered date;
BEGIN
 SELECT id INTO customer FROM public.profiles ORDER BY created_at LIMIT 1;
 IF customer IS NULL THEN RAISE EXCEPTION 'A profile is required to run these tests'; END IF;
 FOREACH d SLICE 1 IN ARRAY ARRAY[[0,2,-1,-1,-1],[0,1,3,-1,-1],[0,1,2,4,-1],[0,1,2,3,4]]::smallint[] LOOP
  d := array_remove(d, -1::smallint);
  IF NOT public.valid_subscription_days(d) THEN RAISE EXCEPTION 'Valid day selection rejected'; END IF;
 END LOOP;
 IF public.valid_subscription_days(ARRAY[0]::smallint[]) OR public.valid_subscription_days(ARRAY[0,5]::smallint[]) OR public.valid_subscription_days(ARRAY[0,6]::smallint[]) OR public.valid_subscription_days(ARRAY[0,0]::smallint[]) OR public.valid_subscription_days(ARRAY[0,NULL]::smallint[]) OR public.valid_subscription_days(ARRAY[0,1,2,3,4,5]::smallint[]) THEN RAISE EXCEPTION 'Invalid days accepted'; END IF;
 FOREACH d SLICE 1 IN ARRAY ARRAY[[0,2,-1,-1,-1],[0,1,3,-1,-1],[0,1,2,4,-1],[0,1,2,3,4]]::smallint[] LOOP
  d := array_remove(d,-1::smallint);
  INSERT INTO public.subscriptions(user_id,billing_period,days_per_week,default_days,status) VALUES(customer,'weekly',99,d,'expired') RETURNING * INTO s;
  IF s.days_per_week <> cardinality(d) THEN RAISE EXCEPTION 'Stored count not derived'; END IF;
 END LOOP;
 FOREACH d SLICE 1 IN ARRAY ARRAY[[0,5],[0,6],[0,0],[0,-1]]::smallint[] LOOP
  BEGIN
   INSERT INTO public.subscriptions(user_id,billing_period,days_per_week,default_days,status) VALUES(customer,'weekly',2,d,'expired');
   RAISE EXCEPTION 'Invalid insert unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM = 'Invalid insert unexpectedly succeeded' THEN RAISE; END IF;
  END;
 END LOOP;
 UPDATE public.subscriptions SET status='active',start_date='2030-01-06',end_date='2030-02-05' WHERE id=s.id;
 IF (SELECT array_agg(r ORDER BY r) FROM public.required_dates(s.id,'2030-01-06') r) <> ARRAY['2030-01-06','2030-01-07','2030-01-08','2030-01-09','2030-01-10']::date[] THEN RAISE EXCEPTION 'Meal eligibility dates wrong'; END IF;
 SELECT id INTO menu FROM public.weekly_menus LIMIT 1;
 SELECT meal_id INTO meal FROM public.weekly_menu_items WHERE menu_id=menu LIMIT 1;
 IF menu IS NOT NULL AND meal IS NOT NULL THEN
  SELECT week_start+5 INTO delivered FROM public.weekly_menus WHERE id=menu;
  BEGIN
   INSERT INTO public.meal_selections(subscription_id,user_id,menu_id,delivery_date,meal_id) VALUES(s.id,customer,menu,delivered,meal);
   RAISE EXCEPTION 'Weekend meal insert unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM = 'Weekend meal insert unexpectedly succeeded' THEN RAISE; END IF;
  END;
 END IF;
END $$;
ROLLBACK;