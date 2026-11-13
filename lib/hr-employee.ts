import { str } from '@/lib/portal-api';

export type EmployeeKind = 'staff' | 'teacher';

export const EMPLOYEE_STATUSES = new Set([
  'active',
  'on_leave',
  'inactive',
  'resigned',
  'terminated',
]);

export const CONTRACT_TYPES = new Set(['full-time', 'part-time', 'contract', 'temporary']);

/** Map legacy UI labels onto the values allowed by the staff/teachers check constraints. */
export function normalizeContractType(value: unknown): string | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .replaceAll(' ', '-');
  if (!raw) return null;
  if (raw === 'permanent' || raw === 'fulltime') return 'full-time';
  if (raw === 'parttime') return 'part-time';
  if (raw === 'probation') return 'temporary';
  return CONTRACT_TYPES.has(raw) ? raw : null;
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function employeeKind(value: unknown): EmployeeKind | null {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'teacher' || raw === 'teachers') return 'teacher';
  if (raw === 'staff') return 'staff';
  return null;
}

type BuildResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validates an employee create/edit body for either table.
 * `creating` enforces required fields and the kind; edits only patch supplied keys.
 */
export function buildEmployeeValues(
  body: Record<string, unknown>,
  kind: EmployeeKind,
  creating: boolean
): BuildResult {
  const values: Record<string, unknown> = {};

  if (creating || 'fullName' in body) {
    const fullName = str(body.fullName);
    if (!fullName || fullName.length < 2 || fullName.length > 120) {
      return { ok: false, error: 'Full name must be between 2 and 120 characters' };
    }
    values.full_name = fullName;
  }

  if ('employeeCode' in body) {
    const code = str(body.employeeCode);
    if (code && (code.length < 2 || code.length > 40)) {
      return { ok: false, error: 'Employee code must be between 2 and 40 characters' };
    }
    values.employee_code = code;
  }

  if ('email' in body) {
    const email = str(body.email)?.toLowerCase() ?? null;
    if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return { ok: false, error: 'Enter a valid email address' };
    }
    values.email = email;
  }

  if ('phone' in body) {
    const phone = str(body.phone);
    if (phone && phone.length > 40) {
      return { ok: false, error: 'Phone number is too long' };
    }
    values.phone = phone;
  }

  if ('salary' in body) {
    const salary = Number(body.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      return { ok: false, error: 'Salary must be zero or greater' };
    }
    values.salary = salary;
  }

  if ('joinDate' in body) {
    const joinDate = str(body.joinDate);
    if (joinDate && !isIsoDate(joinDate)) {
      return { ok: false, error: 'Join date must be a valid date' };
    }
    values.join_date = joinDate;
  }

  if ('contractType' in body) {
    const contractType = normalizeContractType(body.contractType);
    if (!contractType) {
      return {
        ok: false,
        error: 'Contract type must be full-time, part-time, contract, or temporary',
      };
    }
    values.contract_type = contractType;
  }

  if ('status' in body) {
    const status = String(body.status ?? '').trim().toLowerCase();
    if (!EMPLOYEE_STATUSES.has(status)) {
      return { ok: false, error: 'Invalid employment status' };
    }
    values.status = status;
  }

  if (kind === 'staff') {
    if ('designation' in body) {
      const designation = str(body.designation);
      if (designation && designation.length > 120) {
        return { ok: false, error: 'Designation is too long' };
      }
      values.designation = designation;
    }
    if ('department' in body) {
      const department = str(body.department);
      if (department && department.length > 120) {
        return { ok: false, error: 'Department name is too long' };
      }
      values.department = department;
    }
  } else {
    if ('specialization' in body) {
      const specialization = str(body.specialization);
      if (specialization && specialization.length > 120) {
        return { ok: false, error: 'Specialization is too long' };
      }
      values.specialization = specialization;
    }
    if ('departmentId' in body) {
      values.department_id = str(body.departmentId);
    }
  }

  return { ok: true, values };
}

export function generatedEmployeeCode(kind: EmployeeKind) {
  const prefix = kind === 'teacher' ? 'TCH' : 'STF';
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function friendlyEmployeeError(message: string, code?: string) {
  if (code === '23505') {
    return 'That employee code or email is already in use';
  }
  if (code === '23503') {
    return 'Department not found — refresh the page and try again';
  }
  return message;
}
