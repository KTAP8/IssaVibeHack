-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
-- Linked to auth.users to store user specific data
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" 
  on public.profiles for select 
  using ( auth.uid() = id );

create policy "Users can update own profile" 
  on public.profiles for update 
  using ( auth.uid() = id );

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- CHAT SESSIONS TABLE
create table public.chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_sessions enable row level security;

create policy "Users can view own chat sessions" 
  on public.chat_sessions for select 
  using ( auth.uid() = user_id );

create policy "Users can insert own chat sessions" 
  on public.chat_sessions for insert 
  with check ( auth.uid() = user_id );

create policy "Users can update own chat sessions" 
  on public.chat_sessions for update 
  using ( auth.uid() = user_id );

create policy "Users can delete own chat sessions" 
  on public.chat_sessions for delete 
  using ( auth.uid() = user_id );

-- CHAT MESSAGES TABLE
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

-- We check session ownership to allow access to messages
create policy "Users can view messages of own sessions" 
  on public.chat_messages for select 
  using ( 
    exists ( 
      select 1 from public.chat_sessions 
      where id = chat_messages.session_id and user_id = auth.uid() 
    ) 
  );

create policy "Users can insert messages to own sessions" 
  on public.chat_messages for insert 
  with check ( 
    exists ( 
      select 1 from public.chat_sessions 
      where id = chat_messages.session_id and user_id = auth.uid() 
    ) 
  );
