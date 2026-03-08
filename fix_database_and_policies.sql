-- ==============================================================================
-- 🛠️ FIX DATABASE SCHEMA, RLS POLICIES & TRIGGERS (ALL-IN-ONE)
-- ==============================================================================

-- 1. Pastikan Table 'profiles' Aman & Bisa Di-Update User
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  points bigint default 0,
  badges integer default 0, -- FIX: Gunakan Integer agar konsisten dengan frontend
  level integer default 1,
  is_premium boolean default false,
  premium_until timestamptz,
  materials_read_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fix RLS untuk Profiles (PENTING: Agar user bisa update poin sendiri)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." 
on public.profiles for select using (true);

create policy "Users can insert their own profile." 
on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile." 
on public.profiles for update using (auth.uid() = id);

-- 2. Pastikan Table 'quiz_attempts' Ada & Bisa Di-Insert
create table if not exists public.quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  quiz_id text not null, -- ID unik kuis/game (string)
  score integer default 0,
  total_questions integer default 0,
  points_earned integer default 0,
  created_at timestamptz default now(),
  unique(user_id, quiz_id) -- Mencegah duplikat attempt (jika one-time only)
);

alter table public.quiz_attempts enable row level security;

create policy "Users can insert own attempts" 
on public.quiz_attempts for insert with check (auth.uid() = user_id);

create policy "Users can update own attempts" 
on public.quiz_attempts for update using (auth.uid() = user_id);

create policy "Users can view own attempts" 
on public.quiz_attempts for select using (auth.uid() = user_id);


-- 3. Pastikan Table 'user_reads' (Materi) Ada
create table if not exists public.user_reads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  material_id text not null,
  read_at timestamptz default now(),
  unique(user_id, material_id)
);

alter table public.user_reads enable row level security;

create policy "Users can insert read history" 
on public.user_reads for insert with check (auth.uid() = user_id);

create policy "Users can view read history" 
on public.user_reads for select using (auth.uid() = user_id);


-- 4. Pastikan Table 'tasks' & 'user_tasks' (Daily Reward) Ada
create table if not exists public.tasks (
  id serial primary key,
  title text not null,
  description text,
  target_count integer default 1,
  points_reward integer default 0,
  type text, -- 'daily_login', 'read_material', 'play_game'
  is_daily boolean default true,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;
create policy "Tasks are viewable by everyone" on public.tasks for select using (true);

create table if not exists public.user_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  task_id integer references public.tasks(id),
  current_progress integer default 0,
  is_completed boolean default false,
  last_updated_at timestamptz default now(),
  unique(user_id, task_id)
);

alter table public.user_tasks enable row level security;

create policy "Users can insert own tasks" 
on public.user_tasks for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks" 
on public.user_tasks for update using (auth.uid() = user_id);

create policy "Users can view own tasks" 
on public.user_tasks for select using (auth.uid() = user_id);


-- 5. TRIGGER: Auto-Create Profile on Signup (Wajib ada)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger lama jika ada agar tidak error
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 6. Insert Default Tasks (Jika kosong)
insert into public.tasks (title, description, target_count, points_reward, type, is_daily)
select 'Login Harian', 'Login ke aplikasi setiap hari.', 1, 20, 'daily_login', true
where not exists (select 1 from public.tasks where type = 'daily_login');

insert into public.tasks (title, description, target_count, points_reward, type, is_daily)
select 'Baca 1 Materi', 'Baca minimal 1 materi sejarah.', 1, 50, 'read_material', true
where not exists (select 1 from public.tasks where type = 'read_material');

insert into public.tasks (title, description, target_count, points_reward, type, is_daily)
select 'Main 1 Game', 'Mainkan dan menangkan 1 game.', 1, 100, 'play_game', true
where not exists (select 1 from public.tasks where type = 'play_game');
