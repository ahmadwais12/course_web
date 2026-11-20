import type { Metadata } from 'next'; import { privateAppPageMetadata } from '@/lib/seo';
export const metadata: Metadata = privateAppPageMetadata('Fiscal Years','Configure accounting year names and date ranges for institute finance.','/finance/fiscal-years');
export default function Layout({children}:{children:React.ReactNode}){return children;}
