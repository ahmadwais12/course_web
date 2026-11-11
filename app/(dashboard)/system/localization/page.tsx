'use client';

import SettingsForm, { type SettingField } from '@/components/system/SettingsForm';

const FIELDS: SettingField[] = [
  {
    key: 'dateFormat',
    label: 'Date format',
    type: 'select',
    options: [
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    ],
  },
  {
    key: 'timeFormat',
    label: 'Time format',
    type: 'select',
    options: [
      { value: '24h', label: '24-hour' },
      { value: '12h', label: '12-hour' },
    ],
  },
  {
    key: 'timezone',
    label: 'Timezone',
    type: 'select',
    options: [
      { value: 'Asia/Kabul', label: 'Asia/Kabul' },
      { value: 'Asia/Karachi', label: 'Asia/Karachi' },
      { value: 'Asia/Dubai', label: 'Asia/Dubai' },
      { value: 'Asia/Tehran', label: 'Asia/Tehran' },
      { value: 'Europe/London', label: 'Europe/London' },
      { value: 'America/New_York', label: 'America/New_York' },
      { value: 'UTC', label: 'UTC' },
    ],
  },
  {
    key: 'numberFormat',
    label: 'Number format',
    type: 'select',
    options: [
      { value: 'en-US', label: '1,234.56 (English)' },
      { value: 'de-DE', label: '1.234,56 (European)' },
      { value: 'fa-IR', label: 'Persian numerals' },
    ],
  },
  {
    key: 'weekStart',
    label: 'Week starts on',
    type: 'select',
    options: [
      { value: 'Monday', label: 'Monday' },
      { value: 'Sunday', label: 'Sunday' },
      { value: 'Saturday', label: 'Saturday' },
    ],
  },
  {
    key: 'rtl',
    label: 'Right-to-left layout',
    type: 'toggle',
    hint: 'Mirror the interface for Dari, Pashto, or Arabic',
  },
];

const DEFAULTS = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  timezone: 'Asia/Kabul',
  numberFormat: 'en-US',
  weekStart: 'Monday',
  rtl: false,
};

export default function LocalizationSettingsPage() {
  return (
    <SettingsForm
      scope="localization"
      title="Localization"
      description="Date, time, number, and layout preferences for your region."
      sectionTitle="Regional formats"
      sectionDescription="These formats apply to tables, reports, documents, and exported files."
      fields={FIELDS}
      defaults={DEFAULTS}
    />
  );
}
