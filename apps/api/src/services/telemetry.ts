import { type AgentAction, type TelemetryListResponse } from '@picsearch/shared';

import { type Env } from '../env.js';
import { UpstreamError } from '../lib/problem.js';
import { createSupabase } from '../lib/supabase.js';

/**
 * Query telemetry persistence (FR-11) and read-back (FR-12). Writes are
 * best-effort: a telemetry failure is logged but never fails the search that
 * produced it (observability must not break the product).
 */
export interface TelemetryInput {
  queryText: string;
  agentAction: AgentAction;
  resolvedQueries: string[];
  agentDecisionMs: number;
  embeddingMs: number;
  vectorSearchMs: number;
  rerankMs: number;
  executionTimeMs: number;
  tokensUsed: number | null;
  modelProvider: string;
  rerankSkipped: boolean;
}

export async function insertTelemetry(env: Env, row: TelemetryInput): Promise<void> {
  try {
    const supabase = createSupabase(env);
    const { error } = await supabase.from('query_telemetry').insert({
      query_text: row.queryText,
      agent_action: row.agentAction,
      resolved_queries: row.resolvedQueries,
      agent_decision_ms: row.agentDecisionMs,
      embedding_ms: row.embeddingMs,
      vector_search_ms: row.vectorSearchMs,
      rerank_ms: row.rerankMs,
      execution_time_ms: row.executionTimeMs,
      tokens_used: row.tokensUsed,
      model_provider: row.modelProvider,
      rerank_skipped: row.rerankSkipped,
    });
    if (error) console.error('telemetry insert failed:', error.message);
  } catch (err) {
    console.error('telemetry insert threw:', err);
  }
}

export async function listTelemetry(env: Env, limit: number): Promise<TelemetryListResponse> {
  const supabase = createSupabase(env);
  const { data, error } = (await supabase
    .from('query_telemetry')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)) as {
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  };

  if (error) throw new UpstreamError(`telemetry listing failed: ${error.message}`);

  const rows = data ?? [];
  return {
    items: rows.map((r) => ({
      id: String(r.id),
      queryText: String(r.query_text),
      agentAction: r.agent_action as AgentAction,
      resolvedQueries: Array.isArray(r.resolved_queries) ? (r.resolved_queries as string[]) : [],
      agentDecisionMs: Number(r.agent_decision_ms),
      embeddingMs: Number(r.embedding_ms),
      vectorSearchMs: Number(r.vector_search_ms),
      rerankMs: Number(r.rerank_ms),
      executionTimeMs: Number(r.execution_time_ms),
      tokensUsed: r.tokens_used === null ? null : Number(r.tokens_used),
      modelProvider: String(r.model_provider),
      rerankSkipped: Boolean(r.rerank_skipped),
      createdAt: String(r.created_at),
    })),
  };
}
