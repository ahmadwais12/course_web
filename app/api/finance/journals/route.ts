import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';

type Line = { accountId: string; description?: string; debit: number; credit: number };
const validDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const parsed = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === v;
};

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser(); if (!auth.ok) return auth.response;
    const { admin, tenantId, userId } = auth.session;
    const body = await request.json() as { date?: unknown; description?: unknown; referenceType?: unknown; lines?: unknown };
    const date = body.date; const description = String(body.description ?? '').trim();
    const referenceType = String(body.referenceType ?? 'journal');
    const lines = Array.isArray(body.lines) ? body.lines as Line[] : [];
    if (!['journal', 'voucher:receipt', 'voucher:payment', 'voucher:journal', 'opening_balance'].includes(referenceType)) return NextResponse.json({ error: 'Invalid voucher type.' }, { status: 400 });
    if (!validDate(date) || !description || lines.length < 2) return NextResponse.json({ error: 'A date, description, and at least two journal lines are required.' }, { status: 400 });
    if (lines.some(l => !l.accountId || !Number.isFinite(Number(l.debit)) || !Number.isFinite(Number(l.credit)) || Number(l.debit) < 0 || Number(l.credit) < 0 || (Number(l.debit) > 0 && Number(l.credit) > 0) || (Number(l.debit) === 0 && Number(l.credit) === 0))) return NextResponse.json({ error: 'Each journal line must have one account and either a positive debit or credit.' }, { status: 400 });
    const debit = lines.reduce((s,l)=>s+Number(l.debit),0), credit=lines.reduce((s,l)=>s+Number(l.credit),0);
    if (Math.abs(debit-credit) > 0.01) return NextResponse.json({ error: 'Debits and credits must balance before posting.' }, { status: 400 });
    const { data: tenant } = tenantId ? await admin.from('tenants').select('settings').eq('id', tenantId).maybeSingle() : { data: null };
    const years = ((tenant as {settings?:{finance?:{fiscalYears?:{startDate:string;endDate:string;status:string}[]}}}|null)?.settings?.finance?.fiscalYears ?? []);
    const fy = years.find(y => date >= y.startDate && date <= y.endDate);
    if (!years.length) return NextResponse.json({ error: 'Configure a fiscal year before posting finance vouchers.' }, { status: 400 });
    if (referenceType === 'opening_balance' && !fy) {
      if (years.some(y => y.status === 'Closed') && date >= years[0].startDate) return NextResponse.json({ error: 'Opening balance date falls in a closed fiscal year.' }, { status: 400 });
    } else if (!fy || fy.status === 'Closed') return NextResponse.json({ error: fy ? 'This fiscal year is closed.' : 'The posting date is outside configured fiscal years.' }, { status: 400 });
    const ids = [...new Set(lines.map(l=>l.accountId))];
    let aq = admin.from('accounts').select('id, account_code').in('id',ids).eq('is_active',true); if(tenantId) aq=aq.eq('tenant_id',tenantId);
    const {data: accountsData,error:accountError}=await aq; if(accountError) return NextResponse.json({error:accountError.message},{status:500});
    const accounts=(accountsData??[]) as {id:string;account_code:string|null}[]; if(accounts.length!==ids.length) return NextResponse.json({error:'One or more selected accounts are unavailable.'},{status:400});
    const now=new Date().toISOString();
    const {data:header,error:headerError}=await admin.from('journals').insert({tenant_id:tenantId,journal_no:`JV-${date.replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,journal_date:date,description,reference_type:referenceType,total_debit:debit,total_credit:credit,is_posted:true,posted_at:now,posted_by:userId,created_by:userId,created_at:now,updated_at:now}).select('id').single();
    if(headerError||!header) return NextResponse.json({error:headerError?.message??'Could not create voucher.'},{status:500});
    const accountMap=new Map(accounts.map(a=>[a.id,a]));
    const {error:lineError}=await admin.from('journal_entries').insert(lines.map(l=>({journal_id:header.id,account_id:l.accountId,account_code:accountMap.get(l.accountId)?.account_code??null,description:String(l.description??description).slice(0,500),debit:Number(l.debit),credit:Number(l.credit),user_id:userId,created_at:now})));
    if(lineError){await admin.from('journals').delete().eq('id',header.id).eq('tenant_id',tenantId);return NextResponse.json({error:lineError.message},{status:500});}
    return NextResponse.json({ok:true,id:header.id,journalNo:header.id,debit,credit},{status:201});
  } catch(error:unknown){return dashboardError(error,'Could not post journal voucher');}
}
