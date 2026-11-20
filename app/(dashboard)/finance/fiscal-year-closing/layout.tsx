import type { Metadata } from 'next'; import { privateAppPageMetadata } from '@/lib/seo';
export const metadata: Metadata = privateAppPageMetadata('Fiscal Year Closing','Review ledger balances and readiness for an institute fiscal year close.','/finance/fiscal-year-closing');
export default function Layout({children}:{children:React.ReactNode}){return children;}
