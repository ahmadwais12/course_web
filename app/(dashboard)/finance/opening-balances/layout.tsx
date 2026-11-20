import type { Metadata } from 'next'; import { privateAppPageMetadata } from '@/lib/seo';
export const metadata: Metadata = privateAppPageMetadata('Opening Balances','Review posted opening ledger balances and confirm debit and credit totals.','/finance/opening-balances');
export default function Layout({children}:{children:React.ReactNode}){return children;}
