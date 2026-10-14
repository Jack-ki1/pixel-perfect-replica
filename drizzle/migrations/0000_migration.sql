create type public.app_role as enum ('admin','head_of_ar','scout','analyst','artist_dev');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_team(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id) $$;

create policy "team reads profiles" on public.profiles for select to authenticated using (public.is_team(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own roles or admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id,'scout');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create type public.pipeline_stage as enum ('identified','watchlist','investigation','artistic_review','contact','live_audition','development','negotiation','signed','passed');
create type public.integrity_class as enum ('organic','paid_promo','unknown','suspicious','confirmed_invalid');

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  canonical_id text unique not null,
  name text not null,
  aliases text[] not null default '{}',
  country text not null,
  city text not null,
  genre text not null,
  language text not null,
  stage text not null,
  portrait_seed int not null default 1,
  is_demo boolean not null default true,
  unsigned boolean not null default true,
  pipeline_stage pipeline_stage not null default 'identified',
  scout_owner text,
  next_action text,
  next_action_due date,
  integrity integrity_class not null default 'unknown',
  artistic_status text not null default 'Not reviewed',
  audience_current int not null,
  growth_30d numeric not null,
  expected_growth_30d numeric not null,
  evidence_confidence int not null,
  scores jsonb not null default '{}',
  series jsonb not null default '[]',
  events jsonb not null default '[]',
  why_now text,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  reference_date date not null,
  window_days int not null,
  source text not null,
  total int not null,
  segments jsonb not null
);
create table public.artist_notes (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity text not null,
  entity_id uuid,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
grant select, update on public.artists to authenticated;
grant all on public.artists to service_role;
grant select on public.audience_snapshots to authenticated;
grant all on public.audience_snapshots to service_role;
grant select, insert on public.artist_notes to authenticated;
grant all on public.artist_notes to service_role;
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.artists enable row level security;
alter table public.audience_snapshots enable row level security;
alter table public.artist_notes enable row level security;
alter table public.audit_log enable row level security;
create policy "team reads artists" on public.artists for select to authenticated using (public.is_team(auth.uid()));
create policy "ar roles update artists" on public.artists for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'head_of_ar') or public.has_role(auth.uid(),'scout'));
create policy "team reads snapshots" on public.audience_snapshots for select to authenticated using (public.is_team(auth.uid()));
create policy "team reads notes" on public.artist_notes for select to authenticated using (public.is_team(auth.uid()));
create policy "team adds notes" on public.artist_notes for insert to authenticated with check (public.is_team(auth.uid()) and author_id = auth.uid());
create policy "team reads audit" on public.audit_log for select to authenticated using (public.is_team(auth.uid()));

create or replace function public.audit_artist_stage() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if new.pipeline_stage is distinct from old.pipeline_stage then
    if new.pipeline_stage = 'signed' and not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'head_of_ar')) then
      raise exception 'Only Head of A&R or Admin can mark an artist as signed';
    end if;
    insert into public.audit_log(actor_id, entity, entity_id, action, detail)
    values (auth.uid(), 'artist', new.id, 'stage_change', jsonb_build_object('from', old.pipeline_stage, 'to', new.pipeline_stage, 'artist', new.name));
  end if;
  return new;
end $$;
create trigger artists_stage_audit before update on public.artists for each row execute function public.audit_artist_stage();

-- DEMO seed (synthetic)
insert into public.artists (canonical_id,name,aliases,country,city,genre,language,stage,portrait_seed,pipeline_stage,scout_owner,next_action,next_action_due,integrity,artistic_status,audience_current,growth_30d,expected_growth_30d,evidence_confidence,scores,series,events,why_now,evidence) values
('BR-KE-0001','Nia K.','{"Nia Kamau"}','Kenya','Nairobi','R&B / Soul','English, Swahili','Local → Regional',1,'investigation','A. Otieno','Request artist-provided analytics','2026-10-20','organic','Review due',28400,186,42,82,
 '{"momentum":94,"fan_depth":87,"ugc_impact":83,"audience_evolution":88,"catalogue":71,"artistic":null,"market_expansion":91,"organic":92,"data_confidence":82,"priority":94}',
 '[{"m":"Apr","a":6200,"e":6000},{"m":"May","a":8100,"e":6900},{"m":"Jun","a":11200,"e":7800},{"m":"Jul","a":15900,"e":8800},{"m":"Aug","a":21000,"e":9900},{"m":"Sep","a":28400,"e":11100}]',
 '[{"d":"2026-05-12","type":"release","label":"Single \"Mvua\""},{"d":"2026-07-03","type":"ugc","label":"Fan cover trend on TikTok"},{"d":"2026-08-21","type":"live","label":"Sold-out Alliance Française show"},{"d":"2026-09-10","type":"shift","label":"Kampala listeners cross 10%"}]',
 'Growth is 4.4× the expected curve for Nairobi R&B artists at this stage, driven by fan covers rather than official posts. The audience has broadened from 18–24 Nairobi listeners toward 25–34 and Kampala in two snapshots.',
 '{"facts":["UGC volume +342% (30d, demo fixture)","3 tracks growing simultaneously","No paid campaign recorded"],"hypotheses":["Kampala growth may follow a Ugandan creator remix"],"limitations":["No licensed TikTok demographic data","Streaming counts from demo fixture"],"actions":["Book artistic review","Contact management"]}'),
