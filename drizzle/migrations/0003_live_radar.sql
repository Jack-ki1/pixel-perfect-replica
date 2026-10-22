create table public.live_artists (
  id uuid primary key default gen_random_uuid(),
  deezer_id bigint unique not null,
  name text not null,
  picture text,
  link text,
  nb_fan int not null default 0,
  nb_album int not null default 0,
  country text,
  region_source text,
  mbid text,
  mb_checked boolean not null default false,
  seed_sources text[] not null default '{}',
  playlist_hits int not null default 0,
  top_rank int,
  latest_release date,
  releases_12m int,
  discovery_score numeric,
  features jsonb not null default '{}',
  first_seen timestamptz not null default now(),
  last_scanned timestamptz not null default now()
);
create table public.live_snapshots (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.live_artists(id) on delete cascade,
  captured_at timestamptz not null default now(),
  nb_fan int not null,
  top_rank int,
  playlist_hits int not null default 0
);
create index live_snapshots_artist_idx on public.live_snapshots(artist_id, captured_at);
create table public.live_analyses (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.live_artists(id) on delete cascade,
  week_start date not null,
  track_id bigint,
  track_title text,
  track_link text,
  deezer_bpm numeric,
  result jsonb not null,
  overall numeric,
  model text not null,
  created_at timestamptz not null default now(),
  unique (artist_id, week_start)
);
create table public.live_decisions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.live_artists(id) on delete cascade,
  decision text not null check (decision in ('shortlist','meet','pass')),
  note text,
  created_at timestamptz not null default now()
);
create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}',
  error text
);
grant select on public.live_artists, public.live_snapshots, public.live_analyses, public.discovery_runs to anon, authenticated;
grant select, insert on public.live_decisions to anon, authenticated;
grant all on public.live_artists, public.live_snapshots, public.live_analyses, public.live_decisions, public.discovery_runs to service_role;
alter table public.live_artists enable row level security;
alter table public.live_snapshots enable row level security;
alter table public.live_analyses enable row level security;
alter table public.live_decisions enable row level security;
alter table public.discovery_runs enable row level security;
create policy "review mode read" on public.live_artists for select to anon, authenticated using (true);
create policy "review mode read" on public.live_snapshots for select to anon, authenticated using (true);
create policy "review mode read" on public.live_analyses for select to anon, authenticated using (true);
create policy "review mode read" on public.discovery_runs for select to anon, authenticated using (true);
create policy "review mode read" on public.live_decisions for select to anon, authenticated using (true);
create policy "review mode decide" on public.live_decisions for insert to anon, authenticated with check (true);
comment on table public.artists is 'DEPRECATED: demo data, replaced by live_artists';
comment on table public.audience_snapshots is 'DEPRECATED: demo data';
comment on table public.saved_searches is 'DEPRECATED: replaced by 3-section live redesign';
comment on table public.integrity_cases is 'DEPRECATED: replaced by 3-section live redesign';
comment on table public.artistic_reviews is 'DEPRECATED: replaced by live_analyses';
comment on table public.alerts is 'DEPRECATED: replaced by 3-section live redesign';
comment on table public.dev_tasks is 'DEPRECATED: replaced by 3-section live redesign';