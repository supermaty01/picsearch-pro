import { type Env } from '../env.js';

/**
 * Thin wrapper over the Workers AI binding that routes every call through AI
 * Gateway (ADR-0002, NFR-9): caching, analytics, rate-limit protection, retries.
 *
 * The binding's `run` overloads are keyed to Cloudflare's built-in model union,
 * which does not include every catalog model we use (e.g. glm-4.7-flash). We
 * therefore call through a narrow structural interface and return `unknown`;
 * each service Zod-parses the result, because model output is untrusted (NFR-4).
 */
interface AiRunner {
  run(
    model: string,
    input: Record<string, unknown>,
    options?: { gateway?: { id: string } },
  ): Promise<unknown>;
}

export async function aiRun(
  env: Env,
  model: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const runner = env.AI as unknown as AiRunner;
  return runner.run(model, input, { gateway: { id: env.AI_GATEWAY_ID } });
}
