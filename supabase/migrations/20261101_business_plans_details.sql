ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AFN',
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS duration_months integer,
  ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS max_storage_mb integer,
  ADD COLUMN IF NOT EXISTS max_branches integer,
  ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

UPDATE public.business_plans
SET
  price = COALESCE(price, 0),
  currency = COALESCE(NULLIF(currency, ''), 'AFN'),
  billing_interval = COALESCE(NULLIF(billing_interval, ''), 'monthly'),
  trial_days = COALESCE(trial_days, 0),
  features = COALESCE(features, '{}'::text[]),
  sort_order = COALESCE(sort_order, 0)
WHERE true;

UPDATE public.business_plans
SET
  duration_months = 1,
  trial_days = 14,
  max_users = 50,
  max_storage_mb = 1024,
  max_branches = 1,
  features = ARRAY['Core dashboard', 'Students & courses', 'Email support'],
  sort_order = 1,
  price = 0
WHERE slug = 'standard';

UPDATE public.business_plans
SET
  duration_months = 1,
  trial_days = 7,
  max_users = 200,
  max_storage_mb = 5120,
  max_branches = 5,
  features = ARRAY['Everything in Standard', 'Branches', 'Reports', 'Priority support'],
  sort_order = 2,
  price = 2500,
  billing_interval = 'monthly'
WHERE slug = 'pro';

UPDATE public.business_plans
SET
  duration_months = 12,
  trial_days = 0,
  max_users = NULL,
  max_storage_mb = 20480,
  max_branches = NULL,
  features = ARRAY['Everything in Pro', 'Unlimited users', 'Custom branding', 'Dedicated support'],
  sort_order = 3,
  price = 7500,
  billing_interval = 'yearly'
WHERE slug = 'enterprise';
