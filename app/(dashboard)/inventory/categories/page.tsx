import NameListPage from '@/components/inventory/NameListPage';

export default function Page() {
  return (
    <NameListPage
      title="Categories"
      description="Asset categories. The same names appear on the asset form and under Asset Properties as type Category."
      endpoint="/api/inventory/categories"
      nameLabel="Category"
      addLabel="New category"
      emptyMessage="No categories yet."
    />
  );
}
