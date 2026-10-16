create table public.saved_searches (id uuid primary key default gen_random_uuid(), name text not null, filters jsonb not null default '{}', created_at timestamptz not null default now());
create table public.integrity_cases (id uuid primary key default gen_random_uuid(), artist_id uuid not null references public.artists(id) on delete cascade, status text not null default 'open', reason text not null, signals jsonb not null default '[]', resolution text, is_demo boolean not null default false, created_at timestamptz not null default now(), resolved_at timestamptz);
create table public.artistic_reviews (id uuid primary key default gen_random_uuid(), artist_id uuid not null references public.artists(id) on delete cascade, reviewer text not null default 'A&R Team', scores jsonb not null default '{}', verdict text not null, notes text, created_at timestamptz not null default now());
create table public.alerts (id uuid primary key default gen_random_uuid(), artist_id uuid references public.artists(id) on delete cascade, kind text not null, title text not null, body text, is_read boolean not null default false, is_demo boolean not null default false, created_at timestamptz not null default now());
create table public.dev_tasks (id uuid primary key default gen_random_uuid(), artist_id uuid not null references public.artists(id) on delete cascade, area text not null, title text not null, due date, done boolean not null default false, created_at timestamptz not null default now());
do $$ declare t text; begin
  foreach t in array array['saved_searches','integrity_cases','artistic_reviews','alerts','dev_tasks'] loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "review mode access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
    execute format('comment on table public.%I is %L', t, 'Open access while sign-in is paused (review mode); restrict to team when sign-in returns');
  end loop;
end $$;
insert into public.integrity_cases (artist_id, reason, signals, is_demo)
select id, 'Growth spike without matching UGC or press activity', '["Listener jump +60% in 48h","Low saves-to-streams ratio","Traffic concentrated in 2 playlists"]', true from public.artists where integrity in ('suspicious','unknown');
insert into public.alerts (artist_id, kind, title, body, is_demo)
select id, 'momentum', name || ' is growing faster than expected', 'Growth ' || growth_30d || '% vs expected ' || expected_growth_30d || '% over 30 days.', true from public.artists where growth_30d > expected_growth_30d * 2;
insert into public.alerts (artist_id, kind, title, body, is_demo)
select id, 'integrity', 'Integrity review needed: ' || name, 'Unusual growth pattern flagged for human review.', true from public.artists where integrity = 'suspicious';