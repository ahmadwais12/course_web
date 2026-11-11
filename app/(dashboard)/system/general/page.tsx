'use client';

import SettingsForm, { type SettingField } from '@/components/system/SettingsForm';

const FIELDS: SettingField[] = [
  { key: 'name', label: 'Institute name', type: 'text', required: true },
  { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Learn. Grow. Succeed.' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'website', label: 'Website', type: 'url', placeholder: 'https://…' },
  {
    key: 'description',
    label: 'About the institute',
    type: 'textarea',
    placeholder: 'Short description shown on public pages',
  },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
];

const DEFAULTS = {
  name: '',
  tagline: '',
  email: '',
  phone: '',
  website: '',
  description: '',
  address: '',
  city: '',
  country: '',
};

export default function GeneralSettingsPage() {
  return (
    <SettingsForm
      scope="general"
      title="General Settings"
      description="Institute identity and contact details used across the app and public pages."
      sectionTitle="Institute profile"
      sectionDescription="This information appears in headers, documents, and your public business page."
      fields={FIELDS}
      defaults={DEFAULTS}
    />
  );
}
