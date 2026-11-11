'use client';

import SettingsForm, { type SettingField } from '@/components/system/SettingsForm';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'dr', label: 'Dari' },
  { value: 'ps', label: 'Pashto' },
  { value: 'ar', label: 'Arabic' },
];

const FIELDS: SettingField[] = [
  {
    key: 'defaultLanguage',
    label: 'Default language',
    type: 'select',
    options: LANGUAGE_OPTIONS,
    hint: 'Used for new users and public pages',
  },
  {
    key: 'supportedLanguages',
    label: 'Enabled languages',
    type: 'multi',
    options: LANGUAGE_OPTIONS,
    hint: 'Languages offered in the language switcher',
  },
  {
    key: 'autoTranslateNotifications',
    label: 'Translate notifications',
    type: 'toggle',
    hint: 'Send each notification in the recipient’s language when a translation exists',
  },
  {
    key: 'showLanguageSwitcher',
    label: 'Show the language switcher',
    type: 'toggle',
    hint: 'Display the switcher in the header on all pages',
  },
];

const DEFAULTS = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'dr', 'ps'],
  autoTranslateNotifications: false,
  showLanguageSwitcher: true,
};

export default function LanguageSettingsPage() {
  return (
    <SettingsForm
      scope="languages"
      title="Languages"
      description="Choose the default language and which languages the institute offers."
      sectionTitle="Language availability"
      sectionDescription="The default language applies wherever a user has not chosen a preference."
      fields={FIELDS}
      defaults={DEFAULTS}
    />
  );
}
