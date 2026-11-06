/**
 * Built-in platform documentation for the assistant. The navigation map is generated from
 * the real sidebar, so it never drifts from the app. Guides only describe pages and button
 * labels that exist in `app/(dashboard)`.
 */
import { DASHBOARD_NAV_ITEM, SIDEBAR_SECTIONS } from '@/lib/sidebar-nav';

export type BuiltinDoc = {
  id: string;
  title: string;
  module: string;
  content: string;
};

function navigationDocs(): BuiltinDoc[] {
  return SIDEBAR_SECTIONS.map((section) => {
    const available = section.items.filter((i) => !i.description);
    const planned = section.items.filter((i) => i.description);
    const lines = [
      `The ${section.label.en} section of the sidebar (Dari: ${section.label.dr}, Pashto: ${section.label.ps}) contains:`,
      ...available.map((i) => `- ${i.label.en} — open it from Sidebar → ${section.label.en} → ${i.label.en} (${i.href}).`),
    ];
    if (planned.length) {
      lines.push(
        '',
        'These items are listed but are planned modules (the page shows a "coming soon" placeholder):',
        ...planned.map((i) => `- ${i.label.en} (${i.href}): ${i.description}`)
      );
    }
    if (section.permission) {
      lines.push('', `This section is only visible to users with the "${section.permission}" permission.`);
    }
    return {
      id: `nav-${section.id}`,
      title: `Navigation: ${section.label.en}`,
      module: section.id,
      content: lines.join('\n'),
    };
  });
}

