import test from 'node:test';
import assert from 'node:assert/strict';
import { canRoleUseAI, isNonStaffRole, resolveAllowedModules } from '@/lib/ai/modules';
import { getToolDeclarations, BUSINESS_TOOLS } from '@/lib/ai/tools/index';

const base = { abilities: [] as string[], isPlatformScope: false };

test('teacher gets academic + platform support but never finance, payroll, HR, or inventory', () => {
  const modules = resolveAllowedModules({ ...base, role: 'teacher' });
  assert.ok(modules.includes('academic'));
  assert.ok(modules.includes('platform_support'));
  for (const denied of ['finance', 'payroll', 'hr', 'inventory', 'reports'] as const) {
    assert.ok(!modules.includes(denied), `teacher must not get ${denied}`);
  }
});

test('accountant gets finance but not academic or payroll', () => {
  const modules = resolveAllowedModules({ ...base, role: 'accountant' });
  assert.ok(modules.includes('finance'));
  assert.ok(!modules.includes('academic'));
  assert.ok(!modules.includes('payroll'));
});

test('HR manager gets HR and payroll but not finance', () => {
  const modules = resolveAllowedModules({ ...base, role: 'hr_manager' });
  assert.ok(modules.includes('hr'));
  assert.ok(modules.includes('payroll'));
  assert.ok(!modules.includes('finance'));
});

test('students, guardians, parents, and unknown roles get nothing', () => {
  for (const role of ['student', 'guardian', 'parent', null, '']) {
    assert.deepEqual(resolveAllowedModules({ ...base, role }), []);
    assert.equal(canRoleUseAI(role), false);
    assert.equal(isNonStaffRole(role), true);
  }
});

test('inventory requires platform scope even for admins', () => {
  assert.ok(!resolveAllowedModules({ ...base, role: 'admin' }).includes('inventory'));
  assert.ok(resolveAllowedModules({ ...base, role: 'super_admin', isPlatformScope: true }).includes('inventory'));
  assert.ok(!resolveAllowedModules({ ...base, role: 'super_admin', isPlatformScope: false }).includes('inventory'));
});

test('organization module allow-list restricts every role', () => {
  const modules = resolveAllowedModules({ ...base, role: 'admin', tenantAllowedModules: ['platform_support', 'academic'] });
  assert.deepEqual([...modules].sort(), ['academic', 'platform_support']);
});

test('disabling business data leaves only platform support', () => {
  const modules = resolveAllowedModules({ ...base, role: 'admin', capabilities: { business_data: false } });
  assert.deepEqual(modules, ['platform_support']);
});

test('custom role unlocks a module only through an explicit ability', () => {
  assert.ok(!resolveAllowedModules({ ...base, role: 'custom_role' }).includes('finance'));
  assert.ok(resolveAllowedModules({ ...base, role: 'custom_role', abilities: ['Payments'] }).includes('finance'));
});

test('organization allowed-roles list is enforced; platform roles always pass', () => {
  assert.equal(canRoleUseAI('teacher', ['accountant']), false);
  assert.equal(canRoleUseAI('accountant', ['accountant']), true);
  assert.equal(canRoleUseAI('teacher', null), true);
  assert.equal(canRoleUseAI('super_admin', ['accountant']), true);
});

test('only tools for permitted modules are declared to the model', () => {
  const declared = getToolDeclarations(['academic']).map((d) => d.name);
  const academic = BUSINESS_TOOLS.filter((t) => t.module === 'academic').map((t) => t.name);
  assert.deepEqual(declared.sort(), academic.sort());
  assert.ok(!declared.includes('get_revenue_summary'));
  assert.deepEqual(getToolDeclarations([]), []);
});

test('no tool lets the model choose tenant, organization, user, or branch ids', () => {
  const forbidden = /^(tenant|organization|org|user|branch|business)(_id|_ids|id)?$/i;
  for (const tool of BUSINESS_TOOLS) {
    for (const key of Object.keys(tool.parameters.properties)) {
      assert.ok(!forbidden.test(key), `${tool.name} exposes parameter ${key}`);
    }
  }
});
