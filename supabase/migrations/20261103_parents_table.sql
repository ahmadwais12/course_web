-- Parents registry used by parent_students (course_web uses users, not profiles).

CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  profile_id uuid REFERENCES public.users(id),
  full_name text NOT NULL,
  phone text,
  email text,
  occupation text,
  address text,
  is_guardian boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parents_tenant_id ON public.parents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_parents_profile_id ON public.parents (profile_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON public.parents (email);

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
