CREATE TABLE public.radar_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), config jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.radar_settings TO anon, authenticated;
GRANT ALL ON public.radar_settings TO service_role;
ALTER TABLE public.radar_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.radar_settings FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.live_artists ADD COLUMN IF NOT EXISTS wiki_checked boolean NOT NULL DEFAULT false;
ALTER TABLE public.live_artists ADD COLUMN IF NOT EXISTS wiki_famous boolean NOT NULL DEFAULT false;
ALTER TABLE public.live_artists ADD COLUMN IF NOT EXISTS excluded_reason text;