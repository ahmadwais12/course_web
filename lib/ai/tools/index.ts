import type { AIModule } from '@/lib/ai/modules';
import { ToolArgumentError } from '@/lib/ai/period';
import type { ProviderToolDeclaration } from '@/lib/ai/providers/types';
import type { AIRequestContext, ToolResult } from '@/lib/ai/types';
import { academicTools } from '@/lib/ai/tools/academic';
import { admissionsTools } from '@/lib/ai/tools/admissions';
import { ToolDataError, ToolScopeError, validateArgs, type ToolDb, type ToolDefinition } from '@/lib/ai/tools/common';
import { financeTools } from '@/lib/ai/tools/finance';
import { hrTools } from '@/lib/ai/tools/hr';
import { inventoryTools } from '@/lib/ai/tools/inventory';
import { reportTools } from '@/lib/ai/tools/reports';

export const BUSINESS_TOOLS: ToolDefinition[] = [
  ...academicTools,
  ...admissionsTools,
  ...financeTools,
  ...hrTools,
  ...inventoryTools,
  ...reportTools,
];

const BY_NAME = new Map(BUSINESS_TOOLS.map((tool) => [tool.name, tool]));

export function getTool(name: string) {
  return BY_NAME.get(name);
}

/** Only tools for modules the user may access are ever declared to the model. */
export function getToolDeclarations(allowedModules: AIModule[]): ProviderToolDeclaration[] {
  return BUSINESS_TOOLS.filter((tool) => allowedModules.includes(tool.module)).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export type ToolExecution =
  | { ok: true; name: string; module: AIModule; result: ToolResult; durationMs: number }
  | {
      ok: false;
      name: string;
      module: AIModule | null;
      error: 'unknown_tool' | 'permission_denied' | 'invalid_arguments' | 'data_unavailable';
      message: string;
      durationMs: number;
    };

/**
 * Runs a model-requested tool. Never throws: errors become safe, structured results
 * the model can explain. Permission is re-checked here regardless of what was declared.
 */
export async function executeTool(
  name: string,
  rawArgs: unknown,
  ctx: AIRequestContext,
  db: ToolDb
): Promise<ToolExecution> {
  const started = Date.now();
  const tool = BY_NAME.get(name);
  const done = (partial: Omit<Extract<ToolExecution, { ok: false }>, 'durationMs' | 'ok' | 'name'>): ToolExecution => ({
    ok: false,
    name,
    durationMs: Date.now() - started,
    ...partial,
  });
  if (!tool) return done({ module: null, error: 'unknown_tool', message: 'This tool does not exist.' });
  if (!ctx.allowedModules.includes(tool.module)) {
    return done({
      module: tool.module,
      error: 'permission_denied',
      message: `The user is not permitted to access ${tool.module} data. Tell them politely they do not have access.`,
    });
  }
  try {
    const args = validateArgs(tool.parameters, rawArgs);
    const result = await tool.execute(args, ctx, db);
    return { ok: true, name, module: tool.module, result, durationMs: Date.now() - started };
  } catch (error) {
    if (error instanceof ToolArgumentError) {
      return done({ module: tool.module, error: 'invalid_arguments', message: error.message });
    }
    if (error instanceof ToolScopeError) {
      return done({
        module: tool.module,
        error: 'permission_denied',
        message: 'This data is not available for the user’s organization scope.',
      });
    }
    if (error instanceof ToolDataError) {
      console.error(`[ai] tool ${name} data error:`, error.message);
    } else {
      console.error(`[ai] tool ${name} failed:`, error instanceof Error ? error.message : error);
    }
    return done({
      module: tool.module,
      error: 'data_unavailable',
      message: 'The data could not be loaded right now. Do not guess numbers; tell the user to try again later.',
    });
  }
}