('BR-KE-0002','Sage Mwangi','{}','Kenya','Mombasa','Afrobeat','Swahili, English','Local Breakout',2,'watchlist','A. Otieno','Monitor next release','2026-10-25','paid_promo','Not reviewed',16700,142,38,76,
 '{"momentum":87,"fan_depth":72,"ugc_impact":79,"audience_evolution":70,"catalogue":64,"artistic":null,"market_expansion":68,"organic":74,"data_confidence":76,"priority":87}',
 '[{"m":"Apr","a":5100,"e":5000},{"m":"May","a":6000,"e":5600},{"m":"Jun","a":7400,"e":6100},{"m":"Jul","a":9800,"e":6700},{"m":"Aug","a":13100,"e":7300},{"m":"Sep","a":16700,"e":7900}]',
 '[{"d":"2026-06-01","type":"campaign","label":"Disclosed paid playlist push"},{"d":"2026-08-14","type":"release","label":"EP \"Pwani\""}]',
 'Momentum is strong but partly explained by a disclosed paid promotion in June; organic share recovered after the campaign ended.',
 '{"facts":["Paid campaign disclosed by management"],"hypotheses":["Coastal festival circuit driving repeat listens"],"limitations":["Campaign spend not shared"],"actions":["Wait one snapshot post-campaign"]}'),
('BR-UG-0001','Khalil M.','{"Khalil Mugisha"}','Uganda','Kampala','Hip-Hop','Luganda, English','Emerging',3,'artistic_review','J. Nakato','Blind review of 3 tracks','2026-10-18','organic','In review',42100,121,36,71,
 '{"momentum":83,"fan_depth":80,"ugc_impact":66,"audience_evolution":77,"catalogue":82,"artistic":78,"market_expansion":74,"organic":88,"data_confidence":71,"priority":83}',
 '[{"m":"Apr","a":14000,"e":14000},{"m":"May","a":17000,"e":15100},{"m":"Jun","a":21500,"e":16300},{"m":"Jul","a":27000,"e":17500},{"m":"Aug","a":34600,"e":18800},{"m":"Sep","a":42100,"e":20100}]',
 '[{"d":"2026-06-20","type":"press","label":"Featured on local radio"},{"d":"2026-09-01","type":"release","label":"Mixtape \"Kibuga\""}]',
 'Deep catalogue with consistent growth across releases; Luganda lyrics resonating with returning listeners.',
 '{"facts":["Catalogue of 24 tracks","Returning listener share rising"],"hypotheses":["Nairobi expansion feasible"],"limitations":["Limited live data"],"actions":["Complete blind review"]}'),
('BR-TZ-0001','Amara T.','{}','Tanzania','Dar es Salaam','Afro-Pop','Swahili','Local',4,'identified',null,'Assign scout',null,'unknown','Not reviewed',19800,118,32,66,
 '{"momentum":81,"fan_depth":61,"ugc_impact":74,"audience_evolution":58,"catalogue":null,"artistic":null,"market_expansion":63,"organic":null,"data_confidence":58,"priority":81}',
 '[{"m":"Apr","a":7000,"e":7000},{"m":"May","a":8000,"e":7500},{"m":"Jun","a":9600,"e":8000},{"m":"Jul","a":12200,"e":8600},{"m":"Aug","a":15500,"e":9200},{"m":"Sep","a":19800,"e":9800}]',
 '[{"d":"2026-08-02","type":"ugc","label":"Dance challenge emerges"}]',
 'Fast-rising dance challenge; evidence still thin — catalogue and integrity not yet assessable.',
 '{"facts":["Dance challenge active"],"hypotheses":["Could be one-hit viral"],"limitations":["Only 2 released tracks"],"actions":["Assign scout"]}'),
