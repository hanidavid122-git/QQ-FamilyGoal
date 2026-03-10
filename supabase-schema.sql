-- 1. 先清理掉之前建的旧表
drop table if exists public.goals cascade;
drop table if exists public.transactions cascade;
drop table if exists public.achievements cascade;
drop table if exists public.checkins cascade;
drop table if exists public.rewards cascade;
drop table if exists public.messages cascade;
drop table if exists public.profiles cascade;

-- 2. 开启实时同步功能
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

-- 3. 重新创建支持历史数据（text ID）的表
create table public.goals (
  id text primary key,
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
  type text not null default 'personal',
  completed_at timestamptz,
  confirmations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  date timestamptz not null default now(),
  member text not null,
  amount integer not null,
  reason text not null,
  type text not null check (type in ('earned', 'redeemed')),
  created_at timestamptz not null default now()
);

create table public.achievements (
  id text primary key,
  member text not null,
  ach_id text not null,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.checkins (
  id text primary key,
  member text not null,
  date date not null,
  created_at timestamptz not null default now()
);

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

create table public.messages (
  id text primary key,
  user_name text not null,
  content text not null,
  date timestamptz not null default now(),
  likes integer not null default 0,
  avatar text, -- Stores JSON string for danmaku effects (speed, effect, duration)
  color text,
  font_size text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  role text primary key,
  pin text not null default '1183',
  layout_config jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. 插入默认奖励
insert into public.rewards (id, name, cost, is_active, is_custom, icon_name) values
  ('r1', '选择家庭电影', 100, true, false, 'Film'),
  ('r2', '免做家务一天', 200, true, false, 'Target'),
  ('r3', '自选家庭出游', 300, true, false, 'Car'),
  ('r4', '最爱晚餐点菜权', 150, true, false, 'Utensils'),
  ('r5', '额外游戏时间', 50, true, false, 'Gamepad')
on conflict (id) do nothing;

insert into public.profiles (role, pin) values
  ('爸爸', '1183'),
  ('妈妈', '1183'),
  ('姐姐', '1183'),
  ('妹妹', '1183')
on conflict (role) do nothing;

-- 5. 配置权限（允许你的纯前端应用直接读写）
alter table public.goals enable row level security;
alter table public.transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.checkins enable row level security;
alter table public.rewards enable row level security;
alter table public.messages enable row level security;
alter table public.profiles enable row level security;

create policy "Allow anonymous access to goals" on public.goals for all using (true) with check (true);
create policy "Allow anonymous access to transactions" on public.transactions for all using (true) with check (true);
create policy "Allow anonymous access to achievements" on public.achievements for all using (true) with check (true);
create policy "Allow anonymous access to checkins" on public.checkins for all using (true) with check (true);
create policy "Allow anonymous access to rewards" on public.rewards for all using (true) with check (true);
create policy "Allow anonymous access to messages" on public.messages for all using (true) with check (true);
create policy "Allow anonymous access to profiles" on public.profiles for all using (true) with check (true);

-- 6. 添加表到实时同步
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.achievements;
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.rewards;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;
