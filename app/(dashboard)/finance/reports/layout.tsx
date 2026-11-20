import type { Metadata } from 'next'; import { privateAppPageMetadata } from '@/lib/seo';
import ReportWorkspace from '@/components/reports/ReportWorkspace';
export const metadata: Metadata = privateAppPageMetadata('Accounting Reports','Review trial balance, income and expense, and balance sheet reports from posted ledger entries.','/finance/reports');
export default function Layout({children}:{children:React.ReactNode}){return <ReportWorkspace>{children}</ReportWorkspace>;}
