-- Reporting improvements + daily same-mood chat

-- 1) Extend existing reports table for structured moderation intake.
alter table if exists public.reports
  add column if not exists details text,
  add column if not exists status text not null default 'open',
  add column if not exists content_type text generated always as (
    case
      when question_id is not null then 'question'
      when answer_id is not null then 'answer'
      else 'unknown'
    end
  ) stored;

alter table if exists public.reports
  drop constraint if exists reports_status_check;

alter table if exists public.reports
  add constraint reports_status_check
  check (status in ('open', 'reviewing', 'resolved', 'dismissed'));

create index if not exists idx_reports_status_created_at on public.reports (status, created_at desc);
create index if not exists idx_reports_content_type on public.reports (content_type);

-- Ensure user can only submit reports as themselves.
alter table if exists public.reports enable row level security;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- 2) Daily same-mood chat feature.
create table if not exists public.mood_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  room_date date not null default current_date,
  mood text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint mood_chat_rooms_unique_day_mood unique (room_date, mood),
  constraint mood_chat_rooms_mood_check check (mood in ('good', 'okay', 'struggling'))
);

create table if not exists public.mood_chat_participants (
  room_id uuid not null references public.mood_chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.mood_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mood_chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint mood_chat_messages_length check (char_length(trim(message)) between 1 and 300)
);

create index if not exists idx_mood_chat_messages_room_created_at
  on public.mood_chat_messages (room_id, created_at asc);

alter table public.mood_chat_rooms enable row level security;
alter table public.mood_chat_participants enable row level security;
alter table public.mood_chat_messages enable row level security;

-- Participant can see room only if they are a participant.
drop policy if exists mood_chat_rooms_select_participant on public.mood_chat_rooms;
create policy mood_chat_rooms_select_participant
  on public.mood_chat_rooms
  for select
  to authenticated
  using (
    exists (
      select 1 from public.mood_chat_participants p
      where p.room_id = mood_chat_rooms.id
      and p.user_id = auth.uid()
    )
  );

-- Join room as self only.
drop policy if exists mood_chat_participants_select_own on public.mood_chat_participants;
create policy mood_chat_participants_select_own
  on public.mood_chat_participants
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mood_chat_participants_insert_own on public.mood_chat_participants;
create policy mood_chat_participants_insert_own
  on public.mood_chat_participants
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Messages are visible/insertable only if user is participant in that room.
drop policy if exists mood_chat_messages_select_participant on public.mood_chat_messages;
create policy mood_chat_messages_select_participant
  on public.mood_chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.mood_chat_participants p
      where p.room_id = mood_chat_messages.room_id
      and p.user_id = auth.uid()
    )
  );

drop policy if exists mood_chat_messages_insert_participant on public.mood_chat_messages;
create policy mood_chat_messages_insert_participant
  on public.mood_chat_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.mood_chat_participants p
      where p.room_id = mood_chat_messages.room_id
      and p.user_id = auth.uid()
    )
  );

-- Helper RPC: join (or create) today's room for mood and return room id.
create or replace function public.join_or_create_daily_mood_room(p_mood text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_mood not in ('good', 'okay', 'struggling') then
    raise exception 'Invalid mood: %', p_mood;
  end if;

  insert into public.mood_chat_rooms (room_date, mood, created_by)
  values (current_date, p_mood, v_user)
  on conflict (room_date, mood) do nothing;

  select id
  into v_room_id
  from public.mood_chat_rooms
  where room_date = current_date and mood = p_mood
  limit 1;

  if v_room_id is null then
    raise exception 'Could not resolve mood room';
  end if;

  insert into public.mood_chat_participants (room_id, user_id)
  values (v_room_id, v_user)
  on conflict (room_id, user_id) do nothing;

  return v_room_id;
end;
$$;

grant execute on function public.join_or_create_daily_mood_room(text) to authenticated;
