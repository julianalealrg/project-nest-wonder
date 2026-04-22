
insert into storage.buckets (id, name, public)
values ('os-pdfs', 'os-pdfs', true)
on conflict (id) do nothing;

create policy "os-pdfs public read"
on storage.objects for select
using (bucket_id = 'os-pdfs');

create policy "os-pdfs authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'os-pdfs');
