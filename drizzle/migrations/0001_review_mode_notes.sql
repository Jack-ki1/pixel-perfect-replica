grant insert on public.artist_notes to anon;
create policy "review mode add notes" on public.artist_notes for insert to anon with check (author_id = '00000000-0000-0000-0000-000000000000'::uuid);