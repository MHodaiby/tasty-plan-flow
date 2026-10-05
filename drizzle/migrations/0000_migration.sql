-- ========== ENUMS ==========
create type public.app_role as enum ('admin','customer');
create type public.subscription_status as enum ('pending_payment','active','paused','expired','cancelled');
create type public.billing_period as enum ('weekly','monthly');

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  delivery_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ========== ROLES ==========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "Users read own roles, admins read all" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "Read own profile or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "Update own profile or admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- New auth user -> profile + customer role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, delivery_address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'delivery_address', '')
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
    on conflict (user_id, role) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== SETTINGS ==========
create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  deadline_weekday smallint not null default 4 check (deadline_weekday between 0 and 6),
  deadline_time time not null default '20:00',
  timezone text not null default 'Asia/Riyadh',
  updated_at timestamptz not null default now()
);
grant select, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Anyone signed in reads settings" on public.app_settings
  for select to authenticated using (true);
create policy "Admins update settings" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();
insert into public.app_settings (id) values (1);

-- Deadline for a menu week = most recent configured weekday strictly before week_start, at configured local time
create or replace function public.selection_deadline(_week_start date)
returns timestamptz language plpgsql stable security definer set search_path = public as $$
declare s public.app_settings; d int;
begin
  select * into s from public.app_settings where id = 1;
  d := ((extract(dow from _week_start)::int - s.deadline_weekday + 7) % 7);
  if d = 0 then d := 7; end if;
  return ((_week_start - d)::timestamp + s.deadline_time) at time zone s.timezone;
end; $$;

-- ========== SUBSCRIPTIONS ==========
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  billing_period public.billing_period not null,
  days_per_week smallint not null check (days_per_week in (3,5)),
  default_days smallint[] not null,
  status public.subscription_status not null default 'pending_payment',
  start_date date,
  end_date date,
  payment_received_at timestamptz,
  admin_notes text,
  activated_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_one_open_per_user on public.subscriptions(user_id)
  where status in ('pending_payment','active','paused');
grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Read own subscriptions or admin" on public.subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Customers request own subscription" on public.subscriptions
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "Admins update subscriptions" on public.subscriptions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete subscriptions" on public.subscriptions
  for delete to authenticated using (public.is_admin());

create or replace function public.validate_subscription()
returns trigger language plpgsql set search_path = public as $$
declare n int; bad int;
begin
  if coalesce(array_length(new.default_days, 1), 0) <> new.days_per_week then
    raise exception 'Select exactly % delivery days', new.days_per_week;
  end if;
  select count(distinct x), count(*) filter (where x < 0 or x > 6) into n, bad from unnest(new.default_days) x;
  if bad > 0 then raise exception 'Invalid day of week'; end if;
  if n <> new.days_per_week then raise exception 'Delivery days must be unique'; end if;
  if new.status = 'active' and new.start_date is null then
    raise exception 'A start date is required to activate a subscription';
  end if;

  -- Non-admin callers (customers) may only create pending requests for themselves
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.user_id <> auth.uid() then raise exception 'Not allowed'; end if;
      if new.status <> 'pending_payment' then raise exception 'New requests must be pending payment'; end if;
      new.start_date := null; new.end_date := null; new.payment_received_at := null;
      new.activated_at := null; new.cancelled_at := null; new.admin_notes := null;
    else
      raise exception 'Only administrators can change subscriptions';
    end if;
  end if;

  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    new.activated_at := coalesce(new.activated_at, now());
  end if;
  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled') then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;
  new.updated_at := now();
  return new;
end; $$;
create trigger subscriptions_validate before insert or update on public.subscriptions
  for each row execute function public.validate_subscription();

-- ========== PAYMENTS (manual now, gateway-ready later) ==========
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2),
  currency text not null default 'SAR',
  method text not null default 'manual_link',
  reference text,
  notes text,
  received_at timestamptz not null default now(),
  recorded_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Read own payments or admin" on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins insert payments" on public.payments
  for insert to authenticated with check (public.is_admin());
create policy "Admins update payments" on public.payments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete payments" on public.payments
  for delete to authenticated using (public.is_admin());

