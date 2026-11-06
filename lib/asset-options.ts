export const ASSET_STATUSES = ['Active', 'STOCK', 'Damaged', 'New'] as const;
export const PROJECT_STATUSES = ['Planned', 'In Progress', 'Completed', 'On Hold'] as const;
export const PROPERTY_TYPES = ['Category', 'Department', 'Location', 'Province'] as const;

export const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Straight-line' },
  { value: 'declining_balance', label: 'Declining balance (double)' },
] as const;

export type DepreciationMethod = (typeof DEPRECIATION_METHODS)[number]['value'];

export type DepreciationInput = {
  cost: number | null;
  quantity?: number;
  invoice_date: string;
  useful_life_years: number | null;
  salvage_value: number | null;
  depreciation_method: string;
};

export type DepreciationResult = {
  depreciable: boolean;
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  fully_depreciated: boolean;
  years_elapsed: number;
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Cost is per unit; totals cover the whole quantity. Values are computed as of `asOf`
 * and are never below the salvage value.
 */
export function computeDepreciation(input: DepreciationInput, asOf: Date = new Date()): DepreciationResult {
  const quantity = Math.max(1, Number(input.quantity) || 1);
  const cost = (Number(input.cost) || 0) * quantity;
  const salvage = Math.min(cost, Math.max(0, (Number(input.salvage_value) || 0) * quantity));
  const life = Number(input.useful_life_years) || 0;
  const start = input.invoice_date ? new Date(`${input.invoice_date}T00:00:00`) : null;

  if (!cost || life <= 0 || !start || Number.isNaN(start.getTime())) {
    return {
      depreciable: false,
      annual_depreciation: 0,
      accumulated_depreciation: 0,
      book_value: round(cost),
      fully_depreciated: false,
      years_elapsed: 0,
    };
  }

  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const yearsElapsed = Math.max(0, (asOf.getTime() - start.getTime()) / msPerYear);
  const depreciableBase = cost - salvage;

  let accumulated: number;
  let annual: number;

  if (input.depreciation_method === 'declining_balance') {
    const rate = Math.min(1, 2 / life);
    const fullYears = Math.floor(yearsElapsed);
    const fraction = yearsElapsed - fullYears;
    let value = cost;
    for (let year = 0; year < fullYears && value > salvage; year += 1) {
      value = Math.max(salvage, value - value * rate);
    }
    annual = Math.max(0, Math.min(value - salvage, value * rate));
    value = Math.max(salvage, value - annual * fraction);
    accumulated = cost - value;
  } else {
    annual = depreciableBase / life;
    accumulated = Math.min(depreciableBase, annual * yearsElapsed);
  }

  const bookValue = Math.max(salvage, cost - accumulated);
  const fully = bookValue <= salvage + 0.005;

  return {
    depreciable: true,
    annual_depreciation: round(fully ? 0 : annual),
    accumulated_depreciation: round(cost - bookValue),
    book_value: round(bookValue),
    fully_depreciated: fully,
    years_elapsed: round(yearsElapsed),
  };
}
