'use client';

import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string };

/**
 * Runs `load` when the dependencies change. Stale responses are dropped, so a slow earlier request
 * cannot overwrite a newer one. `retry` runs the same load again.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setState({ status: 'ready', data });
      },
      (err: unknown) => {
        if (active) setState({ status: 'error', error: err instanceof Error ? err.message : 'Request failed.' });
      },
    );
    return () => {
      active = false;
    };
    // `load` is intentionally left out: callers pass their inputs through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
