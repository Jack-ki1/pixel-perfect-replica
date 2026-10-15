-- TEMPORARY review mode: open demo data without sign-in. Revert before real data is loaded.
grant select on public.artists, public.audience_snapshots, public.audit_log, public.artist_notes to anon;
grant update (pipeline_stage) on public.artists to anon;
create policy "review mode read artists" on public.artists for select to anon using (is_demo);
create policy "review mode move artists" on public.artists for update to anon using (is_demo) with check (is_demo);
create policy "review mode read snapshots" on public.audience_snapshots for select to anon using (true);
create policy "review mode read audit" on public.audit_log for select to anon using (true);
create policy "review mode read notes" on public.artist_notes for select to anon using (true);