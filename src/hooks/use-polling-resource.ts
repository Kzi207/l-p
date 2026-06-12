"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/services/api-client";

type UsePollingResourceOptions<T> = {
  enabled?: boolean;
  initialData: T;
  intervalMs?: number;
};

type RefreshOptions = {
  background?: boolean;
};

export function usePollingResource<T>(
  url: string,
  {
    enabled = true,
    initialData,
    intervalMs = 0,
  }: UsePollingResourceOptions<T>,
) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async ({ background = false }: RefreshOptions = {}) => {
    if (!enabled) {
      return;
    }

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextData = await apiClient<T>(url);
      setData(nextData);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError : new Error("Request failed"),
      );
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [enabled, url]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      void refresh({ background: true });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [enabled, intervalMs, refresh]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    refresh,
    reload: refresh,
  };
}
