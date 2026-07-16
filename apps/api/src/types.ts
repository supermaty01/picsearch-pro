import { type Env } from './env.js';

/** Per-request Hono context variables (set by middleware). */
export interface Variables {
  /** Correlation id echoed as `x-request-id` and embedded in problem+json. */
  requestId: string;
}

/** Generic bindings shape for every router in the app. */
export interface AppBindings {
  Bindings: Env;
  Variables: Variables;
}