-- ========== MEALS ==========
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  category text not null default 'Main',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.meals to authenticated;
grant all on public.meals to service_role;
alter table public.meals enable row level security;
create policy "Signed in users read meals" on public.meals for select to authenticated using (true);
create policy "Admins insert meals" on public.meals for insert to authenticated with check (public.is_admin());
create policy "Admins update meals" on public.meals for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete meals" on public.meals for delete to authenticated using (public.is_admin());
create trigger meals_touch before update on public.meals for each row execute function public.touch_updated_at();

-- ========== WEEKLY MENUS ==========
create table public.weekly_menus (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(dow from week_start) = 0),
  is_published boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.weekly_menus to authenticated;
grant all on public.weekly_menus to service_role;
alter table public.weekly_menus enable row level security;
create policy "Read published menus or admin" on public.weekly_menus for select to authenticated using (is_published or public.is_admin());
create policy "Admins insert menus" on public.weekly_menus for insert to authenticated with check (public.is_admin());
create policy "Admins update menus" on public.weekly_menus for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete menus" on public.weekly_menus for delete to authenticated using (public.is_admin());
create trigger menus_touch before update on public.weekly_menus for each row execute function public.touch_updated_at();

create table public.weekly_menu_items (
  menu_id uuid not null references public.weekly_menus(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  primary key (menu_id, meal_id)
);
grant select, insert, update, delete on public.weekly_menu_items to authenticated;
grant all on public.weekly_menu_items to service_role;
alter table public.weekly_menu_items enable row level security;
create policy "Read items of published menus or admin" on public.weekly_menu_items for select to authenticated
  using (public.is_admin() or exists (select 1 from public.weekly_menus m where m.id = menu_id and m.is_published));
create policy "Admins insert menu items" on public.weekly_menu_items for insert to authenticated with check (public.is_admin());
create policy "Admins delete menu items" on public.weekly_menu_items for delete to authenticated using (public.is_admin());

-- ========== MEAL SELECTIONS ==========
create table public.meal_selections (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  menu_id uuid not null references public.weekly_menus(id) on delete cascade,
  delivery_date date not null,
  meal_id uuid not null references public.meals(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, delivery_date)
);
create index meal_selections_menu_idx on public.meal_selections(menu_id);
grant select, insert, update, delete on public.meal_selections to authenticated;
grant all on public.meal_selections to service_role;
alter table public.meal_selections enable row level security;
create policy "Read own selections or admin" on public.meal_selections for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Insert own selections or admin" on public.meal_selections for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "Update own selections or admin" on public.meal_selections for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "Delete own selections or admin" on public.meal_selections for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.validate_meal_selection()
returns trigger language plpgsql security definer set search_path = public as $$
declare sub public.subscriptions; menu public.weekly_menus; is_customer boolean;
begin
  is_customer := auth.uid() is not null and not public.is_admin();

  if tg_op = 'DELETE' then
    if is_customer then
      select * into menu from public.weekly_menus where id = old.menu_id;
      if now() >= public.selection_deadline(menu.week_start) then
        raise exception 'Meal selection for this week is closed';
      end if;
    end if;
    return old;
  end if;

  select * into sub from public.subscriptions where id = new.subscription_id;
  if not found then raise exception 'Subscription not found'; end if;
  new.user_id := sub.user_id;

  select * into menu from public.weekly_menus where id = new.menu_id;
  if not found then raise exception 'Menu not found'; end if;

  if new.delivery_date < menu.week_start or new.delivery_date > menu.week_start + 6 then
    raise exception 'Date is outside this menu week';
  end if;
  if not (extract(dow from new.delivery_date)::smallint = any (sub.default_days)) then
    raise exception 'This day is not part of the subscription';
  end if;
  if not exists (
    select 1 from public.weekly_menu_items i join public.meals m on m.id = i.meal_id
    where i.menu_id = new.menu_id and i.meal_id = new.meal_id and m.is_active
  ) then
    raise exception 'This meal is not available this week';
  end if;

  if is_customer then
    if sub.user_id <> auth.uid() then raise exception 'Not allowed'; end if;
    if sub.status <> 'active' then raise exception 'Only active subscriptions can select meals'; end if;
    if not menu.is_published then raise exception 'This menu is not published'; end if;
    if sub.start_date is null or new.delivery_date < sub.start_date
       or (sub.end_date is not null and new.delivery_date > sub.end_date) then
      raise exception 'This date is outside your subscription period';
    end if;
    if now() >= public.selection_deadline(menu.week_start) then
      raise exception 'Meal selection for this week is closed';
    end if;
    if tg_op = 'UPDATE' and (old.subscription_id <> new.subscription_id or old.delivery_date <> new.delivery_date or old.menu_id <> new.menu_id) then
      raise exception 'Only the meal can be changed';
    end if;
  end if;

  new.updated_at := now();
  return new;
end; $$;
create trigger meal_selections_validate before insert or update or delete on public.meal_selections
  for each row execute function public.validate_meal_selection();

-- ========== WEEK CONFIRMATIONS (finalization) ==========
create table public.week_confirmations (
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  menu_id uuid not null references public.weekly_menus(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (subscription_id, menu_id)
);
grant select on public.week_confirmations to authenticated;
grant all on public.week_confirmations to service_role;
alter table public.week_confirmations enable row level security;
create policy "Read own confirmations or admin" on public.week_confirmations for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Required delivery dates for a subscription in a given menu week
create or replace function public.required_dates(_subscription_id uuid, _week_start date)
returns setof date language sql stable security definer set search_path = public as $$
  select d::date from public.subscriptions s,
    generate_series(_week_start, _week_start + 6, interval '1 day') d
  where s.id = _subscription_id
    and extract(dow from d)::smallint = any (s.default_days)
    and s.start_date is not null and d::date >= s.start_date
    and (s.end_date is null or d::date <= s.end_date)
$$;

create or replace function public.confirm_week(_subscription_id uuid, _menu_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare sub public.subscriptions; menu public.weekly_menus; missing int; ts timestamptz;
begin
  select * into sub from public.subscriptions where id = _subscription_id;
  if not found or (sub.user_id <> auth.uid() and not public.is_admin()) then raise exception 'Not allowed'; end if;
  if sub.status <> 'active' then raise exception 'Only active subscriptions can confirm meals'; end if;
  select * into menu from public.weekly_menus where id = _menu_id and is_published;
  if not found then raise exception 'Menu not available'; end if;
  if not public.is_admin() and now() >= public.selection_deadline(menu.week_start) then
    raise exception 'Meal selection for this week is closed';
  end if;
  select count(*) into missing from public.required_dates(sub.id, menu.week_start) r
    where not exists (select 1 from public.meal_selections ms where ms.subscription_id = sub.id and ms.delivery_date = r);
  if missing > 0 then raise exception 'Please choose a meal for every subscribed day (% missing)', missing; end if;
  insert into public.week_confirmations (subscription_id, menu_id, user_id)
    values (sub.id, menu.id, sub.user_id)
    on conflict (subscription_id, menu_id) do update set confirmed_at = now()
    returning confirmed_at into ts;
  return ts;
end; $$;

-- Removing a selection un-finalizes the week
create or replace function public.unconfirm_on_selection_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.week_confirmations where subscription_id = old.subscription_id and menu_id = old.menu_id;
  return old;
end; $$;
create trigger meal_selections_unconfirm after delete on public.meal_selections
  for each row execute function public.unconfirm_on_selection_delete();

-- ========== STORAGE POLICIES for meal images ==========
create policy "Public read meal images" on storage.objects for select using (bucket_id = 'meal-images');
create policy "Admins upload meal images" on storage.objects for insert to authenticated with check (bucket_id = 'meal-images' and public.is_admin());
create policy "Admins update meal images" on storage.objects for update to authenticated using (bucket_id = 'meal-images' and public.is_admin());
create policy "Admins delete meal images" on storage.objects for delete to authenticated using (bucket_id = 'meal-images' and public.is_admin());

-- ========== DEMO DATA ==========
insert into public.profiles (id, full_name, email, phone, delivery_address) values
 ('a0000000-0000-0000-0000-000000000001','Admin Kitchen','admin@demo.com','+966 50 000 0001','Verdant Kitchen, Olaya St, Riyadh'),
 ('c0000000-0000-0000-0000-000000000001','Sara Al-Harbi','sara@demo.com','+966 55 123 4501','12 King Fahd Rd, Al Olaya, Riyadh'),
 ('c0000000-0000-0000-0000-000000000002','Omar Haddad','omar@demo.com','+966 55 123 4502','7 Tahlia St, Al Sulimaniyah, Riyadh'),
 ('c0000000-0000-0000-0000-000000000003','Lina Mansour','lina@demo.com','+966 55 123 4503','33 Prince Sultan Rd, Al Rawdah, Riyadh'),
 ('c0000000-0000-0000-0000-000000000004','Khalid Nasser','khalid@demo.com','+966 55 123 4504','5 Al Imam Saud Rd, Al Nakheel, Riyadh'),
 ('c0000000-0000-0000-0000-000000000005','Noor Saleh','noor@demo.com','+966 55 123 4505','18 Abu Bakr Rd, Al Sahafa, Riyadh'),
 ('c0000000-0000-0000-0000-000000000006','Yusuf Karim','yusuf@demo.com','+966 55 123 4506','41 Takhassusi St, Al Mohammadiyah, Riyadh'),
 ('c0000000-0000-0000-0000-000000000007','Hana Farouk','hana@demo.com','+966 55 123 4507','9 Al Urubah Rd, Al Wurud, Riyadh'),
 ('c0000000-0000-0000-0000-000000000008','Reem Qasim','reem@demo.com','+966 55 123 4508','22 Anas Bin Malik Rd, Al Malqa, Riyadh');

insert into public.user_roles (user_id, role) values
 ('a0000000-0000-0000-0000-000000000001','admin'),
 ('c0000000-0000-0000-0000-000000000001','customer'),
 ('c0000000-0000-0000-0000-000000000002','customer'),
 ('c0000000-0000-0000-0000-000000000003','customer'),
 ('c0000000-0000-0000-0000-000000000004','customer'),
 ('c0000000-0000-0000-0000-000000000005','customer'),
 ('c0000000-0000-0000-0000-000000000006','customer'),
 ('c0000000-0000-0000-0000-000000000007','customer'),
 ('c0000000-0000-0000-0000-000000000008','customer');

insert into public.meals (id, name, description, image_url, category, is_active) values
 ('d0000000-0000-0000-0000-000000000001','Herb-Grilled Chicken','Charred lemon, wild rice and roasted greens','/images/meals/grilled-chicken.jpg','Protein',true),
 ('d0000000-0000-0000-0000-000000000002','Beef Pasta','Slow-braised beef ragu over fresh tagliatelle','/images/meals/beef-pasta.jpg','Pasta',true),
 ('d0000000-0000-0000-0000-000000000003','Chicken Rice Bowl','Crisp shallot, jasmine rice, sesame greens','/images/meals/chicken-rice-bowl.jpg','Bowls',true),
 ('d0000000-0000-0000-0000-000000000004','Seared Salmon','Dill, brown butter, lemon and baby potatoes','/images/meals/salmon.jpg','Seafood',true),
 ('d0000000-0000-0000-0000-000000000005','Vegetarian Bowl','Farro, avocado, chickpeas and tahini','/images/meals/vegetarian-bowl.jpg','Vegetarian',true),
 ('d0000000-0000-0000-0000-000000000006','Roasted Squash Bowl','Chickpeas, sage and toasted seeds','/images/meals/squash-bowl.jpg','Vegetarian',true),
 ('d0000000-0000-0000-0000-000000000007','Seasonal Curry','Coconut vegetable curry with warm naan','/images/meals/seasonal-curry.jpg','Vegetarian',true),
 ('d0000000-0000-0000-0000-000000000008','Lamb Kofta','Spiced lamb, herbed bulgur and yogurt','/images/meals/lamb-kofta.jpg','Protein',false);

do $$
declare
  cur_sun date := current_date - extract(dow from current_date)::int;
  nxt_sun date := cur_sun + 7;
  m_cur uuid := 'e0000000-0000-0000-0000-000000000001';
  m_nxt uuid := 'e0000000-0000-0000-0000-000000000002';
  m_aft uuid := 'e0000000-0000-0000-0000-000000000003';
  meals_cur uuid[] := array['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004','d0000000-0000-0000-0000-000000000005']::uuid[];
  meals_nxt uuid[] := array['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000004','d0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000007']::uuid[];
  r record; d int; i int;
begin
  insert into public.weekly_menus (id, week_start, is_published, notes) values
    (m_cur, cur_sun, true, 'Autumn week'),
    (m_nxt, nxt_sun, true, 'Harvest week'),
    (m_aft, nxt_sun + 7, false, 'Draft');
  insert into public.weekly_menu_items (menu_id, meal_id) select m_cur, unnest(meals_cur);
  insert into public.weekly_menu_items (menu_id, meal_id) select m_nxt, unnest(meals_nxt);
  insert into public.weekly_menu_items (menu_id, meal_id) values
    (m_aft,'d0000000-0000-0000-0000-000000000001'),(m_aft,'d0000000-0000-0000-0000-000000000003'),
    (m_aft,'d0000000-0000-0000-0000-000000000004'),(m_aft,'d0000000-0000-0000-0000-000000000006');

  insert into public.subscriptions (id, user_id, billing_period, days_per_week, default_days, status, start_date, payment_received_at, admin_notes) values
    ('f0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','weekly',3,'{0,2,4}','active',cur_sun - 21, now() - interval '22 days', null),
    ('f0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','monthly',5,'{0,1,2,3,4}','active',cur_sun - 35, now() - interval '36 days', null),
    ('f0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000003','weekly',3,'{1,3,5}','pending_payment',null,null,null),
    ('f0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000004','monthly',3,'{1,3,6}','active',cur_sun - 14, now() - interval '15 days', null),
    ('f0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000005','weekly',3,'{0,2,4}','expired',cur_sun - 70, now() - interval '71 days', 'Did not renew'),
    ('f0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000006','weekly',5,'{0,1,2,3,4}','paused',cur_sun - 28, now() - interval '29 days', 'Travelling — paused on request'),
    ('f0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000007','monthly',5,'{0,1,2,3,4}','active',cur_sun - 7, now() - interval '8 days', null),
    ('f0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000008','weekly',3,'{0,2,4}','cancelled',null,null,'Duplicate request'),
    ('f0000000-0000-0000-0000-000000000009','c0000000-0000-0000-0000-000000000008','weekly',3,'{0,2,4}','active',cur_sun - 7, now() - interval '9 days', null),
    ('f0000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000005','monthly',5,'{0,1,2,3,4}','pending_payment',null,null,null);

  insert into public.payments (subscription_id, user_id, amount, reference, received_at, notes)
  select s.id, s.user_id, case when s.billing_period = 'weekly' then (s.days_per_week * 45) else (s.days_per_week * 160) end,
         'LINK-' || substr(s.id::text, 32, 5), s.payment_received_at, 'Paid via payment link'
  from public.subscriptions s where s.payment_received_at is not null;

  -- Current week: everyone active has full selections
  i := 0;
  for r in select * from public.subscriptions where status = 'active' loop
    foreach d in array r.default_days loop
      i := i + 1;
      insert into public.meal_selections (subscription_id, user_id, menu_id, delivery_date, meal_id)
      values (r.id, r.user_id, m_cur, cur_sun + d, meals_cur[(i % 5) + 1]);
    end loop;
  end loop;

  -- Next week: partial / complete mix
  i := 0;
  for r in select * from public.subscriptions where status = 'active' and id <> 'f0000000-0000-0000-0000-000000000004' loop
    foreach d in array r.default_days loop
      i := i + 1;
      -- Sara leaves Thursday open; Hana leaves Wed/Thu open
      if (r.id = 'f0000000-0000-0000-0000-000000000001' and d = 4)
         or (r.id = 'f0000000-0000-0000-0000-000000000007' and d in (3,4)) then
        continue;
      end if;
      insert into public.meal_selections (subscription_id, user_id, menu_id, delivery_date, meal_id)
      values (r.id, r.user_id, m_nxt, nxt_sun + d, meals_nxt[(i % 7) + 1]);
    end loop;
  end loop;

  insert into public.week_confirmations (subscription_id, menu_id, user_id) values
    ('f0000000-0000-0000-0000-000000000002', m_nxt, 'c0000000-0000-0000-0000-000000000002'),
    ('f0000000-0000-0000-0000-000000000009', m_nxt, 'c0000000-0000-0000-0000-000000000008');
end $$;