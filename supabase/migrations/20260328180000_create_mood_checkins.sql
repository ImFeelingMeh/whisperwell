-- Creates durable mood check-ins with one entry per user per day.
create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('good', 'okay', 'struggling')),
  checkin_date date not null default timezone('utc', now())::date,
  created_at timestamptz not null default now()
);

create unique index if not exists mood_checkins_user_day_uidx
  on public.mood_checkins (user_id, checkin_date);

create index if not exists mood_checkins_user_created_idx
  on public.mood_checkins (user_id, created_at desc);

alter table public.mood_checkins enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mood_checkins'
      and policyname = 'Users can read own mood check-ins'
  ) then
    create policy "Users can read own mood check-ins"
      on public.mood_checkins
      for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mood_checkins'
      and policyname = 'Users can insert own mood check-ins'
  ) then
    create policy "Users can insert own mood check-ins"
      on public.mood_checkins
      for insert
      with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mood_checkins'
      and policyname = 'Users can update own mood check-ins'
  ) then
    create policy "Users can update own mood check-ins"
      on public.mood_checkins
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;
