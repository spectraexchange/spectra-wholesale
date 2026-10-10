-- Vendors can attach their current menu to an access request ("Send us your menu.
-- We'll build your store."). Spectra imports it with Admin → Company → Import.

-- Private bucket; staff open files through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-menus',
  'vendor-menus',
  false,
  26214400,  -- 25 MB
  array[
    'application/pdf',
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp'
  ]
)
on conflict (id) do nothing;

alter table access_requests add column if not exists menu_path text;  -- object path in vendor-menus
alter table companies       add column if not exists menu_path text;  -- copied on approval
