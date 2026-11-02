-- Public business profile fields used by /business/create
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text;
