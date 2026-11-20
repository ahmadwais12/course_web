import ChangeHistoryPage from '@/components/inventory/ChangeHistoryPage';

export default function Page() {
  return (
    <ChangeHistoryPage
      entity="asset"
      title="Modified Assets"
      description="Change history for asset records — creations, edits, trash, restore, and deletion."
    />
  );
}
