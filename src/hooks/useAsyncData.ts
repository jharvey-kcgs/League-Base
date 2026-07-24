import { useEffect, useState } from 'react';

export type AsyncStatus = 'loading' | 'error' | 'ready';

interface AsyncData<T> {
  status: AsyncStatus;
  data: T | undefined;
}

/** Runs an async fetcher on mount and whenever deps change, tracking
 * loading/error/ready state. Guards against setting state after unmount
 * (e.g. navigating away from a screen before its fetch resolves). */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncData<T> {
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { status, data };
}
