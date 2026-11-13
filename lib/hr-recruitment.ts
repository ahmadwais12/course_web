import { num, str } from '@/lib/portal-api';

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export const OPENING_STATUSES = ['Open', 'Closed', 'On Hold'] as const;

export function normalizeJobType(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
  return JOB_TYPES.find((type) => type.toLowerCase() === raw) ?? null;
}

export function normalizeOpeningStatus(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase().replaceAll('_', ' ');
  return OPENING_STATUSES.find((status) => status.toLowerCase() === raw) ?? null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function openingValues(body: Record<string, unknown>, creating: boolean) {
  const values: Record<string, unknown> = {};

  if (creating || 'positionTitle' in body) {
    const title = str(body.positionTitle);
    if (!title || title.length < 2 || title.length > 120) {
      return { error: 'Position title must be between 2 and 120 characters' } as const;
    }
    values.position_title = title;
  }

  if ('department' in body) values.department = str(body.department);

  if ('jobType' in body) {
    const jobType = normalizeJobType(body.jobType);
    if (!jobType) {
      return { error: 'Job type must be Full-time, Part-time, Contract, or Internship' } as const;
    }
    values.job_type = jobType;
  }

  if ('description' in body) values.description = str(body.description);

  if ('requirements' in body) {
    const raw = body.requirements;
    const list = Array.isArray(raw)
      ? raw.map((item) => String(item ?? '').trim()).filter(Boolean)
      : String(raw ?? '')
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean);
    values.requirements = list;
  }

  if ('experienceRequired' in body) {
    const years = Math.trunc(num(body.experienceRequired));
    if (years < 0) return { error: 'Experience cannot be negative' } as const;
    values.experience_required = years;
  }

  if ('salaryRangeMin' in body) {
    const raw = body.salaryRangeMin;
    if (raw === null || raw === '') values.salary_range_min = null;
    else {
      const amount = num(raw);
      if (amount < 0) return { error: 'Salary range cannot be negative' } as const;
      values.salary_range_min = amount;
    }
  }

  if ('salaryRangeMax' in body) {
    const raw = body.salaryRangeMax;
    if (raw === null || raw === '') values.salary_range_max = null;
    else {
      const amount = num(raw);
      if (amount < 0) return { error: 'Salary range cannot be negative' } as const;
      values.salary_range_max = amount;
    }
  }

  if (
    typeof values.salary_range_min === 'number' &&
    typeof values.salary_range_max === 'number' &&
    values.salary_range_min > values.salary_range_max
  ) {
    return { error: 'Minimum salary cannot exceed the maximum' } as const;
  }

  if ('openings' in body) {
    const openings = Math.trunc(num(body.openings));
    if (openings < 1) return { error: 'Openings must be at least 1' } as const;
    values.openings = openings;
  }

  if ('postedDate' in body) {
    const posted = str(body.postedDate);
    if (posted && !isIsoDate(posted)) {
      return { error: 'Posted date must be a valid date' } as const;
    }
    values.posted_date = posted;
  }

  if ('deadlineDate' in body) {
    const deadline = str(body.deadlineDate);
    if (deadline && !isIsoDate(deadline)) {
      return { error: 'Deadline must be a valid date' } as const;
    }
    values.deadline_date = deadline;
  }

  if ('status' in body) {
    const status = normalizeOpeningStatus(body.status);
    if (!status) return { error: 'Status must be Open, Closed, or On Hold' } as const;
    values.status = status;
  }

  return { values } as const;
}
