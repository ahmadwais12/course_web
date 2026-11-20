import ChangeHistoryPage from '@/components/inventory/ChangeHistoryPage';

export default function Page() {
  return (
    <ChangeHistoryPage
      entity="project"
      title="Modified Projects"
      description="Change history for project records — creations, edits, and deletion."
    />
  );
}
