import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
export const metadata: Metadata = privateAppPageMetadata('General Ledger', 'Review posted debit and credit entries by account and source voucher.', '/finance/general-ledger');
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
