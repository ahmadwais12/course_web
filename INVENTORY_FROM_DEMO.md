# Inventory logic taken from the Al-Hawa demo

Source: `https://alhawa-inventory-demo.connectafg.stream/` (signed in as the super admin account).

The demo is two products in one shell:

1. **Stock inventory** (`inventory-v2`) — items, units, in/out movements, stock health.
2. **Fixed assets** — assets, holders, projects, departments, locations, QR, transfers, trash, Excel/PDF reports.

This file records the rules that were copied into DreamFlow. DreamFlow’s inventory pages use the shared Ports list, table, filter, and dialog components. Stock is stored in `data/inventory.json` on the server (created the first time you open inventory). It is not in Supabase yet.

## What was built

| Demo part | DreamFlow page | What it does |
|---|---|---|
| Dashboard (`#/`) | `/inventory` | Five headline numbers and six charts: stock levels, movement trend, unit mix, asset status, assets by department, assets by location |
| Inventory (`#/inventory`) | `/inventory/items` | Create, edit, search, filter, and delete stock items. Items report and Transactions report download as CSV |
| Item transactions (`#/asset-inventory-transactions/:id`) | `/inventory/items/:id/transactions` | One item's in and out movements. Add, edit, delete, and export to CSV |
| Units on an item | `/inventory/units` | The unit list the item form picks from |
| Location on a movement | `/inventory/warehouses` | Named locations. A movement stores the warehouse name |
| Transaction type `in` | `/inventory/stock-in` | Adds quantity to the item |
| Transaction type `out` | `/inventory/stock-out` | Subtracts quantity, and refuses to go below zero |
| Dashboard stock numbers | `/reports/inventory` | Item count, on-hand total, minimums, 30-day movements, unit mix, six-month in/out |

## Item rules

Taken from the demo item form (`bin_card_number`, `item_name`, `unit`, `quantity`, `min_quantity`, `unit_price`, `total_price`, `description`).

- Item name is required.
- Bin card number is optional. If you set one, it must be unique. The items table shows it under the name, and clicking it copies it.
- Unit comes from the Units list.
- Quantity, minimum, and unit price cannot be negative.
- **Total price = quantity × unit price.** The form shows it and the save writes it. You do not type the total.
- Search matches item name, bin card, and description.
- Quantity filter:
  - **Low** = on hand is less than or equal to the minimum.
  - **High** = on hand is greater than the minimum.
- Deleting an item also deletes its movements.

The demo also lets you set quantity directly on the item. DreamFlow does the same. Movements then add or subtract from that number. If you later type a new quantity on the item, that replaces the on-hand number. It does not replay old movements.

## Stock in and stock out

Taken from the demo transaction form.

Fields: type (`in` or `out`), invoice number, quantity, price, employee ID, holder, date, department, location (warehouse), description.

- Quantity must be greater than zero.
- Description is required.
- Date is required (`YYYY-MM-DD`).
- **In** adds the quantity to the item.
- **Out** subtracts it. If the quantity is higher than what is on hand, the save is rejected and the balance does not change. An empty price on an out movement is stored as 0, matching the demo.
- Editing a movement undoes the old quantity first, then applies the new one. So changing an old “in” of 10 into an “out” of 4 puts those 10 back before checking that 4 can be issued.
- Deleting a movement reverses it (an in is subtracted, an out is added back).
- A movement stays on the same item. To move a different item, delete it and create a new one.
- Holder and department on a stock movement are text. The asset register uses the Asset Holders list.
- Warehouse is chosen from Warehouses. The movement keeps the name, so renaming a warehouse later does not rewrite old rows.

## Report rules

Taken from the demo dashboard payload `inventory-v2/dashboard`.

- **Inventory items** = number of item records.
- **Total on hand** = sum of item quantities.
- **At or below minimum** = items where quantity ≤ minimum. The demo’s headline uses this combined count.
- **Movements (30 days)** = in and out rows whose date is within the last 30 days.
- **Stock levels** split the same items three ways, which is the demo donut:
  - Comfortable: quantity > minimum
  - At minimum: quantity = minimum
  - Below minimum: quantity < minimum