('BR-NG-0001','Tobi A.','{"Tobi Adeyemi"}','Nigeria','Lagos','Afrobeats','English, Yoruba','Emerging',5,'investigation','K. Mensah','Integrity review of Aug spike','2026-10-16','suspicious','Not reviewed',55300,164,40,61,
 '{"momentum":89,"fan_depth":52,"ugc_impact":48,"audience_evolution":60,"catalogue":69,"artistic":null,"market_expansion":71,"organic":54,"data_confidence":61,"priority":72}',
 '[{"m":"Apr","a":18000,"e":18000},{"m":"May","a":19500,"e":19300},{"m":"Jun","a":21000,"e":20600},{"m":"Jul","a":23500,"e":22000},{"m":"Aug","a":47000,"e":23400},{"m":"Sep","a":55300,"e":24900}]',
 '[{"d":"2026-08-05","type":"shift","label":"Abrupt stream spike (+100% in 4 days)"}]',
 'Large August jump not matched by UGC or follower growth. Advisory only — needs reviewer explanation before ranking.',
 '{"facts":["Stream/engagement ratio 3.1× baseline"],"hypotheses":["Playlist placement may explain spike"],"limitations":["No playlist source data"],"actions":["Open integrity case"]}'),
('BR-GH-0001','Efua B.','{}','Ghana','Accra','Highlife Fusion','English, Twi','Local → Regional',6,'contact','K. Mensah','Intro call with manager','2026-10-15','organic','Passed',23900,96,30,79,
 '{"momentum":76,"fan_depth":84,"ugc_impact":70,"audience_evolution":72,"catalogue":77,"artistic":86,"market_expansion":69,"organic":90,"data_confidence":79,"priority":80}',
 '[{"m":"Apr","a":10000,"e":10000},{"m":"May","a":11500,"e":10700},{"m":"Jun","a":13400,"e":11400},{"m":"Jul","a":16000,"e":12100},{"m":"Aug","a":19800,"e":12900},{"m":"Sep","a":23900,"e":13700}]',
 '[{"d":"2026-07-15","type":"live","label":"Chale Wote festival set"}]',
 'Strong artistic review consensus and loyal core audience; growth is steady, not spiky.',
 '{"facts":["Artistic consensus 86/100 (3 reviewers)"],"hypotheses":["Diaspora UK audience emerging"],"limitations":["UK data unlicensed"],"actions":["Manager call"]}'),
('BR-ZA-0001','Lerato N.','{}','South Africa','Johannesburg','Amapiano','Zulu, English','Emerging',7,'watchlist','T. Dlamini','Watch Q4 release',null,'organic','Not reviewed',31200,63,28,74,
 '{"momentum":70,"fan_depth":75,"ugc_impact":81,"audience_evolution":79,"catalogue":66,"artistic":null,"market_expansion":84,"organic":86,"data_confidence":74,"priority":76}',
 '[{"m":"Apr","a":19000,"e":19000},{"m":"May","a":20500,"e":20100},{"m":"Jun","a":22100,"e":21200},{"m":"Jul","a":24300,"e":22400},{"m":"Aug","a":27600,"e":23600},{"m":"Sep","a":31200,"e":24900}]',
 '[{"d":"2026-09-05","type":"shift","label":"Nairobi Amapiano cluster forming"}]',
 'Amapiano × East African crossover — audience in Nairobi growing faster than home market.',
 '{"facts":["Nairobi share 4%→11%"],"hypotheses":["Cross-regional collab opportunity"],"limitations":["Small Nairobi sample"],"actions":["Watch Q4 release"]}');

insert into public.audience_snapshots (artist_id, reference_date, window_days, source, total, segments)
select id, d.ref, 30, 'DEMO fixture (synthetic)', round(audience_current * d.f)::int, d.seg
from public.artists a,
lateral (values
  ('2026-08-15'::date, 0.62, jsonb_build_object('age', '{"18-24":51,"25-34":32,"35-44":12,"45+":5}'::jsonb, 'city', jsonb_build_object(a.city,64,'Other home',22,'Cross-border',14), 'new_vs_returning','{"new":58,"returning":42}'::jsonb, 'platform','{"Streaming":55,"TikTok":30,"YouTube":15}'::jsonb)),
  ('2026-09-14'::date, 1.0, jsonb_build_object('age', '{"18-24":42,"25-34":38,"35-44":15,"45+":5}'::jsonb, 'city', jsonb_build_object(a.city,51,'Other home',23,'Cross-border',26), 'new_vs_returning','{"new":47,"returning":53}'::jsonb, 'platform','{"Streaming":52,"TikTok":33,"YouTube":15}'::jsonb))
) as d(ref, f, seg);