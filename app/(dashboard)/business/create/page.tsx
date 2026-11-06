'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PortButton,
  TextAreaField,
} from '@/components/ports';
import PageHeader from '@/components/ports/PageHeader';
import { toast } from '@/components/ui/Toast';
import { BUSINESS_STATUSES, toSlug } from '@/lib/business';
import { isReservedBusinessSlug, publicBusinessUrl } from '@/lib/business-url';
import { isActiveBusinessPlan, type BusinessPlanRow } from '@/lib/business-plans';
import type { BusinessTypeRow } from '@/lib/business-types';
import { AFGHANISTAN_CITIES } from '@/lib/cities';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Details', hint: 'Bio and profile' },
  { id: 2, title: 'Logo', hint: 'Square brand mark' },
  { id: 3, title: 'Cover', hint: 'Wide header image' },
] as const;

type ImagePick = {
  file: File | null;
  preview: string | null;
  url: string | null;
};

const emptyImage: ImagePick = { file: null, preview: null, url: null };

export default function CreateBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [bio, setBio] = useState('');
  const [tagline, setTagline] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Afghanistan');
  const [services, setServices] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [plan, setPlan] = useState('');
  const [plans, setPlans] = useState<BusinessPlanRow[]>([]);
  const [businessTypeId, setBusinessTypeId] = useState('');
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeRow[]>([]);
  const status = 'pending' as const;
  const [logo, setLogo] = useState<ImagePick>(emptyImage);
  const [cover, setCover] = useState<ImagePick>(emptyImage);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantCode, setTenantCode] = useState('');
  const [origin, setOrigin] = useState('');

  const activePlans = useMemo(
    () => plans.filter((item) => isActiveBusinessPlan(item)),
    [plans]
  );

  const planOptions = useMemo(
    () => activePlans.map((item) => ({ value: item.slug, label: item.name })),
    [activePlans]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [typesRes, plansRes, codeRes] = await Promise.all([
          fetch('/api/business-types'),
          fetch('/api/business-plans'),
          fetch('/api/businesses/next-code?type=central'),
        ]);
        const typesData = await typesRes.json();
        const plansData = await plansRes.json();
        const codeData = await codeRes.json();
        if (!typesRes.ok) throw new Error(typesData.error || 'Failed to load business types');
        if (!plansRes.ok) throw new Error(plansData.error || 'Failed to load plans');
        if (cancelled) return;
        const rows = (Array.isArray(typesData) ? typesData : []).filter(
          (t: BusinessTypeRow) => t.status === 'active' || (t.status == null && t.is_active)
        );
        const planRows = (Array.isArray(plansData) ? plansData : []).filter((item: BusinessPlanRow) =>
          isActiveBusinessPlan(item)
        );
        setBusinessTypes(rows);
        setBusinessTypeId((prev) => prev || rows[0]?.id || '');
        setPlans(Array.isArray(plansData) ? plansData : []);
        setPlan((prev) => prev || planRows[0]?.slug || '');
        if (codeRes.ok && codeData.tenant_code) setTenantCode(String(codeData.tenant_code));
      } catch (err) {
        if (!cancelled) {
          setBusinessTypes([]);
          toast.error(err instanceof Error ? err.message : 'Failed to load business types');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = useMemo(
    () => businessTypes.map((t) => ({ value: t.id, label: t.name })),
    [businessTypes]
  );

  const cityOptions = useMemo(
    () => AFGHANISTAN_CITIES.map((item) => ({ value: item.name, label: item.name })),
    []
  );

  const selectedType = useMemo(
    () => businessTypes.find((t) => t.id === businessTypeId) ?? null,
    [businessTypes, businessTypeId]
  );

  const statusOptions = useMemo(
    () => BUSINESS_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  };

  const validateStep1 = () => {
    if (!name.trim() || !slug.trim()) {
      const message = 'Name and slug are required';
      setError(message);
      toast.error(message);
      return false;
    }
    if (isReservedBusinessSlug(slug)) {
      const message = 'This slug is reserved. Choose another public URL.';
      setError(message);
      toast.error(message);
      return false;
    }
    if (!businessTypeId) {
      const message = 'Select a business type';
      setError(message);
      toast.error(message);
      return false;
    }
    if (!plan) {
      const message = 'Select a plan';
      setError(message);
      toast.error(message);
      return false;
    }
    if (!bio.trim()) {
      const message = 'Add a bio about this business';
      setError(message);
      toast.error(message);
      return false;
    }
    setError(null);
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const uploadImage = async (kind: 'logo' | 'cover', file: File) => {
    setUploading(kind);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', kind);
      const res = await fetch('/api/businesses/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return String(data.url);
    } finally {
      setUploading(null);
    }
  };

  const pickImage = async (kind: 'logo' | 'cover', file: File | undefined) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const setter = kind === 'logo' ? setLogo : setCover;
    setter({ file, preview, url: null });
    try {
      const url = await uploadImage(kind, file);
      setter({ file, preview, url });
      toast.success(kind === 'logo' ? 'Logo uploaded' : 'Cover uploaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let logoUrl = logo.url;
      let coverUrl = cover.url;
      if (logo.file && !logoUrl) logoUrl = await uploadImage('logo', logo.file);
      if (cover.file && !coverUrl) coverUrl = await uploadImage('cover', cover.file);

      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          bio: bio.trim() || null,
          tagline: tagline.trim() || null,
          website: website.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          services,
          working_hours_display: workingHours.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          plan,
          status,
          organization_type: 'central',
          logo_url: logoUrl,
          cover_url: coverUrl,
          business_type_id: selectedType?.id || businessTypeId,
          business_type_name: selectedType?.name || null,
          business_type_slug: selectedType?.slug || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create business');
      toast.success(
        data.tenant_code
          ? `Business created as Pending · ${data.tenant_code}`
          : 'Business created as Pending'
      );
      router.push('/business');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create business';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Create Business"
        description="Collect the business bio and profile details, then add logo and cover images."
        pill={`STEP ${step}/3`}
        pillTone="neutral"
        actions={
          <PortButton variant="ghost" onClick={() => router.push('/business')}>
            Back to list
          </PortButton>
        }
      />

      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((item) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <li
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                active
                  ? 'border-[#88b6ff] bg-[#88b6ff]/15'
                  : done
                    ? 'border-border bg-muted/60'
                    : 'border-border bg-card'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  active || done ? 'bg-[#88b6ff] text-[#142033]' : 'bg-muted text-muted-foreground'
                )}
              >
                {item.id}
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {error && <ErrorBanner message={error} />}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <InputField
                label="Business name"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. DreamFlow Academy"
              />
            </div>
            <InputField
              label="Slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(toSlug(e.target.value));
              }}
              hint="Becomes the public URL path"
            />
            <InputField
              label="Business code"
              value={tenantCode}
              disabled
              placeholder="Loading code…"
              hint="Generated by the system. This number is saved when you create the business."
            />
            <div className="sm:col-span-2">
              <InputField
                label="Public URL"
                value={
                  slug
                    ? publicBusinessUrl(slug, origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999'))
                    : ''
                }
                readOnly
                placeholder="Type a name or slug to preview the public URL"
                hint="This is the live site address for this business. It updates as you change the slug."
              />
            </div>
            <Dropdown
              label="Business type"
              value={businessTypeId}
              onChange={setBusinessTypeId}
              options={typeOptions}
              placeholder={typeOptions.length ? 'Select a type' : 'No types yet — add one in Portable'}
              filter={typeOptions.length > 6}
            />
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <InputField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Dropdown
              label="Plan"
              value={plan}
              onChange={setPlan}
              options={planOptions}
              placeholder={planOptions.length ? 'Select a plan' : 'No plans yet — add one in Portable'}
              filter={planOptions.length > 6}
            />
            <Dropdown
              label="Status"
              value={status}
              onChange={() => undefined}
              options={statusOptions}
              disabled
              hint="New businesses start as Pending. Change the status from the business page after create."
            />
            <InputField
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
            <Dropdown
              label="City"
              value={city}
              onChange={setCity}
              options={cityOptions}
              placeholder="Select a city"
              filter
            />
            <InputField
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <InputField
              label="Working hours"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              placeholder="Sat–Thu 8:00 AM – 5:00 PM"
            />
            <div className="sm:col-span-2">
              <InputField
                label="Tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Short line shown on the public site"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Bio"
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                hint="Tell people about this business. This is shown on the public page."
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Services"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                rows={3}
                hint="Separate services with commas, for example English, IELTS, Computer"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Internal note"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                hint="Optional staff-only note. Status change notes are stored separately."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <ImageStep
            title="Logo image"
            hint="Square PNG or JPG works best. This is the business mark."
            kind="logo"
            image={logo}
            uploading={uploading === 'logo'}
            onPick={(file) => pickImage('logo', file)}
            onClear={() => setLogo(emptyImage)}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <ImageStep
              title="Cover image"
              hint="Wide image for the business header (JPG, PNG, WEBP)."
              kind="cover"
              image={cover}
              uploading={uploading === 'cover'}
              onPick={(file) => pickImage('cover', file)}
              onClear={() => setCover(emptyImage)}
            />
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <p className="font-semibold">{name || 'Untitled business'}</p>
              <p className="text-muted-foreground">
                {slug ? publicBusinessUrl(slug, origin || 'http://localhost:9999') : 'no-slug'}
                {selectedType ? ` · ${selectedType.name}` : ''}
                {city ? ` · ${city}` : ''}
                {country ? `, ${country}` : ''}
              </p>
              {tagline && <p className="mt-2 text-sm">{tagline}</p>}
              {bio && <p className="mt-2 text-sm leading-relaxed">{bio}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Logo {logo.url || logo.preview ? 'ready' : 'skipped'} · Cover{' '}
                {cover.url || cover.preview ? 'ready' : 'skipped'}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2 border-t border-border">
          <PortButton
            variant="ghost"
            type="button"
            onClick={step === 1 ? () => router.push('/business') : goBack}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </PortButton>
          {step < 3 ? (
            <PortButton variant="primary" type="button" onClick={goNext}>
              Continue
            </PortButton>
          ) : (
            <PortButton
              variant="primary"
              type="button"
              disabled={submitting || uploading !== null}
              onClick={handleSubmit}
            >
              {submitting ? 'Creating…' : 'Create Business'}
            </PortButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageStep({
  title,
  hint,
  kind,
  image,
  uploading,
  onPick,
  onClear,
}: {
  title: string;
  hint: string;
  kind: 'logo' | 'cover';
  image: ImagePick;
  uploading: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tall = kind === 'cover';

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-[#88b6ff] hover:bg-[#88b6ff]/10',
          tall ? 'h-48' : 'h-40'
        )}
      >
        {image.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.preview} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm">
            <ImagePlus size={28} />
            {uploading ? 'Uploading…' : `Choose ${kind} image`}
          </span>
        )}
      </button>
      {image.preview && (
        <div className="flex justify-end">
          <PortButton
            variant="ghost"
            type="button"
            onClick={() => {
              if (image.preview) URL.revokeObjectURL(image.preview);
              onClear();
            }}
          >
            <X size={14} />
            Remove
          </PortButton>
        </div>
      )}
    </div>
  );
}
