// Loaded with `node --import ./tests/ai/register.mjs` so tests can import app TypeScript
// through the `@/` alias (Node 24 strips the types natively).
import { register } from 'node:module';

register('./resolve-hook.mjs', import.meta.url);
