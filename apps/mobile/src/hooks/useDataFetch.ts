import { useState, useCallback, useEffect } from "react";
import { getUserFriendlyErrorMessage } from "../components/ErrorState";

export interface UseDataFetchOptions<T> {
  /** Function that fetches the data */
  fetchFn: () => Promise<T>;
  /** Whether to fetch immediately on mount */
  immediate?: boolean;
  /** Dependencies that should trigger a refetch */
  deps?: React.DependencyList;
  /** Optional transform function for the fetched data */
  transform?: (data: T) => T;
}

export interface UseDataFetchResult<T> {
  /** The fetched data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Refreshing state (for pull-to-refresh) */
  refreshing: boolean;
  /** Error message (null if no error) */
  error: string | null;
  /** Manually trigger a fetch */
  refetch: () => Promise<void>;
  /** Refresh data (sets refreshing state) */
  refresh: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for fetching data with loading, error, and refresh states
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useDataFetch({
 *   fetchFn: () => getChoreStats(token),
 *   immediate: true,
 *   deps: [token],
 * });
 * ```
 */
export function useDataFetch<T>({
  fetchFn,
  immediate = true,
  deps = [],
  transform,
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeFetch = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const result = await fetchFn();
        const transformed = transform ? transform(result) : result;
        setData(transformed);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchFn, transform],
  );

  const refetch = useCallback(async () => {
    await executeFetch(false);
  }, [executeFetch]);

  const refresh = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLoading(immediate);
    setRefreshing(false);
    setError(null);
  }, [immediate]);

  useEffect(() => {
    if (immediate) {
      executeFetch(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return {
    data,
    loading,
    refreshing,
    error,
    refetch,
    refresh,
    clearError,
    reset,
  };
}
