/**
 * Load Balancer Settings Section
 * 
 * Wrapper component that connects LoadBalancerSettings to the IPC API.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LoadBalancerSettings, 
  LoadBalancerStatus,
  type LoadBalancerConfig, 
  type ProfileStats, 
  type OpenCodeProfile,
  createMockLoadBalancerData 
} from '../../features/bmad/components/LoadBalancerSettings';
import { SettingsSection } from './SettingsSection';
import { Card, CardContent } from '../ui/card';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LoadBalancerSettingsSection() {
  const { t } = useTranslation('settings');
  const [config, setConfig] = useState<LoadBalancerConfig | null>(null);
  const [profiles, setProfiles] = useState<ProfileStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApiAvailable, setIsApiAvailable] = useState(false);

  // Check if the load balancer API is available
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        // Check if the bmad API has load balancer methods
        if (window.electronAPI?.bmad?.getLoadBalancerState) {
          setIsApiAvailable(true);
          await loadState();
        } else {
          // API not available, use mock data for preview
          setIsApiAvailable(false);
          const mock = createMockLoadBalancerData();
          setConfig(mock.config);
          setProfiles(mock.profiles);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[LoadBalancerSettings] Failed to check API availability:', err);
        setError('Failed to load load balancer state');
        setIsLoading(false);
      }
    };
    
    checkApiAvailability();
  }, []);

  const loadState = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const state = await window.electronAPI.bmad.getLoadBalancerState();
      
      if (state.success && state.data) {
        setConfig(state.data.config);
        setProfiles(state.data.profiles);
      } else {
        // Fallback to mock data
        const mock = createMockLoadBalancerData();
        setConfig(mock.config);
        setProfiles(mock.profiles);
      }
    } catch (err) {
      console.error('[LoadBalancerSettings] Failed to load state:', err);
      // Use mock data on error
      const mock = createMockLoadBalancerData();
      setConfig(mock.config);
      setProfiles(mock.profiles);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = useCallback(async (changes: Partial<LoadBalancerConfig>) => {
    if (!config) return;
    
    const newConfig = { ...config, ...changes };
    setConfig(newConfig);
    
    // If API is available, sync to backend
    if (isApiAvailable) {
      try {
        if (changes.enabled !== undefined) {
          if (changes.enabled) {
            await window.electronAPI.bmad.enableLoadBalancing();
          } else {
            await window.electronAPI.bmad.disableLoadBalancing();
          }
        }
        // TODO: Add more granular config updates via IPC
      } catch (err) {
        console.error('[LoadBalancerSettings] Failed to update config:', err);
      }
    }
  }, [config, isApiAvailable]);

  const handleRefresh = useCallback(async () => {
    if (isApiAvailable) {
      await loadState();
    }
  }, [isApiAvailable]);

  const handleClearRateLimit = useCallback(async (profile: OpenCodeProfile) => {
    if (isApiAvailable) {
      try {
        await window.electronAPI.bmad.clearRateLimit(profile);
        await loadState();
      } catch (err) {
        console.error('[LoadBalancerSettings] Failed to clear rate limit:', err);
      }
    } else {
      // For mock mode, just update local state
      setProfiles(prev => prev.map(p => 
        p.id === profile 
          ? { ...p, rateLimitedUntil: null }
          : p
      ));
    }
  }, [isApiAvailable]);

  if (isLoading) {
    return (
      <SettingsSection
        title={t('sections.loadBalancing.title', 'Load Balancing')}
        description={t('sections.loadBalancing.description', 'Distribute workflows across OpenCode profiles')}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsSection>
    );
  }

  if (error) {
    return (
      <SettingsSection
        title={t('sections.loadBalancing.title', 'Load Balancing')}
        description={t('sections.loadBalancing.description', 'Distribute workflows across OpenCode profiles')}
      >
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </SettingsSection>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <SettingsSection
      title={t('sections.loadBalancing.title', 'Load Balancing')}
      description={t('sections.loadBalancing.description', 'Distribute workflows across OpenCode profiles')}
    >
      {!isApiAvailable && (
        <Card className="mb-4 border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <Info className="h-4 w-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">
              {t('sections.loadBalancing.previewMode', 'Preview mode - Load balancer API not yet initialized. Start a BMAD workflow to enable.')}
            </p>
          </CardContent>
        </Card>
      )}
      
      <LoadBalancerSettings
        config={config}
        profiles={profiles}
        onConfigChange={handleConfigChange}
        onRefresh={handleRefresh}
        onClearRateLimit={handleClearRateLimit}
      />
    </SettingsSection>
  );
}

export { LoadBalancerStatus };
