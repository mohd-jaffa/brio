"use client";

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";

import { errorMessage } from "@/lib/errors/errorMessage";

/**
 * A write to the API, with the three pieces of state every form around one was
 * keeping by hand: whether it is in flight, what went wrong, and what to
 * refresh once it worked. Each sheet had its own try/catch/finally around
 * exactly this, and each had picked a slightly different fallback message.
 *
 * `revalidate` names the routes whose data this change makes stale
 * (src/lib/query/keys.ts); they are refreshed on success.
 */
export function useApiMutation<TInput, TResult>(
  run: (input: TInput) => Promise<TResult>,
  options: {
    revalidate?: readonly string[];
    onSuccess?: (result: TResult) => void;
  } = {},
) {
  const { mutate } = useSWRConfig();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { revalidate, onSuccess } = options;

  const submit = useCallback(
    async (input: TInput): Promise<TResult | undefined> => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await run(input);
        await Promise.all((revalidate ?? []).map((key) => mutate(key)));
        onSuccess?.(result);
        return result;
      } catch (failure) {
        setError(errorMessage(failure, "SAVE_FAILED"));
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [run, revalidate, onSuccess, mutate],
  );

  return { submit, submitting, error, reset: () => setError(null) };
}