- **Unit mix** = how many item records use each unit (a count of records, not money).
- **Movement trend** = count of in rows and out rows for each of the last six months. The demo draws this as a bar chart. DreamFlow shows the same numbers in a table.

The demo’s fifth headline, “Registered assets”, counts fixed-asset records that are not in trash. It appears on the `/inventory` dashboard, together with asset counts by status, department, and location (an empty value is shown as “Unspecified”). `/reports/inventory` keeps the stock-only numbers and the below-minimum list.

## Fixed assets now in the sidebar

These are the other screens from the demo. Open **Inventory** in the sidebar.

| Demo screen | Your page |
|---|---|
| Assets | `/inventory/assets` |
| Asset trash (restore or delete forever) | `/inventory/assets/trash` |
| Projects | `/inventory/projects` |
| Asset Holders | `/inventory/holders` |
| Asset Properties (category, department, location, province) | `/inventory/properties` |
| Asset category list | `/inventory/categories` |
| Asset transfers (holder, department, location, province, with from → to history) | `/inventory/transfers` |

Deleting an asset moves it to trash. A transfer updates the asset and keeps the old holder, department, location, and province in the history.

## Asset depreciation (added in DreamFlow, not in the demo)

The demo has no depreciation. DreamFlow adds three fields to each asset and calculates the rest each time the asset is loaded, so the values are always current.

- Stored: **method** (straight-line or double declining balance), **useful life** in years, and **salvage value**. Cost and salvage value are per unit, and totals multiply by quantity.
- Depreciation starts on the **invoice date**. An asset without cost, invoice date, or useful life is not depreciated, and its book value is its cost.
- **Straight-line:** annual = (cost − salvage) ÷ years. Accumulated = annual × years since the invoice date, capped at cost − salvage.
- **Declining balance:** the rate is 2 ÷ years of the remaining value each year, and value never drops below salvage.
- **Book value** = cost − accumulated. When book value reaches salvage, the asset shows **Fully depreciated** and annual depreciation becomes 0.
- Checks: useful life 1–100 years, salvage value 0 or more and at most the cost.

## Permissions page

The demo page `/permissions` is now the Users & Security → Permissions screen.

- A permission name is `module.ability`, for example `assets.read`.
- Modules are assets, inventory, inventory transactions, projects, asset holders, users, inventory settings, IMS asset holders, and settings, plus the DreamFlow sections.
- Add a role, then open **View role permissions**. The dialog groups abilities under each module.
- Assigning is by module: choose roles, one module, and only that module’s abilities. Saving replaces those abilities and leaves every other module on the role unchanged.
- With one role selected, the abilities it already has for that module start out checked.
- Older names such as `Team` stay in the list under Other, so existing access is not removed.

## Still not copied from the demo

| Demo piece | Why it is not a page here |
|---|---|
| Excel workbooks and PDF exports | Items and transactions download as CSV, which Excel opens. Real `.xlsx` workbooks and the fixed-asset PDFs are not built. |
| QR scan | The demo top bar opens an asset from a QR code. |
| Asset photo upload and spreadsheet import | The demo can attach images and import holders or assets from Excel. |
| Users, permissions, activity log | DreamFlow already has Users, Roles, Permissions, and Activity Logs. |

Suppliers, Purchase, and Adjustments are still “coming soon”. The demo does not have those three screens. Adjustments there are done by editing the item quantity or by posting Stock In / Stock Out.

## Demo navigation that was reviewed

- Dashboard
- Asset and Inventory → Assets, Inventory
- Holder Snapshot → Projects, Asset Holders
- Inventory Settings → Asset Properties
- Account Management → User Management, Activity Log, Permissions
- Item → its transaction list (`/asset-inventory-transactions/:id`)
- Asset trash and per-asset transfers
