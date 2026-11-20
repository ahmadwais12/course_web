import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { InventoryError } from '@/lib/inventory-store';
import { listAssets, saveAsset } from '@/lib/asset-store';
import {
  DEFAULT_VERIFICATION_SETTINGS,
  addDaysIso,
  discrepancyTypeForResult,
  isCampaignType,
  isDiscrepancyType,
  isPriority,
  isScopeType,
  isVerifyResult,
  labelFrom,
  progress,
  todayIso,
  type CampaignPriority,
  type CampaignStatus,
  type CampaignType,
  type DiscrepancyStatus,
  type DiscrepancyType,
  type DiscoveryStatus,
  type PhysicalCondition,
  type ScopeType,
  type SessionStatus,
  type VerificationSettingsShape,
  type VerifyResult,
} from '@/lib/verification';

export type VerificationActor = {
  userId: string;
  name: string;
  role: string;
  manager: boolean;
};

export type CampaignBranch = {
  branch_id: string | null;
  name: string;
  country: string;
  province: string;
  officer_id: string | null;
  officer_name: string;
  session_id: string | null;
};

export type VerificationCampaign = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CampaignType;
  start_date: string;
  due_date: string;
  priority: CampaignPriority;
  status: CampaignStatus;
  scope_type: ScopeType;
  scope_values: string[];
  instructions: string;
  attachments: string[];
  branches: CampaignBranch[];
  created_by: string;
  created_by_name: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationSession = {
  id: string;
  code: string;
  campaign_id: string;
  campaign_name: string;
  campaign_code: string;
  branch_id: string | null;
  branch_name: string;
  country: string;
  province: string;
  officer_id: string | null;
  officer_name: string;
  status: SessionStatus;
  due_at: string;
  started_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationItem = {
  id: string;
  session_id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  category: string;
  serial_number: string;
  holder_name: string;
  expected_branch: string;
  expected_department: string;
  expected_location: string;
  expected_status: string;
  expected_condition: string;
  result: VerifyResult;
  actual_branch: string;
  actual_department: string;
  actual_location: string;
  actual_condition: PhysicalCondition | '';
  serial_confirmed: boolean;
  label_present: boolean;
  in_use: boolean;
  employee_confirmed: boolean;
  method: string;
  verified_by: string;
  verified_by_name: string;
  verified_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type DiscrepancyNote = { text: string; by: string; at: string };

export type VerificationDiscrepancy = {
  id: string;
  code: string;
  session_id: string;
  branch_name: string;
  verification_item_id: string | null;
  asset_id: string | null;
  asset_code: string;
  asset_name: string;
  type: DiscrepancyType;
  description: string;
  priority: CampaignPriority;
  status: DiscrepancyStatus;
  reported_by: string;
  reported_by_name: string;
  reported_at: string;
  assigned_reviewer_id: string | null;
  assigned_reviewer_name: string;
  notes: DiscrepancyNote[];
  resolution: string;
  resolved_by: string;
  resolved_by_name: string;
  resolved_at: string | null;
  approved_by: string;
  approved_by_name: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationDiscovery = {
  id: string;
  code: string;
  session_id: string;
  campaign_id: string;
  branch_name: string;
  asset_name: string;
  category_id: string | null;
  category_name: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  department: string;
  location: string;
  province: string;
  condition: PhysicalCondition | '';
  estimated_value: number | null;
  description: string;
  status: DiscoveryStatus;
  discovered_by: string;
  discovered_by_name: string;
  discovered_at: string;
  reviewed_by_name: string;
  reviewed_at: string | null;
  approved_by_name: string;
  approved_at: string | null;
  registered_asset_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationEvidence = {
  id: string;
  session_id: string;
  verification_item_id: string | null;
  discrepancy_id: string | null;
  bucket: string;
  path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
};

export type VerificationActivity = {
  id: string;
  campaign_id: string | null;
  session_id: string | null;
  asset_id: string | null;
  action: string;
  detail: string;
  actor_id: string;
  actor_name: string;
  created_at: string;
};

type Db = {
  campaigns: VerificationCampaign[];
  sessions: VerificationSession[];
  items: VerificationItem[];
  discrepancies: VerificationDiscrepancy[];
  discoveries: VerificationDiscovery[];
  evidence: VerificationEvidence[];
  activity: VerificationActivity[];
  settings: VerificationSettingsShape;
  counters: Record<string, number>;
};

const filePath = () =>
  process.env.VERIFICATION_DATA_PATH || path.join(process.cwd(), 'data', 'verification.json');

function emptyDb(): Db {
  return {
    campaigns: [],
    sessions: [],
    items: [],
    discrepancies: [],
    discoveries: [],
    evidence: [],
    activity: [],
    settings: { ...DEFAULT_VERIFICATION_SETTINGS },
    counters: {},
  };
}

function readDb(): Db {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<Db>;
    return {
      campaigns: parsed.campaigns ?? [],
      sessions: parsed.sessions ?? [],
      items: parsed.items ?? [],
      discrepancies: parsed.discrepancies ?? [],
      discoveries: parsed.discoveries ?? [],
      evidence: parsed.evidence ?? [],
      activity: parsed.activity ?? [],
      settings: { ...DEFAULT_VERIFICATION_SETTINGS, ...(parsed.settings ?? {}) },
      counters: parsed.counters ?? {},
    };
  } catch {
    const db = emptyDb();
    writeDb(db);
    return db;
  }
}

function writeDb(db: Db) {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

let queue: Promise<unknown> = Promise.resolve();

function withDb<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.then(() => {
    const db = readDb();
    const result = fn(db);
    writeDb(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const text = (value: unknown) => String(value ?? '').trim();

function nextCode(db: Db, prefix: string) {
  const key = `${prefix}-${new Date().getFullYear()}`;
  const next = (db.counters[key] ?? 0) + 1;
  db.counters[key] = next;
  return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
}

function log(
  db: Db,
  actor: VerificationActor,
  action: string,
  detail: string,
  ids: { campaign_id?: string | null; session_id?: string | null; asset_id?: string | null } = {}
) {
  db.activity.push({
    id: randomUUID(),
    campaign_id: ids.campaign_id ?? null,
    session_id: ids.session_id ?? null,
    asset_id: ids.asset_id ?? null,
    action,
    detail,
    actor_id: actor.userId,
    actor_name: actor.name,
    created_at: new Date().toISOString(),
  });
}

function canAccessSession(actor: VerificationActor, session: VerificationSession) {
  return actor.manager || (Boolean(session.officer_id) && session.officer_id === actor.userId);
}

function sessionOrThrow(db: Db, id: string) {
  const session = db.sessions.find((row) => row.id === id);
  if (!session) throw new InventoryError('Verification session not found.', 404);
  return session;
}

function setupSessionCounts(db: Db, session: VerificationSession) {
  const items = db.items.filter((row) => row.session_id === session.id);
  const verified = items.filter((row) => row.result !== 'pending').length;
  return { total: items.length, verified, pending: items.length - verified, completion: progress(verified, items.length) };
}

export function verificationSettings() {
  return withDb((db) => ({ ...db.settings }));
}

export function saveVerificationSettings(input: Partial<VerificationSettingsShape>) {
  return withDb((db) => {
    const current = db.settings;
    const days = Number(input.default_due_days);
    db.settings = {
      require_evidence_for_discrepancy:
        input.require_evidence_for_discrepancy === undefined
          ? current.require_evidence_for_discrepancy
          : Boolean(input.require_evidence_for_discrepancy),
      allow_submit_with_pending:
        input.allow_submit_with_pending === undefined
          ? current.allow_submit_with_pending
          : Boolean(input.allow_submit_with_pending),
      auto_start_session:
        input.auto_start_session === undefined ? current.auto_start_session : Boolean(input.auto_start_session),
      default_due_days: Number.isFinite(days)
        ? Math.min(365, Math.max(1, Math.round(days)))
        : current.default_due_days,
      default_priority: isPriority(String(input.default_priority ?? ''))
        ? (input.default_priority as CampaignPriority)
        : current.default_priority,
      notify_on_submit:
        input.notify_on_submit === undefined ? current.notify_on_submit : Boolean(input.notify_on_submit),
    };
    return { ...db.settings };
  });
}

type BranchInput = {
  branch_id?: string | null;
  name?: string;
  country?: string;
  province?: string;
  officer_id?: string | null;
  officer_name?: string;
};

export type CampaignInput = {
  name?: string;
  description?: string;
  type?: string;
  start_date?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  scope_type?: string;
  scope_values?: string[];
  instructions?: string;
  attachments?: string[];
  branches?: BranchInput[];
};

function normalizeBranches(input: BranchInput[] | undefined): Omit<CampaignBranch, 'session_id'>[] {
  const rows = (input ?? [])
    .map((row) => ({
      branch_id: row.branch_id ? String(row.branch_id) : null,
      name: text(row.name),
      country: text(row.country),
      province: text(row.province),
      officer_id: row.officer_id ? String(row.officer_id) : null,
      officer_name: text(row.officer_name),
    }))
    .filter((row) => row.name);
  if (rows.length === 0) throw new InventoryError('Add at least one branch to the campaign.', 400, 'branches');
  if (rows.length > 1 && rows.some((row) => !row.province)) {
    throw new InventoryError(
      'Each branch needs a province when a campaign covers multiple branches, so assets are assigned once.',
      400,
      'branches'
    );
  }
  return rows;
}

function scopeMatches(
  asset: Awaited<ReturnType<typeof listAssets>>[number],
  scopeType: ScopeType,
  scopeValues: string[]
) {
  if (scopeType === 'all') return true;
  const values = scopeValues.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0) return false;
  if (scopeType === 'departments') return values.includes((asset.department || '').trim().toLowerCase());
  if (scopeType === 'locations') return values.includes((asset.location || '').trim().toLowerCase());
  if (scopeType === 'categories') {
    return values.includes((asset.category_id ?? '').toLowerCase()) || values.includes((asset.category_name || '').trim().toLowerCase());
  }
  return false;
}

function branchMatches(
  asset: Awaited<ReturnType<typeof listAssets>>[number],
  branch: Omit<CampaignBranch, 'session_id'>,
  singleBranch: boolean
) {
  if (!branch.province) return singleBranch;
  const province = branch.province.trim().toLowerCase();
  return (
    (asset.province || '').trim().toLowerCase() === province ||
    (asset.location || '').trim().toLowerCase().includes(province)
  );
}

async function snapshotAssets(scopeType: ScopeType, scopeValues: string[]) {
  const assets = await listAssets({});
  return assets.filter((asset) => scopeMatches(asset, scopeType, scopeValues));
}

function createSessionsForCampaign(
  db: Db,
  campaign: VerificationCampaign,
  assets: Awaited<ReturnType<typeof listAssets>>,
  actor: VerificationActor
) {
  for (const branch of campaign.branches) {
    const branchAssets = assets.filter((asset) =>
      branchMatches(asset, branch, campaign.branches.length === 1)
    );
    const session: VerificationSession = {
      id: randomUUID(),
      code: nextCode(db, 'VS'),
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      campaign_code: campaign.code,
      branch_id: branch.branch_id,
      branch_name: branch.name,
      country: branch.country,
      province: branch.province,
      officer_id: branch.officer_id,
      officer_name: branch.officer_name,
      status: branch.officer_id ? 'assigned' : 'draft',
      due_at: campaign.due_date || addDaysIso(db.settings.default_due_days),
      started_at: null,
      submitted_at: null,
      reviewed_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.sessions.push(session);
    branch.session_id = session.id;

    for (const asset of branchAssets) {
      db.items.push({
        id: randomUUID(),
        session_id: session.id,
        asset_id: asset.id,
        asset_code: asset.tag_number || asset.id.slice(0, 8),
        asset_name: asset.asset_name,
        category: asset.category_name || '',
        serial_number: asset.serial_number || '',
        holder_name: asset.holder_name || '',
        expected_branch: branch.name,
        expected_department: asset.department || '',
        expected_location: asset.location || '',
        expected_status: asset.status || '',
        expected_condition: '',
        result: 'pending',
        actual_branch: '',
        actual_department: '',
        actual_location: '',
        actual_condition: '',
        serial_confirmed: false,
        label_present: false,
        in_use: false,
        employee_confirmed: false,
        method: '',
        verified_by: '',
        verified_by_name: '',
        verified_at: null,
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    log(
      db,
      actor,
      'Session generated',
      `${session.code} for ${branch.name} with ${branchAssets.length} expected asset${branchAssets.length === 1 ? '' : 's'}.`,
      { campaign_id: campaign.id, session_id: session.id }
    );
  }
}

export async function createCampaign(input: CampaignInput, actor: VerificationActor) {
  const name = text(input.name);
  if (!name) throw new InventoryError('Campaign name is required.', 400, 'name');
  const type = text(input.type) || 'full_physical';
  if (!isCampaignType(type)) throw new InventoryError('Choose a campaign type.', 400, 'type');
  const priority = text(input.priority) || 'normal';
  if (!isPriority(priority)) throw new InventoryError('Choose a priority.', 400, 'priority');
  const scopeType = text(input.scope_type) || 'all';
  if (!isScopeType(scopeType)) throw new InventoryError('Choose a verification scope.', 400, 'scope_type');
  const scopeValues = (input.scope_values ?? []).map(text).filter(Boolean);
  if (scopeType !== 'all' && scopeValues.length === 0) {
    throw new InventoryError('Select at least one value for the chosen scope.', 400, 'scope_values');
  }
  const branches = normalizeBranches(input.branches);
  const startDate = text(input.start_date) || todayIso();
  const dueDate = text(input.due_date) || addDaysIso(14);
  if (dueDate < startDate) throw new InventoryError('Due date cannot be before the start date.', 400, 'due_date');

  const assets = await snapshotAssets(scopeType, scopeValues);

  return withDb((db) => {
    const now = new Date().toISOString();
    const campaign: VerificationCampaign = {
      id: randomUUID(),
      code: nextCode(db, 'VC'),
      name,
      description: text(input.description),
      type,
      start_date: startDate,
      due_date: dueDate,
      priority,
      status: 'draft',
      scope_type: scopeType,
      scope_values: scopeValues,
      instructions: text(input.instructions),
      attachments: (input.attachments ?? []).map(text).filter(Boolean),
      branches: branches.map((row) => ({ ...row, session_id: null })),
      created_by: actor.userId,
      created_by_name: actor.name,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    db.campaigns.push(campaign);
    createSessionsForCampaign(db, campaign, assets, actor);
    log(db, actor, 'Campaign created', `${campaign.code} — ${campaign.name}.`, { campaign_id: campaign.id });
    return presentCampaign(db, campaign);
  });
}

function presentCampaign(db: Db, campaign: VerificationCampaign) {
  const sessions = db.sessions.filter((row) => row.campaign_id === campaign.id);
  const expected = sessions.reduce((sum, session) => sum + setupSessionCounts(db, session).total, 0);
  const verified = sessions.reduce((sum, session) => sum + setupSessionCounts(db, session).verified, 0);
  return {
    ...campaign,
    session_count: sessions.length,
    expected_assets: expected,
    verified_assets: verified,
    pending_assets: expected - verified,
    completion: progress(verified, expected),
  };
}

export function listCampaigns(actor: VerificationActor, filters: { status?: string | null; q?: string | null } = {}) {
  return withDb((db) => {
    const query = (filters.q ?? '').trim().toLowerCase();
    return db.campaigns
      .filter((campaign) => {
        if (filters.status && campaign.status !== filters.status) return false;
        if (!actor.manager) {
          const mine = db.sessions.some(
            (session) => session.campaign_id === campaign.id && canAccessSession(actor, session)
          );
          if (!mine) return false;
        }
        if (!query) return true;
        return [campaign.code, campaign.name, campaign.description].join(' ').toLowerCase().includes(query);
      })
      .map((campaign) => presentCampaign(db, campaign))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
}

export function getCampaign(id: string, actor: VerificationActor) {
  return withDb((db) => {
    const campaign = db.campaigns.find((row) => row.id === id);
    if (!campaign) throw new InventoryError('Campaign not found.', 404);
    if (!actor.manager) {
      const mine = db.sessions.some((row) => row.campaign_id === id && canAccessSession(actor, row));
      if (!mine) throw new InventoryError('You do not have access to this campaign.', 403);
    }
    return {
      ...presentCampaign(db, campaign),
      sessions: db.sessions
        .filter((row) => row.campaign_id === id)
        .map((row) => ({ ...row, ...setupSessionCounts(db, row) })),
    };
  });
}

export async function updateCampaign(id: string, input: CampaignInput, actor: VerificationActor) {
  if (!actor.manager) throw new InventoryError('Only head office users can edit campaigns.', 403);
  const existing = await withDb((db) => {
    const campaign = db.campaigns.find((row) => row.id === id);
    if (!campaign) throw new InventoryError('Campaign not found.', 404);
    return JSON.parse(JSON.stringify(campaign)) as VerificationCampaign;
  });

  const name = input.name === undefined ? existing.name : text(input.name);
  if (!name) throw new InventoryError('Campaign name is required.', 400, 'name');
  const type = input.type === undefined ? existing.type : text(input.type);
  if (!isCampaignType(type)) throw new InventoryError('Choose a campaign type.', 400, 'type');
  const priority = input.priority === undefined ? existing.priority : text(input.priority);
  if (!isPriority(priority)) throw new InventoryError('Choose a priority.', 400, 'priority');
  const scopeType = input.scope_type === undefined ? existing.scope_type : text(input.scope_type);
  if (!isScopeType(scopeType)) throw new InventoryError('Choose a verification scope.', 400, 'scope_type');
  const scopeValues =
    input.scope_values === undefined ? existing.scope_values : input.scope_values.map(text).filter(Boolean);
  if (scopeType !== 'all' && scopeValues.length === 0) {
    throw new InventoryError('Select at least one value for the chosen scope.', 400, 'scope_values');
  }
  const branches =
    input.branches === undefined
      ? existing.branches.map((row) => ({
          branch_id: row.branch_id,
          name: row.name,
          country: row.country,
          province: row.province,
          officer_id: row.officer_id,
          officer_name: row.officer_name,
        }))
      : normalizeBranches(input.branches);
  const startDate = input.start_date === undefined ? existing.start_date : text(input.start_date) || todayIso();
  const dueDate = input.due_date === undefined ? existing.due_date : text(input.due_date) || addDaysIso(14);
  if (dueDate < startDate) throw new InventoryError('Due date cannot be before the start date.', 400, 'due_date');

  const signature = (rows: { name: string; province: string; branch_id: string | null }[]) =>
    JSON.stringify(rows.map((row) => [row.branch_id ?? '', row.name, row.province]).sort());
  const branchChanged =
    signature(branches) !== signature(existing.branches) ||
    scopeType !== existing.scope_type ||
    signatureValues(scopeValues) !== signatureValues(existing.scope_values);

  const needsSnapshot = branchChanged;
  const assets = needsSnapshot ? await snapshotAssets(scopeType, scopeValues) : null;

  return withDb((db) => {
    const campaign = db.campaigns.find((row) => row.id === id);
    if (!campaign) throw new InventoryError('Campaign not found.', 404);

    if (needsSnapshot) {
      const started = db.sessions.some(
        (row) => row.campaign_id === id && (row.started_at || row.status !== 'draft' && row.status !== 'assigned')
      );
      if (started) {
        throw new InventoryError(
          'Branches or scope cannot change after a verification session has started.',
          400,
          'branches'
        );
      }
      const oldSessionIds = db.sessions.filter((row) => row.campaign_id === id).map((row) => row.id);
      db.sessions = db.sessions.filter((row) => row.campaign_id !== id);
      db.items = db.items.filter((row) => !oldSessionIds.includes(row.session_id));
      db.discrepancies = db.discrepancies.filter((row) => !oldSessionIds.includes(row.session_id));
      db.discoveries = db.discoveries.filter((row) => !oldSessionIds.includes(row.session_id));
      db.evidence = db.evidence.filter((row) => !oldSessionIds.includes(row.session_id));
      db.activity = db.activity.filter((row) => !row.session_id || !oldSessionIds.includes(row.session_id));
    }

    Object.assign(campaign, {
      name,
      description: input.description === undefined ? campaign.description : text(input.description),
      type,
      start_date: startDate,
      due_date: dueDate,
      priority,
      scope_type: scopeType,
      scope_values: scopeValues,
      instructions: input.instructions === undefined ? campaign.instructions : text(input.instructions),
      attachments:
        input.attachments === undefined ? campaign.attachments : (input.attachments ?? []).map(text).filter(Boolean),
      updated_at: new Date().toISOString(),
    });

    if (needsSnapshot) {
      campaign.branches = branches.map((row) => ({ ...row, session_id: null }));
      createSessionsForCampaign(db, campaign, assets ?? [], actor);
    } else if (input.branches !== undefined) {
      campaign.branches = branches.map((row) => {
        const previous = existing.branches.find(
          (old) => old.branch_id === row.branch_id && old.name === row.name
        );
        return { ...row, session_id: previous?.session_id ?? null };
      });
      for (const branch of campaign.branches) {
        const session = branch.session_id
          ? db.sessions.find((row) => row.id === branch.session_id)
          : null;
        if (!session) continue;
        session.officer_id = branch.officer_id;
        session.officer_name = branch.officer_name;
        if (session.status === 'draft' && branch.officer_id) session.status = 'assigned';
        if (session.status === 'assigned' && !branch.officer_id) session.status = 'draft';
        session.updated_at = new Date().toISOString();
      }
    }

    log(db, actor, 'Campaign updated', `${campaign.code} settings were updated.`, { campaign_id: campaign.id });
    return presentCampaign(db, campaign);
  });
}

function signatureValues(values: string[]) {
  return JSON.stringify([...values].sort());
}

export function setCampaignStatus(id: string, status: CampaignStatus, actor: VerificationActor) {
  return withDb((db) => {
    const campaign = db.campaigns.find((row) => row.id === id);
    if (!campaign) throw new InventoryError('Campaign not found.', 404);
    if (!actor.manager) throw new InventoryError('Only head office users can change campaign status.', 403);
    if (status === 'active') {
      if (campaign.status !== 'draft') throw new InventoryError('Only draft campaigns can be started.', 400);
      campaign.status = 'active';
      campaign.started_at = new Date().toISOString();
      for (const session of db.sessions.filter((row) => row.campaign_id === id)) {
        if (session.status === 'draft' && session.officer_id) session.status = 'assigned';
        session.updated_at = new Date().toISOString();
      }
      log(db, actor, 'Campaign started', `${campaign.code} is now active.`, { campaign_id: id });
    } else if (status === 'completed') {
      const sessions = db.sessions.filter((row) => row.campaign_id === id);
      const open = sessions.filter((row) => row.status !== 'completed' && row.status !== 'cancelled');
      if (open.length > 0) throw new InventoryError('Every branch session must be completed or cancelled first.');
      campaign.status = 'completed';
      campaign.completed_at = new Date().toISOString();
      log(db, actor, 'Campaign completed', `${campaign.code} was completed.`, { campaign_id: id });
    } else if (status === 'cancelled') {
      campaign.status = 'cancelled';
      for (const session of db.sessions.filter((row) => row.campaign_id === id)) {
        if (session.status !== 'completed') session.status = 'cancelled';
      }
      log(db, actor, 'Campaign cancelled', `${campaign.code} was cancelled.`, { campaign_id: id });
    } else {
      campaign.status = status;
    }
    campaign.updated_at = new Date().toISOString();
    return presentCampaign(db, campaign);
  });
}

export function deleteCampaign(id: string, actor: VerificationActor) {
  return withDb((db) => {
    if (!actor.manager) throw new InventoryError('Only head office users can delete campaigns.', 403);
    const campaign = db.campaigns.find((row) => row.id === id);
    if (!campaign) throw new InventoryError('Campaign not found.', 404);
    const started = db.sessions.some(
      (row) => row.campaign_id === id && (row.started_at || row.status !== 'draft' && row.status !== 'assigned')
    );
    if (started) throw new InventoryError('Campaigns with started sessions cannot be deleted.');
    const sessionIds = db.sessions.filter((row) => row.campaign_id === id).map((row) => row.id);
    db.campaigns = db.campaigns.filter((row) => row.id !== id);
    db.sessions = db.sessions.filter((row) => row.campaign_id !== id);
    db.items = db.items.filter((row) => !sessionIds.includes(row.session_id));
    db.discrepancies = db.discrepancies.filter((row) => !sessionIds.includes(row.session_id));
    db.discoveries = db.discoveries.filter((row) => !sessionIds.includes(row.session_id));
    db.evidence = db.evidence.filter((row) => !sessionIds.includes(row.session_id));
    db.activity = db.activity.filter((row) => row.campaign_id !== id && (!row.session_id || !sessionIds.includes(row.session_id)));
    return { ok: true };
  });
}

export function listSessions(
  actor: VerificationActor,
  filters: { campaign_id?: string | null; status?: string | null; branch?: string | null; q?: string | null } = {}
) {
  return withDb((db) => {
    const query = (filters.q ?? '').trim().toLowerCase();
    return db.sessions
      .filter((session) => {
        if (!canAccessSession(actor, session)) return false;
        if (filters.campaign_id && session.campaign_id !== filters.campaign_id) return false;
        if (filters.status && session.status !== filters.status) return false;
        if (filters.branch && session.branch_name !== filters.branch) return false;
        if (!query) return true;
        return [session.code, session.campaign_name, session.branch_name, session.officer_name]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .map((session) => ({
        ...session,
        ...setupSessionCounts(db, session),
        discrepancies_open: db.discrepancies.filter(
          (row) => row.session_id === session.id && !['approved', 'rejected', 'resolved', 'closed'].includes(row.status)
        ).length,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
}

export function getSession(id: string, actor: VerificationActor) {
  return withDb((db) => {
    const session = sessionOrThrow(db, id);
    if (!canAccessSession(actor, session)) throw new InventoryError('You do not have access to this session.', 403);
    const campaign = db.campaigns.find((row) => row.id === session.campaign_id) ?? null;
    const items = db.items
      .filter((row) => row.session_id === id)
      .sort((a, b) => a.asset_name.localeCompare(b.asset_name));
    const discrepancies = db.discrepancies
      .filter((row) => row.session_id === id)
      .sort((a, b) => b.reported_at.localeCompare(a.reported_at));
    const discoveries = db.discoveries
      .filter((row) => row.session_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const evidence = db.evidence
      .filter((row) => row.session_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const activity = db.activity
      .filter((row) => row.session_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 60);
    return {
      session: { ...session, ...setupSessionCounts(db, session) },
      campaign,
      items,
      discrepancies,
      discoveries,
      evidence,
      activity,
      settings: { ...db.settings },
    };
  });
}

export function sessionAction(
  id: string,
  action: 'start' | 'submit' | 'approve' | 'reject' | 'cancel',
  actor: VerificationActor,
  note = ''
) {
  return withDb((db) => {
    const session = sessionOrThrow(db, id);
    if (!canAccessSession(actor, session)) throw new InventoryError('You do not have access to this session.', 403);
    const now = new Date().toISOString();
    const counts = setupSessionCounts(db, session);

    if (action === 'start') {
      if (!['draft', 'assigned'].includes(session.status)) {
        throw new InventoryError('Only draft or assigned sessions can be started.', 400);
      }
      session.status = 'in_progress';
      session.started_at = now;
      log(db, actor, 'Session started', `${session.code} started for ${session.branch_name}.`, {
        campaign_id: session.campaign_id,
        session_id: session.id,
      });
    } else if (action === 'submit') {
      if (!['in_progress', 'assigned'].includes(session.status)) {
        throw new InventoryError('Only an in-progress session can be submitted.', 400);
      }
      if (counts.pending > 0 && !db.settings.allow_submit_with_pending) {
        throw new InventoryError(
          `${counts.pending} asset${counts.pending === 1 ? ' still needs' : 's still need'} a verification result.`,
          400
        );
      }
      session.status = 'submitted';
      session.submitted_at = now;
      log(db, actor, 'Session submitted', `${session.code} submitted with ${counts.verified}/${counts.total} verified.`, {
        campaign_id: session.campaign_id,
        session_id: session.id,
      });
    } else if (action === 'approve' || action === 'reject') {
      if (!actor.manager) throw new InventoryError('Only head office reviewers can review sessions.', 403);
      if (!['submitted', 'under_review'].includes(session.status)) {
        throw new InventoryError('Only submitted sessions can be reviewed.', 400);
      }
      if (action === 'approve') {
        session.status = 'completed';
        session.reviewed_at = now;
        session.completed_at = now;
        log(db, actor, 'Session approved', `${session.code} reviewed and completed.${note ? ` ${note}` : ''}`, {
          campaign_id: session.campaign_id,
          session_id: session.id,
        });
      } else {
        if (!note.trim()) throw new InventoryError('Add a review note explaining what must be corrected.', 400);
        session.status = 'in_progress';
        session.reviewed_at = now;
        log(db, actor, 'Session returned', `${session.code} returned: ${note.trim()}`, {
          campaign_id: session.campaign_id,
          session_id: session.id,
        });
      }
    } else if (action === 'cancel') {
      if (!actor.manager) throw new InventoryError('Only head office users can cancel sessions.', 403);
      if (['completed', 'cancelled'].includes(session.status)) {
        throw new InventoryError('This session is already closed.', 400);
      }
      session.status = 'cancelled';
      log(db, actor, 'Session cancelled', `${session.code} was cancelled.`, {
        campaign_id: session.campaign_id,
        session_id: session.id,
      });
    }
    session.updated_at = now;
    return { ...session, ...setupSessionCounts(db, session) };
  });
}

export type VerifyInput = {
  item_id?: string;
  result?: string;
  actual_branch?: string;
  actual_department?: string;
  actual_location?: string;
  actual_condition?: string;
  serial_confirmed?: boolean;
  label_present?: boolean;
  in_use?: boolean;
  employee_confirmed?: boolean;
  method?: string;
  notes?: string;
};

export function verifyItem(sessionId: string, input: VerifyInput, actor: VerificationActor) {
  return withDb((db) => {
    const session = sessionOrThrow(db, sessionId);
    if (!canAccessSession(actor, session)) throw new InventoryError('You do not have access to this session.', 403);
    if (['submitted', 'under_review', 'completed', 'cancelled'].includes(session.status)) {
      throw new InventoryError('This session is closed for verification.', 400);
    }
    const item = db.items.find((row) => row.id === String(input.item_id ?? '') && row.session_id === sessionId);
    if (!item) throw new InventoryError('Verification item not found.', 404);
    const result = text(input.result);
    if (!isVerifyResult(result)) throw new InventoryError('Choose a verification result.', 400);
    if (db.settings.require_evidence_for_discrepancy && result !== 'found' && result !== 'pending') {
      const evidence = db.evidence.filter((row) => row.verification_item_id === item.id);
      if (evidence.length === 0) {
        throw new InventoryError('This result needs at least one evidence photo or document.', 400);
      }
    }

    if (['draft', 'assigned'].includes(session.status)) {
      if (!db.settings.auto_start_session) {
        throw new InventoryError('Start the session before verifying assets.', 400);
      }
      session.status = 'in_progress';
      session.started_at = new Date().toISOString();
      log(db, actor, 'Session started', `${session.code} started automatically for verification.`, {
        campaign_id: session.campaign_id,
        session_id: session.id,
      });
    }

    const now = new Date().toISOString();
    Object.assign(item, {
      result,
      actual_branch: text(input.actual_branch),
      actual_department: text(input.actual_department),
      actual_location: text(input.actual_location),
      actual_condition: text(input.actual_condition),
      serial_confirmed: Boolean(input.serial_confirmed),
      label_present: Boolean(input.label_present),
      in_use: Boolean(input.in_use),
      employee_confirmed: Boolean(input.employee_confirmed),
      method: text(input.method) || 'manual',
      notes: text(input.notes),
      verified_by: actor.userId,
      verified_by_name: actor.name,
      verified_at: now,
      updated_at: now,
    });
    session.updated_at = now;

    let discrepancy: VerificationDiscrepancy | null = null;
    const type = discrepancyTypeForResult(result);
    if (type) {
      const open = db.discrepancies.find(
        (row) => row.verification_item_id === item.id && !['approved', 'rejected', 'resolved', 'closed'].includes(row.status)
      );
      if (open) {
        discrepancy = open;
      } else {
        discrepancy = {
          id: randomUUID(),
          code: nextCode(db, 'VD'),
          session_id: session.id,
          branch_name: session.branch_name,
          verification_item_id: item.id,
          asset_id: item.asset_id,
          asset_code: item.asset_code,
          asset_name: item.asset_name,
          type,
          description:
            result === 'wrong_location'
              ? `Expected ${item.expected_location || '—'} but found at ${text(input.actual_location) || '—'}.`
              : result === 'not_found'
                ? 'Asset was not found at the expected location during physical verification.'
                : text(input.notes) || 'Raised from the physical verification result.',
          priority: db.settings.default_priority,
          status: 'open',
          reported_by: actor.userId,
          reported_by_name: actor.name,
          reported_at: now,
          assigned_reviewer_id: null,
          assigned_reviewer_name: '',
          notes: [],
          resolution: '',
          resolved_by: '',
          resolved_by_name: '',
          resolved_at: null,
          approved_by: '',
          approved_by_name: '',
          approved_at: null,
          created_at: now,
          updated_at: now,
        };
        db.discrepancies.push(discrepancy);
        log(db, actor, 'Discrepancy reported', `${discrepancy.code} — ${item.asset_name}.`, {
          campaign_id: session.campaign_id,
          session_id: session.id,
          asset_id: item.asset_id,
        });
      }
    }

    log(db, actor, 'Asset verified', `${item.asset_code} — ${labelFrom(
      [
        { value: 'pending', label: 'Pending' },
        { value: 'found', label: 'Found' },
        { value: 'not_found', label: 'Not found' },
        { value: 'wrong_location', label: 'Wrong location' },
        { value: 'damaged', label: 'Found but damaged' },
        { value: 'inactive', label: 'Found but inactive' },
        { value: 'unable', label: 'Unable to verify' },
      ] as const,
      result
    )}.`, { campaign_id: session.campaign_id, session_id: session.id, asset_id: item.asset_id });

    return { item, discrepancy, session: { ...session, ...setupSessionCounts(db, session) } };
  });
}

export type DiscoveryInput = {
  asset_name?: string;
  category_id?: string | null;
  category_name?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  department?: string;
  location?: string;
  province?: string;
  condition?: string;
  estimated_value?: number | string | null;
  description?: string;
};

export function createDiscovery(sessionId: string, input: DiscoveryInput, actor: VerificationActor) {
  return withDb((db) => {
    const session = sessionOrThrow(db, sessionId);
    if (!canAccessSession(actor, session)) throw new InventoryError('You do not have access to this session.', 403);
    if (['submitted', 'under_review', 'completed', 'cancelled'].includes(session.status)) {
      throw new InventoryError('This session is closed for new discoveries.', 400);
    }
    const assetName = text(input.asset_name);
    if (!assetName) throw new InventoryError('Asset name is required.', 400, 'asset_name');
    const value = input.estimated_value == null || input.estimated_value === '' ? null : Number(input.estimated_value);
    const now = new Date().toISOString();
    const discovery: VerificationDiscovery = {
      id: randomUUID(),
      code: nextCode(db, 'VF'),
      session_id: session.id,
      campaign_id: session.campaign_id,
      branch_name: session.branch_name,
      asset_name: assetName,
      category_id: input.category_id ? String(input.category_id) : null,
      category_name: text(input.category_name),
      serial_number: text(input.serial_number),
      manufacturer: text(input.manufacturer),
      model: text(input.model),
      department: text(input.department),
      location: text(input.location),
      province: text(input.province) || session.province,
      condition: text(input.condition) as PhysicalCondition | '',
      estimated_value: value != null && Number.isFinite(value) ? value : null,
      description: text(input.description),
      status: 'submitted',
      discovered_by: actor.userId,
      discovered_by_name: actor.name,
      discovered_at: now,
      reviewed_by_name: '',
      reviewed_at: null,
      approved_by_name: '',
      approved_at: null,
      registered_asset_id: null,
      created_at: now,
      updated_at: now,
    };
    db.discoveries.push(discovery);
    log(db, actor, 'Unregistered asset reported', `${discovery.code} — ${assetName}.`, {
      campaign_id: session.campaign_id,
      session_id: session.id,
    });
    return discovery;
  });
}

export function listDiscoveries(
  actor: VerificationActor,
  filters: { status?: string | null; session_id?: string | null; q?: string | null } = {}
) {
  return withDb((db) => {
    const query = (filters.q ?? '').trim().toLowerCase();
    return db.discoveries
      .filter((row) => {
        const session = db.sessions.find((item) => item.id === row.session_id);
        if (!session || !canAccessSession(actor, session)) return false;
        if (filters.status && row.status !== filters.status) return false;
        if (filters.session_id && row.session_id !== filters.session_id) return false;
        if (!query) return true;
        return [row.code, row.asset_name, row.serial_number, row.branch_name, row.manufacturer]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
}

export function discoveryAction(
  id: string,
  action: 'review' | 'approve' | 'reject',
  actor: VerificationActor,
  note = ''
) {
  return withDb((db) => {
    if (!actor.manager) throw new InventoryError('Only head office users can review discoveries.', 403);
    const discovery = db.discoveries.find((row) => row.id === id);
    if (!discovery) throw new InventoryError('Discovery not found.', 404);
    const now = new Date().toISOString();
    if (action === 'review') {
      discovery.status = 'under_review';
      discovery.reviewed_by_name = actor.name;
      discovery.reviewed_at = now;
    } else if (action === 'approve') {
      discovery.status = 'approved';
      discovery.reviewed_by_name = actor.name;
      discovery.reviewed_at = now;
      discovery.approved_by_name = actor.name;
      discovery.approved_at = now;
    } else {
      discovery.status = 'rejected';
      discovery.reviewed_by_name = actor.name;
      discovery.reviewed_at = now;
    }
    discovery.description = note.trim()
      ? `${discovery.description}${discovery.description ? '\n' : ''}${note.trim()}`
      : discovery.description;
    discovery.updated_at = now;
    log(
      db,
      actor,
      action === 'approve' ? 'Discovery approved' : action === 'reject' ? 'Discovery rejected' : 'Discovery under review',
      `${discovery.code} — ${discovery.asset_name}.`,
      { campaign_id: discovery.campaign_id, session_id: discovery.session_id }
    );
    return discovery;
  });
}

export async function registerDiscovery(id: string, actor: VerificationActor) {
  if (!actor.manager) throw new InventoryError('Only head office users can register discovered assets.', 403);
  const discovery = await withDb((db) => {
    const row = db.discoveries.find((item) => item.id === id);
    if (!row) throw new InventoryError('Discovery not found.', 404);
    if (row.registered_asset_id) throw new InventoryError('This discovery is already registered.');
    if (row.status !== 'approved') throw new InventoryError('Approve the discovery before registering it.');
    return JSON.parse(JSON.stringify(row)) as VerificationDiscovery;
  });

  const asset = await saveAsset({
    asset_name: discovery.asset_name,
    tag_number: `DISC-${discovery.code.replace(/^VF-/, '')}`,
    serial_number: discovery.serial_number,
    department: discovery.department,
    location: discovery.location,
    province: discovery.province,
    category_id: discovery.category_id,
    status: 'New',
    cost: discovery.estimated_value,
    remark: `Discovered during physical verification (${discovery.code}). ${discovery.description}`.trim(),
  });

  return withDb((db) => {
    const row = db.discoveries.find((item) => item.id === id);
    if (!row) throw new InventoryError('Discovery not found.', 404);
    row.status = 'registered';
    row.registered_asset_id = asset.id;
    row.updated_at = new Date().toISOString();
    log(db, actor, 'Discovery registered', `${row.code} registered as asset ${asset.tag_number || asset.id}.`, {
      campaign_id: row.campaign_id,
      session_id: row.session_id,
      asset_id: asset.id,
    });
    return { discovery: row, asset };
  });
}

export function listDiscrepancies(
  actor: VerificationActor,
  filters: { status?: string | null; type?: string | null; session_id?: string | null; q?: string | null } = {}
) {
  return withDb((db) => {
    const query = (filters.q ?? '').trim().toLowerCase();
    return db.discrepancies
      .filter((row) => {
        const session = db.sessions.find((item) => item.id === row.session_id);
        if (!session || !canAccessSession(actor, session)) return false;
        if (filters.status && row.status !== filters.status) return false;
        if (filters.type && row.type !== filters.type) return false;
        if (filters.session_id && row.session_id !== filters.session_id) return false;
        if (!query) return true;
        return [row.code, row.asset_code, row.asset_name, row.branch_name, row.description]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => b.reported_at.localeCompare(a.reported_at));
  });
}

export function getDiscrepancy(id: string, actor: VerificationActor) {
  return withDb((db) => {
    const row = db.discrepancies.find((item) => item.id === id);
    if (!row) throw new InventoryError('Discrepancy not found.', 404);
    const session = db.sessions.find((item) => item.id === row.session_id);
    if (!session || !canAccessSession(actor, session)) throw new InventoryError('You do not have access to this discrepancy.', 403);
    const itemRecord = row.verification_item_id
      ? db.items.find((item) => item.id === row.verification_item_id) ?? null
      : null;
    return {
      discrepancy: row,
      session,
      item: itemRecord,
      evidence: db.evidence.filter(
        (file) => file.discrepancy_id === row.id || (row.verification_item_id && file.verification_item_id === row.verification_item_id)
      ),
      activity: db.activity
        .filter((logRow) => logRow.session_id === row.session_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 40),
    };
  });
}

export function updateDiscrepancy(
  id: string,
  input: {
    action?: 'assign' | 'note' | 'resolve' | 'approve' | 'reject' | 'close' | 'update';
    reviewer_id?: string | null;
    reviewer_name?: string;
    note?: string;
    resolution?: string;
    description?: string;
    priority?: string;
    type?: string;
  },
  actor: VerificationActor
) {
  return withDb((db) => {
    const row = db.discrepancies.find((item) => item.id === id);
    if (!row) throw new InventoryError('Discrepancy not found.', 404);
    const session = db.sessions.find((item) => item.id === row.session_id);
    if (!session || !canAccessSession(actor, session)) throw new InventoryError('You do not have access to this discrepancy.', 403);
    const action = input.action ?? 'update';
    const now = new Date().toISOString();
    const managerOnly = action === 'assign' || action === 'approve' || action === 'reject' || action === 'close';
    if (managerOnly && !actor.manager) throw new InventoryError('Only head office reviewers can do this.', 403);

    if (action === 'assign') {
      row.assigned_reviewer_id = input.reviewer_id ? String(input.reviewer_id) : null;
      row.assigned_reviewer_name = text(input.reviewer_name);
      if (row.status === 'open') row.status = 'under_investigation';
    } else if (action === 'note') {
      const note = text(input.note);
      if (!note) throw new InventoryError('Write an investigation note first.', 400);
      row.notes.push({ text: note, by: actor.name, at: now });
    } else if (action === 'resolve') {
      const resolution = text(input.resolution);
      if (!resolution) throw new InventoryError('Describe the resolution first.', 400, 'resolution');
      row.resolution = resolution;
      row.resolved_by = actor.userId;
      row.resolved_by_name = actor.name;
      row.resolved_at = now;
      row.status = 'awaiting_approval';
    } else if (action === 'approve') {
      if (!['awaiting_approval', 'resolved', 'under_investigation'].includes(row.status)) {
        throw new InventoryError('This discrepancy is not awaiting approval.', 400);
      }
      row.status = 'approved';
      row.approved_by = actor.userId;
      row.approved_by_name = actor.name;
      row.approved_at = now;
    } else if (action === 'reject') {
      row.status = 'rejected';
      row.approved_by = actor.userId;
      row.approved_by_name = actor.name;
      row.approved_at = now;
    } else if (action === 'close') {
      row.status = 'closed';
    } else {
      if (input.description !== undefined) row.description = text(input.description);
      if (input.priority && isPriority(input.priority)) row.priority = input.priority as CampaignPriority;
      if (input.type && isDiscrepancyType(input.type)) row.type = input.type as DiscrepancyType;
      if (input.note !== undefined && text(input.note)) {
        row.notes.push({ text: text(input.note), by: actor.name, at: now });
      }
    }
    row.updated_at = now;
    log(
      db,
      actor,
      `Discrepancy ${action === 'update' ? 'updated' : action}`,
      `${row.code} — ${row.asset_name}.`,
      { campaign_id: session.campaign_id, session_id: session.id, asset_id: row.asset_id }
    );
    return row;
  });
}

export type EvidenceInput = {
  bucket: string;
  path: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

export function saveEvidence(
  sessionId: string,
  input: EvidenceInput,
  actor: VerificationActor,
  links: { verification_item_id?: string | null; discrepancy_id?: string | null } = {}
) {
  return withDb((db) => {
    const session = sessionOrThrow(db, sessionId);
    if (!canAccessSession(actor, session)) throw new InventoryError('You do not have access to this session.', 403);
    const row: VerificationEvidence = {
      id: randomUUID(),
      session_id: session.id,
      verification_item_id: links.verification_item_id ? String(links.verification_item_id) : null,
      discrepancy_id: links.discrepancy_id ? String(links.discrepancy_id) : null,
      bucket: input.bucket,
      path: input.path,
      file_name: input.file_name,
      file_type: input.file_type,
      file_size: input.file_size,
      uploaded_by: actor.userId,
      uploaded_by_name: actor.name,
      created_at: new Date().toISOString(),
    };
    db.evidence.push(row);
    log(db, actor, 'Evidence uploaded', `${row.file_name} added to ${session.code}.`, {
      campaign_id: session.campaign_id,
      session_id: session.id,
    });
    return row;
  });
}

export type DashboardFilters = {
  campaign_id?: string | null;
  branch?: string | null;
  from?: string | null;
  to?: string | null;
};

export function verificationDashboard(actor: VerificationActor, filters: DashboardFilters = {}) {
  return withDb((db) => {
    const sessions = db.sessions.filter((session) => {
      if (!canAccessSession(actor, session)) return false;
      if (filters.campaign_id && session.campaign_id !== filters.campaign_id) return false;
      if (filters.branch && session.branch_name !== filters.branch) return false;
      if (filters.from && session.created_at.slice(0, 10) < filters.from) return false;
      if (filters.to && session.created_at.slice(0, 10) > filters.to) return false;
      return true;
    });
    const sessionIds = new Set(sessions.map((session) => session.id));
    const items = db.items.filter((item) => sessionIds.has(item.session_id));
    const discrepancies = db.discrepancies.filter((row) => sessionIds.has(row.session_id));
    const discoveries = db.discoveries.filter((row) => sessionIds.has(row.session_id));

    const count = (result: VerifyResult) => items.filter((item) => item.result === result).length;
    const verified = items.filter((item) => item.result !== 'pending').length;
    const headlines = {
      expected: items.length,
      verified,
      found: count('found'),
      not_found: count('not_found'),
      wrong_location: count('wrong_location'),
      damaged: count('damaged'),
      unregistered: discoveries.length,
      pending: items.length - verified,
      completion: progress(verified, items.length),
      open_discrepancies: discrepancies.filter(
        (row) => !['approved', 'rejected', 'resolved', 'closed'].includes(row.status)
      ).length,
    };

    const branchRows = sessions
      .map((session) => {
        const sessionItems = items.filter((item) => item.session_id === session.id);
        const sessionVerified = sessionItems.filter((item) => item.result !== 'pending');
        const countIn = (result: VerifyResult) => sessionItems.filter((item) => item.result === result).length;
        const lastVerified = sessionItems
          .map((item) => item.verified_at)
          .filter((value): value is string => Boolean(value))
          .sort()
          .pop();
        return {
          session_id: session.id,
          branch: session.branch_name,
          country: session.country || session.province || '—',
          officer: session.officer_name || 'Unassigned',
          expected: sessionItems.length,
          verified: sessionVerified.length,
          found: countIn('found'),
          not_found: countIn('not_found'),
          wrong_location: countIn('wrong_location'),
          pending: sessionItems.length - sessionVerified.length,
          completion: progress(sessionVerified.length, sessionItems.length),
          status: session.status,
          last_verified_at: lastVerified ?? null,
          campaign_name: session.campaign_name,
          campaign_id: session.campaign_id,
        };
      })
      .sort((a, b) => a.branch.localeCompare(b.branch) || a.campaign_name.localeCompare(b.campaign_name));

    const byType = new Map<string, number>();
    for (const row of discrepancies) byType.set(row.type, (byType.get(row.type) ?? 0) + 1);

    const branchStats = new Map<string, { name: string; verified: number; pending: number; completion: number }>();
    for (const row of branchRows) {
      const entry = branchStats.get(row.branch) ?? { name: row.branch, verified: 0, pending: 0, completion: 0 };
      entry.verified += row.verified;
      entry.pending += row.pending;
      branchStats.set(row.branch, entry);
    }
    for (const entry of branchStats.values()) {
      entry.completion = progress(entry.verified, entry.verified + entry.pending);
    }

    return {
      headlines,
      progress_chart: [
        { name: 'Verified', value: headlines.verified },
        { name: 'Pending', value: headlines.pending },
      ],
      branch_progress: [...branchStats.values()].sort((a, b) => b.completion - a.completion),
      discrepancy_distribution: [...byType.entries()].map(([type, value]) => ({ type, value })),
      branch_rows: branchRows,
      campaigns: db.campaigns
        .filter((campaign) => sessions.some((session) => session.campaign_id === campaign.id))
        .map((campaign) => ({ id: campaign.id, name: campaign.name, code: campaign.code })),
      branches: [...new Set(sessions.map((session) => session.branch_name))].sort(),
      filter_options: {
        campaigns: db.campaigns.map((campaign) => ({ value: campaign.id, label: `${campaign.code} — ${campaign.name}` })),
        branches: [...new Set(db.sessions.map((session) => session.branch_name))]
          .sort()
          .map((name) => ({ value: name, label: name })),
      },
    };
  });
}

export type ReportType = 'branch' | 'missing' | 'wrong_location' | 'condition' | 'unregistered' | 'history';

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'branch', label: 'Branch physical verification' },
  { value: 'missing', label: 'Missing assets' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'condition', label: 'Asset condition' },
  { value: 'unregistered', label: 'Unregistered assets' },
  { value: 'history', label: 'Verification history' },
];

export type ReportFilters = {
  campaign_id?: string | null;
  branch?: string | null;
  country?: string | null;
  department?: string | null;
  category?: string | null;
  officer_id?: string | null;
  result?: string | null;
  status?: string | null;
  from?: string | null;
  to?: string | null;
};

type ReportRow = Record<string, string | number>;
type ReportColumn = { header: string; key: string; align?: 'left' | 'right' | 'center' };

export function verificationReport(actor: VerificationActor, type: ReportType, filters: ReportFilters = {}) {
  return withDb((db) => {
    const sessions = db.sessions.filter((session) => {
      if (!canAccessSession(actor, session)) return false;
      if (filters.campaign_id && session.campaign_id !== filters.campaign_id) return false;
      if (filters.branch && session.branch_name !== filters.branch) return false;
      if (filters.country && session.country !== filters.country) return false;
      if (filters.officer_id && session.officer_id !== filters.officer_id) return false;
      if (filters.status && session.status !== filters.status) return false;
      if (filters.from && session.created_at.slice(0, 10) < filters.from) return false;
      if (filters.to && session.created_at.slice(0, 10) > filters.to) return false;
      return true;
    });
    const sessionIds = new Set(sessions.map((session) => session.id));
    const sessionById = new Map(sessions.map((session) => [session.id, session]));
    const items = db.items.filter((item) => {
      if (!sessionIds.has(item.session_id)) return false;
      if (filters.department && item.expected_department !== filters.department) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.result && item.result !== filters.result) return false;
      if (filters.from && item.verified_at && item.verified_at.slice(0, 10) < filters.from) return false;
      if (filters.to && item.verified_at && item.verified_at.slice(0, 10) > filters.to) return false;
      return true;
    });

    const date = (value: string | null) => (value ? value.slice(0, 10) : '');

    if (type === 'branch') {
      const rows: ReportRow[] = sessions
        .map((session) => {
          const sessionItems = db.items.filter((item) => item.session_id === session.id);
          const verified = sessionItems.filter((item) => item.result !== 'pending').length;
          const countIn = (result: VerifyResult) => sessionItems.filter((item) => item.result === result).length;
          return {
            branch: session.branch_name,
            country: session.country || '—',
            officer: session.officer_name || 'Unassigned',
            campaign: session.campaign_name,
            expected: sessionItems.length,
            verified,
            found: countIn('found'),
            not_found: countIn('not_found'),
            wrong_location: countIn('wrong_location'),
            damaged: countIn('damaged'),
            pending: sessionItems.length - verified,
            completion: `${progress(verified, sessionItems.length)}%`,
            status: session.status,
            last_verification: date(
              sessionItems
                .map((item) => item.verified_at)
                .filter((value): value is string => Boolean(value))
                .sort()
                .pop() ?? null
            ),
          };
        })
        .sort((a, b) => String(a.branch).localeCompare(String(b.branch)));
      return {
        type,
        title: REPORT_TYPES.find((row) => row.value === type)?.label ?? 'Report',
        columns: [
          { header: 'Branch', key: 'branch' },
          { header: 'Country', key: 'country' },
          { header: 'Officer', key: 'officer' },
          { header: 'Campaign', key: 'campaign' },
          { header: 'Expected', key: 'expected', align: 'right' },
          { header: 'Verified', key: 'verified', align: 'right' },
          { header: 'Found', key: 'found', align: 'right' },
          { header: 'Not found', key: 'not_found', align: 'right' },
          { header: 'Wrong location', key: 'wrong_location', align: 'right' },
          { header: 'Damaged', key: 'damaged', align: 'right' },
          { header: 'Pending', key: 'pending', align: 'right' },
          { header: 'Completion', key: 'completion', align: 'right' },
          { header: 'Session status', key: 'status' },
          { header: 'Last verification', key: 'last_verification' },
        ] satisfies ReportColumn[],
        rows,
      };
    }

    if (type === 'missing' || type === 'wrong_location' || type === 'condition' || type === 'history') {
      const wanted =
        type === 'missing'
          ? ['not_found']
          : type === 'wrong_location'
            ? ['wrong_location']
            : type === 'history'
              ? null
              : ['damaged', 'inactive'];
      const rows: ReportRow[] = items
        .filter((item) => (wanted ? wanted.includes(item.result) : item.result !== 'pending'))
        .map((item) => {
          const session = sessionById.get(item.session_id);
          return {
            asset_code: item.asset_code,
            asset_name: item.asset_name,
            category: item.category || '—',
            branch: session?.branch_name ?? '—',
            campaign: session?.campaign_name ?? '—',
            officer: session?.officer_name || 'Unassigned',
            expected_department: item.expected_department || '—',
            expected_location: item.expected_location || '—',
            actual_location: item.actual_location || '—',
            expected_status: item.expected_status || '—',
            result: item.result,
            condition: item.actual_condition || '—',
            verified_by: item.verified_by_name || '—',
            verified_at: date(item.verified_at),
            notes: item.notes || '',
          };
        });
      const baseColumns: ReportColumn[] = [
        { header: 'Asset code', key: 'asset_code' },
        { header: 'Asset name', key: 'asset_name' },
        { header: 'Category', key: 'category' },
        { header: 'Branch', key: 'branch' },
        { header: 'Campaign', key: 'campaign' },
        { header: 'Officer', key: 'officer' },
      ];
      if (type === 'wrong_location') {
        baseColumns.push(
          { header: 'Expected department', key: 'expected_department' },
          { header: 'Expected location', key: 'expected_location' },
          { header: 'Actual location', key: 'actual_location' }
        );
      }
      if (type === 'condition') {
        baseColumns.push(
          { header: 'Official status', key: 'expected_status' },
          { header: 'Physical condition', key: 'condition' }
        );
      }
      baseColumns.push(
        { header: 'Result', key: 'result' },
        { header: 'Verified by', key: 'verified_by' },
        { header: 'Verified at', key: 'verified_at' },
        { header: 'Notes', key: 'notes' }
      );
      return {
        type,
        title: REPORT_TYPES.find((row) => row.value === type)?.label ?? 'Report',
        columns: baseColumns,
        rows,
      };
    }

    const discoveries = db.discoveries.filter((row) => {
      if (!sessionIds.has(row.session_id)) return false;
      if (filters.department && row.department !== filters.department) return false;
      return true;
    });
    const rows: ReportRow[] = discoveries.map((row) => ({
      code: row.code,
      asset_name: row.asset_name,
      category: row.category_name || '—',
      serial_number: row.serial_number || '—',
      branch: row.branch_name,
      department: row.department || '—',
      location: row.location || '—',
      condition: row.condition || '—',
      estimated_value: row.estimated_value == null ? '—' : String(row.estimated_value),
      status: row.status,
      discovered_by: row.discovered_by_name,
      discovered_at: date(row.discovered_at),
    }));
    return {
      type,
      title: REPORT_TYPES.find((row) => row.value === type)?.label ?? 'Report',
      columns: [
        { header: 'Discovery', key: 'code' },
        { header: 'Asset name', key: 'asset_name' },
        { header: 'Category', key: 'category' },
        { header: 'Serial number', key: 'serial_number' },
        { header: 'Branch', key: 'branch' },
        { header: 'Department', key: 'department' },
        { header: 'Location', key: 'location' },
        { header: 'Condition', key: 'condition' },
        { header: 'Estimated value', key: 'estimated_value', align: 'right' },
        { header: 'Status', key: 'status' },
        { header: 'Discovered by', key: 'discovered_by' },
        { header: 'Discovered at', key: 'discovered_at' },
      ] satisfies ReportColumn[],
      rows,
    };
  });
}

export function verificationOptions() {
  return withDb((db) => {
    const assets = db.items;
    const uniq = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
    return {
      campaigns: db.campaigns
        .map((campaign) => ({
          value: campaign.id,
          label: `${campaign.code} — ${campaign.name}`,
          status: campaign.status,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      branches: uniq(db.sessions.map((session) => session.branch_name)).map((name) => ({ value: name, label: name })),
      countries: uniq(db.sessions.map((session) => session.country)).map((name) => ({ value: name, label: name })),
      departments: uniq([
        ...assets.map((item) => item.expected_department),
        ...db.discoveries.map((row) => row.department),
      ]).map((name) => ({ value: name, label: name })),
      categories: uniq([
        ...assets.map((item) => item.category),
        ...db.discoveries.map((row) => row.category_name),
      ]).map((name) => ({ value: name, label: name })),
      campaigns_meta: db.campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        code: campaign.code,
        status: campaign.status,
        branches: campaign.branches.map((branch) => ({
          branch_id: branch.branch_id,
          name: branch.name,
          country: branch.country,
          province: branch.province,
        })),
      })),
    };
  });
}
