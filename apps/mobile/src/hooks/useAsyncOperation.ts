import { useState, useCallback } from "react";
import { getUserFriendlyErrorMessage } from "../components/ErrorState";

export interface UseAsyncOperationOptions<TData, TParams = void> {
  /** Function that performs the async operation */
  operationFn: (params: TParams) => Promise<TData>;
  /** Callback when operation succeeds */
  onSuccess?: (data: TData) => void;
  /** Callback when operation fails */
  onError?: (error: string) => void;
}

export interface UseAsyncOperationResult<TData, TParams = void> {
  /** Loading state */
  loading: boolean;
  /** Error message (null if no error) */
  error: string | null;
  /** Execute the async operation */
  execute: (params: TParams) => Promise<TData | null>;
  /** Clear error state */
  clearError: () => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for async operations (submit, delete, update, etc.) with loading and error states
 *
 * @example
 * ```tsx
 * const { loading, error, execute } = useAsyncOperation({
 *   operationFn: (data) => createExpense(token, data),
 *   onSuccess: () => {
 *     navigation.goBack();
 *   },
 * });
 *
 * await execute(expenseData);
 * ```
 */
export function useAsyncOperation<TData, TParams = void>({
  operationFn,
  onSuccess,
  onError,
}: UseAsyncOperationOptions<TData, TParams>): UseAsyncOperationResult<
  TData,
  TParams
> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params: TParams): Promise<TData | null> => {
      try {
        setLoading(true);
        setError(null);

        const result = await operationFn(params);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [operationFn, onSuccess, onError],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    clearError,
    reset,
  };
}
