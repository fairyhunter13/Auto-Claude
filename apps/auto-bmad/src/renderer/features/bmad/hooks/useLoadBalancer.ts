/**
 * useLoadBalancer Hook
 * 
 * Connects to the OpenCode load balancer in the main process.
 * Provides profile stats, configuration, and control methods.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  OpenCodeProfile,
  LoadBalancingStrategy,
  ProfileStats,
  LoadBalancerConfig,
} from '../components/LoadBalancerSettings';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UseLoadBalancerOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseLoadBalancerReturn {
  config: LoadBalancerConfig;
  profiles: ProfileStats[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  updateConfig: (updates: Partial<LoadBalancerConfig>) => Promise<void>;
  clearRateLimit: (profile: OpenCodeProfile) => Promise<void>;
  refresh: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LoadBalancerConfig = {
  enabled: false,
  strategy: 'least-loaded',
  maxConcurrentPerProfile: 2,
  rateLimitCooldown: 60000,
  skipRateLimited: true,
  enabledProfiles: ['personal', 'work', 'default'],
};

const DEFAULT_PROFILES: ProfileStats[] = [
  {
    id: 'personal',
    name: 'Personal Account',
    available: false,
    currentLoad: 0,
    rateLimitedUntil: null,
    lastUsed: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'work',
    name: 'Work Account',
    available: false,
    currentLoad: 0,
    rateLimitedUntil: null,
    lastUsed: 0,
    successCount: 0,
    failureCount: 0,
  },
  {
    id: 'default',
    name: 'Default Account',
    available: false,
    currentLoad: 0,
    rateLimitedUntil: null,
    lastUsed: 0,
    successCount: 0,
    failureCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useLoadBalancer({
  autoRefresh = true,
  refreshInterval = 5000,
}: UseLoadBalancerOptions = {}): UseLoadBalancerReturn {
  const [config, setConfig] = useState<LoadBalancerConfig>(DEFAULT_CONFIG);
  const [profiles, setProfiles] = useState<ProfileStats[]>(DEFAULT_PROFILES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch current state from main process
  const fetchState = useCallback(async () => {
    try {
      // @ts-expect-error - window.api is injected by preload
      const result = await window.api?.bmad?.getLoadBalancerState?.();
      
      if (result?.success && result.data) {
        setConfig(result.data.config);
        setProfiles(result.data.profiles);
        setIsInitialized(result.data.initialized);
        setError(null);
      } else if (result?.error) {
        setError(result.error.message);
      } else {
        // API not available, use defaults
        console.log('[useLoadBalancer] API not available, using defaults');
      }
    } catch (err) {
      console.error('[useLoadBalancer] Error fetching state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch load balancer state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Subscribe to load balancer events
  useEffect(() => {
    // @ts-expect-error - window.api is injected by preload
    const unsubRateLimit = window.api?.bmad?.onRateLimited?.((event: { profile: OpenCodeProfile; cooldownUntil: number }) => {
      setProfiles(prev => prev.map(p => 
        p.id === event.profile 
          ? { ...p, rateLimitedUntil: event.cooldownUntil }
          : p
      ));
    });

    // @ts-expect-error - window.api is injected by preload
    const unsubExecution = window.api?.bmad?.onExecutionCompleted?.((event: { profile: OpenCodeProfile; exitCode: number }) => {
      setProfiles(prev => prev.map(p => {
        if (p.id !== event.profile) return p;
        return {
          ...p,
          currentLoad: Math.max(0, p.currentLoad - 1),
          successCount: event.exitCode === 0 ? p.successCount + 1 : p.successCount,
          failureCount: event.exitCode !== 0 ? p.failureCount + 1 : p.failureCount,
        };
      }));
    });

    return () => {
      unsubRateLimit?.();
      unsubExecution?.();
    };
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !config.enabled) return;

    const interval = setInterval(fetchState, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, config.enabled, refreshInterval, fetchState]);

  // Update configuration
  const updateConfig = useCallback(async (updates: Partial<LoadBalancerConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    try {
      // @ts-expect-error - window.api is injected by preload
      const result = await window.api?.bmad?.updateLoadBalancerConfig?.(newConfig);
      
      if (result?.error) {
        setError(result.error.message);
        // Revert on error
        setConfig(config);
      }
    } catch (err) {
      console.error('[useLoadBalancer] Error updating config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      setConfig(config);
    }
  }, [config]);

  // Clear rate limit
  const clearRateLimit = useCallback(async (profile: OpenCodeProfile) => {
    // Optimistic update
    setProfiles(prev => prev.map(p => 
      p.id === profile ? { ...p, rateLimitedUntil: null } : p
    ));

    try {
      // @ts-expect-error - window.api is injected by preload
      await window.api?.bmad?.clearRateLimit?.(profile);
    } catch (err) {
      console.error('[useLoadBalancer] Error clearing rate limit:', err);
      // Refresh to get actual state
      await fetchState();
    }
  }, [fetchState]);

  return {
    config,
    profiles,
    isLoading,
    error,
    isInitialized,
    updateConfig,
    clearRateLimit,
    refresh: fetchState,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Hook for Persistence
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'bmad-load-balancer-config';

export function useLoadBalancerStorage(): {
  savedConfig: LoadBalancerConfig | null;
  saveConfig: (config: LoadBalancerConfig) => void;
  clearConfig: () => void;
} {
  const [savedConfig, setSavedConfig] = useState<LoadBalancerConfig | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const saveConfig = useCallback((config: LoadBalancerConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSavedConfig(config);
    } catch (err) {
      console.error('[useLoadBalancerStorage] Error saving config:', err);
    }
  }, []);

  const clearConfig = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedConfig(null);
    } catch (err) {
      console.error('[useLoadBalancerStorage] Error clearing config:', err);
    }
  }, []);

  return { savedConfig, saveConfig, clearConfig };
}
