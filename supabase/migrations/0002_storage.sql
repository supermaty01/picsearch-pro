-- PicSearch Pro — storage bucket for uploaded images (FR-1, docs/03-data-model.md §4).
-- Append-only migration. Applied via Supabase CLI (`supabase db push`) or SQL editor.
--
-- The Worker (service role) writes objects; the public reads them through the
-- bucket's public URL. Upload MIME/size are ALSO enforced in the Worker
-- (NFR-5) — the bucket limits are defense in depth, never the only check.

-- ---------------------------------------------------------------------------
-- Bucket: public-read `images`, 10 MB cap, image MIME allow-list.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'images',
    'images',
    true,
    10485760, -- 10 MB (matches the Worker cap; keep in sync with UPLOAD_LIMITS)
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Object policies. RLS on storage.objects is enabled by Supabase by default.
-- The service role bypasses RLS, so the Worker can upload without a policy;
-- we add ONLY a public-read policy so anonymous browsers can fetch images
-- via the public URL. No anon insert/update/delete (NFR-5).
-- ---------------------------------------------------------------------------
drop policy if exists "Public read access to images bucket" on storage.objects;
create policy "Public read access to images bucket"
    on storage.objects
    for select
    to public
    using (bucket_id = 'images');
