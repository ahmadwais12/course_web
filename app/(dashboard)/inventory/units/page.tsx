import NameListPage from '@/components/inventory/NameListPage';

export default function Page() {
  return (
    <NameListPage
      title="Units"
      description="Units of measure used on inventory items, such as Piece, Box, or KG."
      endpoint="/api/inventory/units"
      nameLabel="Unit"
      addLabel="New unit"
      emptyMessage="No units yet."
    />
  );
}
