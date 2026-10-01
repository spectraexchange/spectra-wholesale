-- Allow the Disposable and Merchandise categories. The old build offered both
-- in its product form, but the live check constraint rejected them.
alter table products drop constraint if exists products_category_check;
alter table products add constraint products_category_check check (category in (
  'flower', 'concentrate', 'cartridge', 'preroll', 'edible',
  'disposable', 'topical', 'tincture', 'merchandise', 'other'
));