const GUIDES: BuiltinDoc[] = [
  {
    id: 'guide-overview',
    title: 'DreamFlow overview',
    module: 'general',
    content: [
      'DreamFlow is a multi-organization education and business management system.',
      `After signing in you land on the ${DASHBOARD_NAV_ITEM.label.en} (${DASHBOARD_NAV_ITEM.href}). The left sidebar groups modules into sections: Organization, Academic, Admissions, Finance, HR, Inventory, Communication, Reports, Users & Security, and System.`,
      'What you can see depends on your role and permissions. Branch staff only see their own branch; central organization staff see the organization and its branches.',
      'The interface supports English, Dari, and Pashto. Change the language from the language selector in the top header.',
      'The AI Assistant is available from the sidebar (AI Assistant) and from the floating assistant button on every dashboard page.',
    ].join('\n'),
  },
  {
    id: 'guide-add-student',
    title: 'How to add a new student (admission)',
    module: 'admissions',
    content: [
      'To register a new student:',
      '1. Open Sidebar → Academic → Students (/students) and click "Create Student & Parent", or open Sidebar → Admissions → Admission (/students/create).',
      '2. The form is a 4-step wizard: Student account (sign-in email and password), Personal details, Academic & fees (program, class, and fee details), and Parent / guardian.',
      '3. Fill each step and continue; on the last step submit to create the student and the linked parent account.',
      '4. The new student then appears in the Students list, where you can search and open their profile.',
      'You need permission to add students (the "Add Students" ability). If the button is missing, ask your administrator.',
    ].join('\n'),
  },
  {
    id: 'guide-classes-programs',
    title: 'How to set up programs, levels, classes, and durations',
    module: 'academic',
    content: [
      'Academic setup lists live under Sidebar → Academic:',
      '- Program Setup (/ports/programs): click "Add Program", fill the form, then "Create Program".',
      '- Levels / Grades (/ports/student-levels): click "Add Level", then "Create Level".',
      '- Sections / Groups (/ports/classes): click "Add Class", then "Create Class".',
      '- Durations (/ports/durations): click "Add Duration", then "Create Duration".',
      '- Programs / Courses (/courses) and Classes (/classes) list the courses and classes of your organization.',
      'Each list has a search box and a Filters button; use the row actions to edit or delete an entry.',
    ].join('\n'),
  },
  {
    id: 'guide-results',
    title: 'How to record exam results',
    module: 'academic',
    content: [
      '1. Open Sidebar → Academic → Results (/grades).',
      '2. Click "Add Grade", choose the student and exam, enter the score, and submit "Add Grade".',
      '3. Results are listed with search and filters. Pass/fail is judged against the passing marks set on the exam.',
    ].join('\n'),
  },
  {
    id: 'guide-users-roles',
    title: 'How to add users, roles, and permissions',
    module: 'users',
    content: [
      'Users & Security is visible only to users with the "Team" permission.',
      '- Users (/users): click "Add User" to create a staff account and choose its role.',
      '- Roles (/users/roles): click "Add Role", name the role, then "Create Role".',
      '- Permissions (/users/permissions): grant abilities to roles, including "Assign by module" to grant a whole module at once.',
      '- Activity Logs (/logs) records changes; Login History (/users/login-history) lists sign-ins.',
    ].join('\n'),
  },
  {
    id: 'guide-business-branches',
    title: 'How to create a business / institute and branches',
    module: 'organization',
    content: [
      '- Business / Institute (/business): click "Create Business" to register a new organization (opens /business/create). Submit with "Create Business".',
      '- Branches (/business/branches): click "Add Branch", fill in the branch details, then "Create Branch". You can also add a branch from a business detail page.',
      'A central organization can have several branches. Staff of the central organization can see all of its branches; branch staff see only their branch.',
    ].join('\n'),
  },
  {
    id: 'guide-leave',
    title: 'How to request leave',
    module: 'hr',
    content: [
      '1. Open Sidebar → HR → Leave (/leaves).',
      '2. Click "New Request", choose the leave type and dates, add a reason, and submit the "New Leave Request" form.',
      '3. The request starts as pending until a manager approves or rejects it.',
    ].join('\n'),
  },
  {
    id: 'guide-inventory',
    title: 'How to manage inventory items and stock',
    module: 'inventory',
    content: [
      '- Inventory Items (/inventory/items): click "New item" to add an item with bin card number, unit, minimum quantity, and unit price.',
      '- Stock In (/inventory/stock-in): click "New receipt" to record received stock; on-hand quantity increases.',
      '- Stock Out (/inventory/stock-out): click "New issue" to record issued stock; you cannot issue more than is on hand.',
      '- Inventory Dashboard (/inventory) shows stock health and recent movements; Inventory Reports (/reports/inventory) has detailed reports.',
      'Items at or below their minimum quantity are flagged as low stock.',
    ].join('\n'),
  },
  {
    id: 'guide-payments-finance',
    title: 'Where to find payments and financial reports',
    module: 'finance',
    content: [
      '- Payments (/payments) lists fee payments with status (completed, pending, failed, refunded), method, and date.',
      '- Financial Reports (/reports/finance) shows fee collection, income, and expense reports.',
      '- Fee Structures, Student Fees, Expenses, Income, Accounts, Vouchers, and Chart of Accounts under Finance are planned modules.',
      'Revenue in DreamFlow dashboards means the sum of completed payments by payment date.',
    ].join('\n'),
  },
  {
    id: 'guide-communication',
    title: 'How to send announcements and feedback',
    module: 'communication',
    content: [
      '- Announcements (/communication/announcements): click "New Announcement" (requires permission), write the message, and save.',
      '- Notifications (/notifications) lists your in-app notifications.',
      '- Feedback (/feedback): click "Give Feedback" to send feedback to the institute.',
      '- Messages (/messaging) is for direct conversations.',
    ].join('\n'),
  },
  {
    id: 'guide-ai-assistant',
    title: 'Using the AI Assistant',
    module: 'general',
    content: [
      'The AI Assistant answers questions about using DreamFlow and summarizes your organization’s live data (students, attendance, exams, payments, expenses, HR, payroll, inventory, reports) within your permissions.',
      '- Open it from Sidebar → AI Assistant (/ai-assistant) for full history, or the floating button on any page.',
      '- Conversations are saved; you can search, rename, and delete them.',
      '- Each organization has a monthly and daily message limit based on its plan. Administrators can see usage in Organization → AI Settings.',
      '- The assistant is read-only: it cannot create, edit, delete, approve, or pay anything.',
    ].join('\n'),
  },
];

export const BUILTIN_DOCS: BuiltinDoc[] = [...GUIDES, ...navigationDocs()];

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2);
}

/** Keyword fallback used when the vector knowledge base is empty or embeddings fail. */
export function searchBuiltinDocs(query: string, limit = 4): BuiltinDoc[] {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return GUIDES.slice(0, 1);
  return BUILTIN_DOCS.map((doc) => {
    const title = doc.title.toLowerCase();
    const body = doc.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 3;
      if (body.includes(term)) score += 1;
    }
    return { doc, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.doc);
}
