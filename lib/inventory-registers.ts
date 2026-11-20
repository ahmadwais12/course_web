/** Shared register definitions used by the generic inventory register page + API. */

export type RegisterFieldType = 'text' | 'number' | 'price' | 'tel' | 'date' | 'textarea' | 'select';

export type RegisterField = {
  key: string;
  label: string;
  type?: RegisterFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  min?: number;
  step?: string;
};

export type RegisterColumn = {
  key: string;
  header: string;
  format?: 'date' | 'number' | 'money' | 'price' | 'phone' | 'badge';
};

export type RegisterConfig = {
  resource: string;
  title: string;
  description: string;
  primary: { key: string; label: string };
  fields: RegisterField[];
  columns: RegisterColumn[];
};

const status = (options: string[]): { value: string; label: string }[] =>
  options.map((value) => ({
    value,
    label: value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
  }));

export const REGISTERS: Record<string, RegisterConfig> = {
  grn: {
    resource: 'grn',
    title: 'Goods Received (GRN)',
    description: 'Record goods received against purchases, with quantity, warehouse, and receiving officer.',
    primary: { key: 'grn_number', label: 'GRN number' },
    fields: [
      { key: 'grn_number', label: 'GRN number', required: true },
      { key: 'purchase_reference', label: 'Purchase reference' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'item', label: 'Item / description', required: true },
      { key: 'quantity_received', label: 'Quantity received', type: 'number', min: 0, step: '0.01' },
      { key: 'unit', label: 'Unit' },
      { key: 'received_date', label: 'Received date', type: 'date' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'received_by', label: 'Received by' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: status(['received', 'partial', 'rejected']),
      },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'grn_number', header: 'GRN' },
      { key: 'item', header: 'Item' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'quantity_received', header: 'Quantity', format: 'number' },
      { key: 'received_date', header: 'Received', format: 'date' },
      { key: 'warehouse', header: 'Warehouse' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  assignments: {
    resource: 'assignments',
    title: 'Assignments',
    description: 'Track assets assigned to holders, when they were issued, and when they came back.',
    primary: { key: 'asset_name', label: 'Asset name' },
    fields: [
      { key: 'asset_name', label: 'Asset name', required: true },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'holder_name', label: 'Holder', required: true },
      { key: 'department', label: 'Department' },
      { key: 'assigned_date', label: 'Assigned date', type: 'date' },
      { key: 'returned_date', label: 'Returned date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: status(['active', 'returned', 'cancelled']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'asset_name', header: 'Asset' },
      { key: 'asset_tag', header: 'Tag' },
      { key: 'holder_name', header: 'Holder' },
      { key: 'department', header: 'Department' },
      { key: 'assigned_date', header: 'Assigned', format: 'date' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  transferRequests: {
    resource: 'transferRequests',
    title: 'Transfer Requests',
    description: 'Requests to move an asset between holders, departments, or locations before the transfer is executed.',
    primary: { key: 'asset_name', label: 'Asset name' },
    fields: [
      { key: 'asset_name', label: 'Asset name', required: true },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'requested_by', label: 'Requested by' },
      { key: 'to_holder', label: 'Move to holder' },
      { key: 'from_department', label: 'From department' },
      { key: 'to_department', label: 'To department' },
      { key: 'request_date', label: 'Request date', type: 'date' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: status(['pending', 'approved', 'rejected', 'completed']),
      },
      { key: 'note', label: 'Reason / note', type: 'textarea' },
    ],
    columns: [
      { key: 'asset_name', header: 'Asset' },
      { key: 'asset_tag', header: 'Tag' },
      { key: 'requested_by', header: 'Requested by' },
      { key: 'to_holder', header: 'Move to' },
      { key: 'request_date', header: 'Requested', format: 'date' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  exitClearances: {
    resource: 'exitClearances',
    title: 'Exit Clearance',
    description: 'Clear departing staff of assets held and confirm nothing is left outstanding.',
    primary: { key: 'employee_name', label: 'Employee name' },
    fields: [
      { key: 'employee_name', label: 'Employee name', required: true },
      { key: 'employee_id', label: 'Employee ID' },
      { key: 'department', label: 'Department' },
      { key: 'clearance_date', label: 'Clearance date', type: 'date' },
      { key: 'assets_returned', label: 'Assets returned', type: 'number', min: 0 },
      { key: 'cleared_by', label: 'Cleared by' },
      { key: 'status', label: 'Status', type: 'select', options: status(['pending', 'in_progress', 'cleared', 'hold']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'employee_name', header: 'Employee' },
      { key: 'department', header: 'Department' },
      { key: 'clearance_date', header: 'Date', format: 'date' },
      { key: 'assets_returned', header: 'Assets returned', format: 'number' },
      { key: 'cleared_by', header: 'Cleared by' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  damagedLost: {
    resource: 'damagedLost',
    title: 'Damaged and Lost',
    description: 'Report assets or stock that were damaged, lost, or written off.',
    primary: { key: 'item_or_asset', label: 'Item or asset' },
    fields: [
      { key: 'item_or_asset', label: 'Item or asset', required: true },
      { key: 'kind', label: 'Kind', type: 'select', options: status(['damaged', 'lost']) },
      { key: 'quantity', label: 'Quantity', type: 'number', min: 0, step: '0.01' },
      { key: 'reported_by', label: 'Reported by' },
      { key: 'reported_date', label: 'Reported date', type: 'date' },
      { key: 'location', label: 'Location' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: status(['open', 'under_repair', 'written_off', 'replaced']),
      },
      { key: 'note', label: 'Description', type: 'textarea' },
    ],
    columns: [
      { key: 'item_or_asset', header: 'Item / asset' },
      { key: 'kind', header: 'Kind', format: 'badge' },
      { key: 'quantity', header: 'Qty', format: 'number' },
      { key: 'reported_date', header: 'Reported', format: 'date' },
      { key: 'reported_by', header: 'Reported by' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  disposals: {
    resource: 'disposals',
    title: 'Disposal',
    description: 'Record approved disposals by sale, scrap, donation, or write-off.',
    primary: { key: 'asset_name', label: 'Asset name' },
    fields: [
      { key: 'asset_name', label: 'Asset name', required: true },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'method', label: 'Method', type: 'select', options: status(['sale', 'scrap', 'donation', 'write_off']) },
      { key: 'disposal_date', label: 'Disposal date', type: 'date' },
      { key: 'proceeds', label: 'Proceeds', type: 'price' },
      { key: 'approved_by', label: 'Approved by' },
      { key: 'status', label: 'Status', type: 'select', options: status(['pending', 'approved', 'completed', 'cancelled']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'asset_name', header: 'Asset' },
      { key: 'asset_tag', header: 'Tag' },
      { key: 'method', header: 'Method', format: 'badge' },
      { key: 'disposal_date', header: 'Date', format: 'date' },
      { key: 'proceeds', header: 'Proceeds', format: 'price' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  projectClosures: {
    resource: 'projectClosures',
    title: 'Project Closure',
    description: 'Close out projects and confirm all project assets were returned or reassigned.',
    primary: { key: 'project_title', label: 'Project title' },
    fields: [
      { key: 'project_title', label: 'Project title', required: true },
      { key: 'closure_date', label: 'Closure date', type: 'date' },
      { key: 'assets_returned', label: 'Assets returned', type: 'number', min: 0 },
      { key: 'closed_by', label: 'Closed by' },
      { key: 'status', label: 'Status', type: 'select', options: status(['draft', 'in_review', 'closed']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'project_title', header: 'Project' },
      { key: 'closure_date', header: 'Closure date', format: 'date' },
      { key: 'assets_returned', header: 'Assets returned', format: 'number' },
      { key: 'closed_by', header: 'Closed by' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  repairs: {
    resource: 'repairs',
    title: 'Repairs and Service',
    description: 'Repair and service jobs for assets, with vendor, cost, and turnaround.',
    primary: { key: 'asset_name', label: 'Asset name' },
    fields: [
      { key: 'asset_name', label: 'Asset name', required: true },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'vendor', label: 'Vendor / workshop' },
      { key: 'issue', label: 'Issue', type: 'textarea' },
      { key: 'cost', label: 'Cost', type: 'price' },
      { key: 'sent_date', label: 'Sent date', type: 'date' },
      { key: 'returned_date', label: 'Returned date', type: 'date' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: status(['open', 'in_progress', 'completed', 'cancelled']),
      },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'asset_name', header: 'Asset' },
      { key: 'vendor', header: 'Vendor' },
      { key: 'cost', header: 'Cost', format: 'price' },
      { key: 'sent_date', header: 'Sent', format: 'date' },
      { key: 'returned_date', header: 'Returned', format: 'date' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  serviceSchedules: {
    resource: 'serviceSchedules',
    title: 'Service Schedules',
    description: 'Planned maintenance cycles and due dates for assets.',
    primary: { key: 'asset_name', label: 'Asset name' },
    fields: [
      { key: 'asset_name', label: 'Asset name', required: true },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'service_type', label: 'Service type' },
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'select',
        options: status(['monthly', 'quarterly', 'biannual', 'annual']),
      },
      { key: 'last_service', label: 'Last service', type: 'date' },
      { key: 'next_due', label: 'Next due', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: status(['active', 'paused', 'completed']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'asset_name', header: 'Asset' },
      { key: 'service_type', header: 'Service' },
      { key: 'frequency', header: 'Frequency', format: 'badge' },
      { key: 'last_service', header: 'Last service', format: 'date' },
      { key: 'next_due', header: 'Next due', format: 'date' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  warranties: {
    resource: 'warranties',
    title: 'Warranties',
    description: 'Warranty coverage, providers, and expiry dates for assets.',
    primary: { key: 'asset_name', label: 'Asset name' },
    fields: [
      { key: 'asset_name', label: 'Asset name', required: true },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'provider', label: 'Provider' },
      { key: 'reference', label: 'Reference' },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: status(['active', 'expired', 'void']) },
      { key: 'note', label: 'Coverage note', type: 'textarea' },
    ],
    columns: [
      { key: 'asset_name', header: 'Asset' },
      { key: 'provider', header: 'Provider' },
      { key: 'reference', header: 'Reference' },
      { key: 'start_date', header: 'Start', format: 'date' },
      { key: 'end_date', header: 'End', format: 'date' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  vehicles: {
    resource: 'vehicles',
    title: 'Vehicles',
    description: 'Fleet register with plate, model, driver, odometer, and status.',
    primary: { key: 'plate_number', label: 'Plate number' },
    fields: [
      { key: 'plate_number', label: 'Plate number', required: true },
      { key: 'make_model', label: 'Make / model' },
      { key: 'vehicle_type', label: 'Vehicle type' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'odometer', label: 'Odometer (km)', type: 'number', min: 0, step: '1' },
      { key: 'status', label: 'Status', type: 'select', options: status(['active', 'maintenance', 'retired']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'plate_number', header: 'Plate' },
      { key: 'make_model', header: 'Make / model' },
      { key: 'vehicle_type', header: 'Type' },
      { key: 'driver_name', header: 'Driver' },
      { key: 'odometer', header: 'Odometer', format: 'number' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  vehicleLogs: {
    resource: 'vehicleLogs',
    title: 'Vehicle Logs',
    description: 'Trips and odometer readings for each fleet vehicle.',
    primary: { key: 'vehicle', label: 'Vehicle' },
    fields: [
      { key: 'vehicle', label: 'Vehicle (plate)', required: true },
      { key: 'log_date', label: 'Date', type: 'date' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'start_km', label: 'Start km', type: 'number', min: 0, step: '1' },
      { key: 'end_km', label: 'End km', type: 'number', min: 0, step: '1' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'log_date', header: 'Date', format: 'date' },
      { key: 'vehicle', header: 'Vehicle' },
      { key: 'driver_name', header: 'Driver' },
      { key: 'purpose', header: 'Purpose' },
      { key: 'start_km', header: 'Start km', format: 'number' },
      { key: 'end_km', header: 'End km', format: 'number' },
    ],
  },
  fuelLogs: {
    resource: 'fuelLogs',
    title: 'Fuel Log',
    description: 'Fuel purchases by vehicle, liters, cost, and odometer.',
    primary: { key: 'vehicle', label: 'Vehicle' },
    fields: [
      { key: 'vehicle', label: 'Vehicle (plate)', required: true },
      { key: 'fuel_date', label: 'Date', type: 'date' },
      { key: 'liters', label: 'Liters', type: 'number', min: 0, step: '0.01' },
      { key: 'cost', label: 'Cost', type: 'price' },
      { key: 'odometer', label: 'Odometer (km)', type: 'number', min: 0, step: '1' },
      { key: 'station', label: 'Station' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'fuel_date', header: 'Date', format: 'date' },
      { key: 'vehicle', header: 'Vehicle' },
      { key: 'liters', header: 'Liters', format: 'number' },
      { key: 'cost', header: 'Cost', format: 'price' },
      { key: 'odometer', header: 'Odometer', format: 'number' },
      { key: 'station', header: 'Station' },
    ],
  },
  documents: {
    resource: 'documents',
    title: 'Document Archive',
    description: 'Archive inventory documents — policies, contracts, invoices, insurance, and warranty papers.',
    primary: { key: 'title', label: 'Title' },
    fields: [
      { key: 'title', label: 'Title', required: true },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: status(['policy', 'contract', 'invoice', 'insurance', 'warranty', 'other']),
      },
      { key: 'related_to', label: 'Related asset / project' },
      { key: 'reference', label: 'Reference' },
      { key: 'document_date', label: 'Document date', type: 'date' },
      { key: 'url', label: 'File or web link' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'title', header: 'Title' },
      { key: 'category', header: 'Category', format: 'badge' },
      { key: 'related_to', header: 'Related to' },
      { key: 'reference', header: 'Reference' },
      { key: 'document_date', header: 'Date', format: 'date' },
    ],
  },
  dutyStations: {
    resource: 'dutyStations',
    title: 'Duty Stations',
    description: 'Manage duty stations used for staff and asset locations.',
    primary: { key: 'name', label: 'Station name' },
    fields: [
      { key: 'name', label: 'Station name', required: true },
      { key: 'province', label: 'Province' },
      { key: 'address', label: 'Address' },
      { key: 'contact', label: 'Contact phone', type: 'tel' },
      { key: 'status', label: 'Status', type: 'select', options: status(['active', 'inactive']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'name', header: 'Station' },
      { key: 'province', header: 'Province' },
      { key: 'address', header: 'Address' },
      { key: 'contact', header: 'Contact', format: 'phone' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  imsHolders: {
    resource: 'imsHolders',
    title: 'IMS Asset Holders',
    description: 'Inventory management system staff directory with employee IDs and duty stations.',
    primary: { key: 'full_name', label: 'Full name' },
    fields: [
      { key: 'full_name', label: 'Full name', required: true },
      { key: 'employee_id', label: 'Employee ID' },
      { key: 'department', label: 'Department' },
      { key: 'duty_station', label: 'Duty station' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status', type: 'select', options: status(['active', 'inactive']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'full_name', header: 'Name' },
      { key: 'employee_id', header: 'Employee ID' },
      { key: 'department', header: 'Department' },
      { key: 'duty_station', header: 'Duty station' },
      { key: 'phone', header: 'Phone', format: 'phone' },
      { key: 'status', header: 'Status', format: 'badge' },
    ],
  },
  fieldScans: {
    resource: 'fieldScans',
    title: 'Scan and Field Work',
    description: 'Log QR or barcode scans during field verification, with station and result.',
    primary: { key: 'code', label: 'Scanned code' },
    fields: [
      { key: 'code', label: 'Scanned code', required: true, placeholder: 'Asset tag or bin card' },
      { key: 'entity_type', label: 'Type', type: 'select', options: status(['asset', 'item', 'location']) },
      { key: 'scanned_by', label: 'Scanned by' },
      { key: 'station', label: 'Field station' },
      { key: 'scanned_at', label: 'Scan date', type: 'date' },
      { key: 'result', label: 'Result', type: 'select', options: status(['found', 'missing', 'mismatch', 'damaged']) },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'entity_type', header: 'Type', format: 'badge' },
      { key: 'scanned_by', header: 'Scanned by' },
      { key: 'station', header: 'Station' },
      { key: 'scanned_at', header: 'Date', format: 'date' },
      { key: 'result', header: 'Result', format: 'badge' },
    ],
  },
};

export function isRegisterKey(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGISTERS, value);
}

export function registerFieldKeys(config: RegisterConfig) {
  return config.fields.map((field) => field.key);
}
