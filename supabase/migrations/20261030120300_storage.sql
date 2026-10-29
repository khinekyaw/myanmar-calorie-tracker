-- Photo storage.
--   meal-photos  private; each user reads and writes only "<their id>/…".
--                Photos are ~800 px JPEGs (compressed on the phone).
--   dish-photos  public (CDN); written by the team only (service role / Studio).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('meal-photos', 'meal-photos', false, 2097152, array['image/jpeg']),
  ('dish-photos', 'dish-photos', true, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads use upsert (a retried upload replaces the half-sent one), which
-- needs insert, select and update.
create policy "meal-photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "meal-photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "meal-photos: replace own" on storage.objects for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "meal-photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
