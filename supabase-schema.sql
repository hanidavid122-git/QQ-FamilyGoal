-- Enable realtime for all tables
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

-- 1. Goals Table
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  start_date date not null,
  end_date date not null,
  progress integer not null default 0,
  creator text not null,
  assignees text[] not null default '{}',
  assignee text,
  signature text,
  priority text not null,
  completed_at timestamptz,
  confirmations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Transactions Table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null default now(),
  member text not null,
  amount integer not null,
  reason text not null,
  type text not null check (type in ('earned', 'redeemed')),
  created_at timestamptz not null default now()
);

-- 3. Achievements Table
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  ach_id text not null,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 4. CheckIns Table
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  date date not null,
  created_at timestamptz not null default now()
);

-- 5. Rewards Table
create table public.rewards (
  id text primary key,
  name text not null,
  cost integer not null,
  description text,
  is_active boolean not null default true,
  is_custom boolean not null default false,
  icon_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default rewards
insert into public.rewards (id, name, cost, is_active, is_custom, icon_name) values
  ('r1', '选择家庭电影', 100, true, false, 'Film'),
  ('r2', '免做家务一天', 200, true, false, 'Target'),
  ('r3', '自选家庭出游', 300, true, false, 'Car'),
  ('r4', '最爱晚餐点菜权', 150, true, false, 'Utensils'),
  ('r5', '额外游戏时间', 50, true, false, 'Gamepad')
on conflict (id) do nothing;

-- Enable Row Level Security (RLS) but allow anonymous access for this family app
alter table public.goals enable row level security;
alter table public.transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.checkins enable row level security;
alter table public.rewards enable row level security;

-- Create policies to allow all operations for anonymous users (since this is a private family app)
create policy "Allow anonymous access to goals" on public.goals for all using (true) with check (true);
create policy "Allow anonymous access to transactions" on public.transactions for all using (true) with check (true);
create policy "Allow anonymous access to achievements" on public.achievements for all using (true) with check (true);
create policy "Allow anonymous access to checkins" on public.checkins for all using (true) with check (true);
create policy "Allow anonymous access to rewards" on public.rewards for all using (true) with check (true);

-- Add tables to realtime publication
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.achievements;
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.rewards;
