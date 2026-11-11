import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeExpensesScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Expense Claims',
  'Submit reimbursable expenses and follow their approval.',
  '/employee/expenses'
);

export default function EmployeeExpensesPage() {
  return <EmployeeExpensesScreen />;
}
