'use client';

import React, { useEffect, useState } from 'react';
import {
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

function initialsFrom(name?: string, email?: string) {
  const source = (name || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/sync', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load profile');
        if (cancelled) return;
        setProfile({
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'user',
          phone: data.phone || '',
          avatarUrl: data.avatarUrl || null,
        });
        setName(data.name || '');
        setPhone(data.phone || '');
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load profile';
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!name.trim()) {
      const message = 'Name is required';
      setError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      setProfile((prev) => (prev ? { ...prev, name: name.trim(), phone: phone.trim() } : prev));
      toast.success('Profile updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Profile" description="Your account details and avatar." />
      <SectionPanel title="Account" description={loading ? 'Loading…' : profile?.email || ''}>
        {error && <ErrorBanner message={error} />}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-lg font-bold">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                initialsFrom(name, profile?.email)
              )}
            </div>
            <div>
              <p className="text-base font-semibold">{name || '—'}</p>
              <p className="text-sm capitalize text-muted-foreground">{profile?.role || 'user'}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Full name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <InputField label="Email" value={profile?.email || ''} disabled />
            <InputField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            <InputField label="Role" value={profile?.role || ''} disabled className="capitalize" />
          </div>
          <div className="flex justify-end">
            <PortButton variant="primary" type="submit" disabled={loading || saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </PortButton>
          </div>
        </form>
      </SectionPanel>
    </div>
  );
}
