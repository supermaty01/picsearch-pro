import { SEED_STORAGE_PREFIX } from '@picsearch/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase.js', () => ({
  createSupabase: vi.fn(),
  STORAGE_BUCKET: 'images',
}));

import { createSupabase } from '../src/lib/supabase.js';
import { UpstreamError } from '../src/lib/problem.js';
import { purgeExpiredUploads } from '../src/services/cleanup.js';
import { makeEnv } from './helpers.js';

const env = makeEnv(() => ({}));

interface FakeCalls {
  notArgs: unknown[];
  removedPaths: string[] | null;
  deletedIds: string[] | null;
}

/** Fake covering exactly the two queries + storage call the sweep performs. */
function makeCleanupSupabase(
  expiredRows: { id: string; storage_path: string }[],
  options: { removeError?: string; deleteError?: string } = {},
): { client: unknown; calls: FakeCalls } {
  const calls: FakeCalls = { notArgs: [], removedPaths: null, deletedIds: null };
  const selectBuilder = {
    lt: () => selectBuilder,
    not: (...args: unknown[]) => {
      calls.notArgs = args;
      return Promise.resolve({ data: expiredRows, error: null });
    },
  };
  const client = {
    from: () => ({
      select: () => selectBuilder,
      delete: () => ({
        in: (_column: string, ids: string[]) => {
          calls.deletedIds = ids;
          return Promise.resolve({
            data: null,
            error: options.deleteError ? { message: options.deleteError } : null,
          });
        },
      }),
    }),
    storage: {
      from: () => ({
        remove: (paths: string[]) => {
          calls.removedPaths = paths;
          return Promise.resolve({
            data: [],
            error: options.removeError ? { message: options.removeError } : null,
          });
        },
      }),
    },
  };
  return { client, calls };
}

function useFake(fake: { client: unknown }): void {
  vi.mocked(createSupabase).mockReturnValue(fake.client as ReturnType<typeof createSupabase>);
}

beforeEach(() => {
  vi.mocked(createSupabase).mockReset();
});

describe('purgeExpiredUploads (24 h retention)', () => {
  it('removes expired storage objects and rows, excluding the seed corpus', async () => {
    const fake = makeCleanupSupabase([
      { id: 'id-1', storage_path: 'aaa.jpg' },
      { id: 'id-2', storage_path: 'bbb.png' },
    ]);
    useFake(fake);

    await expect(purgeExpiredUploads(env)).resolves.toBe(2);
    expect(fake.calls.notArgs).toEqual(['storage_path', 'like', `${SEED_STORAGE_PREFIX}/%`]);
    expect(fake.calls.removedPaths).toEqual(['aaa.jpg', 'bbb.png']);
    expect(fake.calls.deletedIds).toEqual(['id-1', 'id-2']);
  });

  it('is a no-op when nothing has expired', async () => {
    const fake = makeCleanupSupabase([]);
    useFake(fake);

    await expect(purgeExpiredUploads(env)).resolves.toBe(0);
    expect(fake.calls.removedPaths).toBeNull();
    expect(fake.calls.deletedIds).toBeNull();
  });

  it('keeps rows (for a retry next run) when storage removal fails', async () => {
    const fake = makeCleanupSupabase([{ id: 'id-1', storage_path: 'aaa.jpg' }], {
      removeError: 'storage down',
    });
    useFake(fake);

    await expect(purgeExpiredUploads(env)).rejects.toBeInstanceOf(UpstreamError);
    expect(fake.calls.deletedIds).toBeNull();
  });
});
