import type { AIModule } from '@/lib/ai/modules';

export type AIIntent = 'platform_support' | 'business_data' | 'general';

const HOW_TO_EN =
  /\b(how (do|can|to|should|would)|steps?|guide|tutorial|where (is|can|do)|configure|set ?up|walk me through|what is the process|explain how)\b/i;
const HOW_TO_FA = /(چطور|چگونه|چه\s?طور|څنګه|مراحل|ګامونه|طریقه|راهنما|لارښود|کجا|چېرته)/;
const DATA_EN =
  /\b(how many|how much|total|count|number of|list|show|which|summari[sz]e|compare|revenue|income|expenses?|profit|loss|unpaid|outstanding|receivables?|attendance|absent|present|payroll|salar(y|ies)|enrolled|enrollment|low stock|running low|inventory value|this month|last month|today|pending|failed|top|highest|lowest)\b/i;
const DATA_FA = /(چند|چقدر|مجموع|تعداد|څو|څومره|ټول|عاید|عواید|درآمد|مصارف|لګښت|فایده|سود|حاضری|حاضري|غیرحاضر|غیر حاضر|معاش|باقی|پاتې|امروز|نن|این ماه|دا میاشت)/;

const MODULE_HINTS: [AIModule, RegExp][] = [
  ['payroll', /\b(payroll|salar(y|ies)|payslip)\b|معاش/i],
  ['finance', /\b(revenue|income|fees?|payments?|expenses?|profit|loss|receivables?|unpaid|outstanding|invoice|financ\w*|cash)\b|عاید|عواید|فیس|مصارف|پرداخت|تادی|مالی|مالي/i],
  ['hr', /\b(employees?|staff|teachers? count|departments?|absent today|hr)\b|کارمند|کارکوونک|دیپارتمنت/i],
  ['admissions', /\b(admissions?|applications?|admitted|applicants?|leads?)\b|پذیرش|داخل/i],
  ['inventory', /\b(inventory|stock|products?|items?|warehouse)\b|انبار|ګدام|اجناس|توکي/i],
  ['academic', /\b(students?|attendance|exams?|results?|class(es)?|courses?|enrol\w*|grades?)\b|شاگرد|زده|حاضری|حاضري|امتحان|ازموین|صنف|ټولګ|کورس/i],
  ['reports', /\b(summary|summari[sz]e|compare|comparison|performance|trend|branch(es)?|overview)\b|خلاصه|مقایسه|لنډیز|پرتله/i],
];

export function guessModule(message: string): AIModule | null {
  for (const [module, pattern] of MODULE_HINTS) if (pattern.test(message)) return module;
  return null;
}

/**
 * Cheap pre-routing so documentation can be retrieved before the model call.
 * The model still decides which approved tools to call; this never grants access.
 */
export function classifyIntent(message: string): { intent: AIIntent; module: AIModule | null } {
  const howTo = HOW_TO_EN.test(message) || HOW_TO_FA.test(message);
  const data = DATA_EN.test(message) || DATA_FA.test(message);
  const strongData = /\b(how many|how much)\b|چند|چقدر|څو|څومره/i.test(message);
  const module = guessModule(message);

  if (howTo && !strongData) return { intent: 'platform_support', module: module ?? 'platform_support' };
  if (data) return { intent: 'business_data', module };
  return { intent: 'general', module };
}
