import NameListPage from '@/components/inventory/NameListPage';

export default function Page() {
  return (
    <NameListPage
      title="Warehouses"
      description="Locations stored on stock movements. The demo calls these locations."
      endpoint="/api/inventory/warehouses"
      nameLabel="Warehouse"
      addLabel="New warehouse"
      emptyMessage="No warehouses yet."
    />
  );
}
