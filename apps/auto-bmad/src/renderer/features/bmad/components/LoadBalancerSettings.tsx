/**
 * Load Balancer Settings Component
 * 
 * Displays and manages OpenCode load balancer configuration.
 * Shows profile status, statistics, and allows strategy selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Progress } from '@/shared/ui/progress';
import { Separator } from '@/shared/ui/separator';
import {
  RefreshCw,
  Server,
  User,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  Settings2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OpenCodeProfile = 'personal' | 'work' | 'default';
export type LoadBalancingStrategy = 'round-robin' | 'least-loaded' | 'least-recently-used' | 'random';

export interface ProfileStats {
  id: OpenCodeProfile;
  name: string;
  available: boolean;
  currentLoad: number;
  rateLimitedUntil: number | null;
  lastUsed: number;
  successCount: number;
  failureCount: number;
}

export interface LoadBalancerConfig {
  enabled: boolean;
  strategy: LoadBalancingStrategy;
  maxConcurrentPerProfile: number;
  rateLimitCooldown: number;
  skipRateLimited: boolean;
  enabledProfiles: OpenCodeProfile[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_ICONS: Record<OpenCodeProfile, typeof User> = {
  personal: User,
  work: Briefcase,
  default: Server,
};

const PROFILE_COLORS: Record<OpenCodeProfile, string> = {
  personal: 'text-blue-500',
  work: 'text-purple-500',
  default: 'text-green-500',
};

const STRATEGY_DESCRIPTIONS: Record<LoadBalancingStrategy, string> = {
  'round-robin': 'Cycle through profiles sequentially',
  'least-loaded': 'Use profile with fewest active tasks',
  'least-recently-used': 'Use profile that was idle longest',
  'random': 'Randomly select an available profile',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface LoadBalancerSettingsProps {
  config: LoadBalancerConfig;
  profiles: ProfileStats[];
  onConfigChange: (config: Partial<LoadBalancerConfig>) => void;
  onRefresh?: () => void;
  onClearRateLimit?: (profile: OpenCodeProfile) => void;
  className?: string;
}

export function LoadBalancerSettings({
  config,
  profiles,
  onConfigChange,
  onRefresh,
  onClearRateLimit,
  className,
}: LoadBalancerSettingsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);

  const availableProfiles = profiles.filter(p => p.available);
  const activeProfiles = profiles.filter(p => config.enabledProfiles.includes(p.id));
  const totalLoad = profiles.reduce((sum, p) => sum + p.currentLoad, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Load Balancing</CardTitle>
                <CardDescription>
                  Distribute workflows across multiple OpenCode profiles
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => onConfigChange({ enabled })}
            />
          </div>
        </CardHeader>
        {config.enabled && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {availableProfiles.length} profiles available
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                {totalLoad} active tasks
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {config.enabled && (
        <>
          {/* Strategy Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Strategy</CardTitle>
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={config.strategy}
                onValueChange={(strategy: LoadBalancingStrategy) => 
                  onConfigChange({ strategy })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="least-loaded">
                    <div className="flex flex-col">
                      <span>Least Loaded</span>
                      <span className="text-xs text-muted-foreground">
                        {STRATEGY_DESCRIPTIONS['least-loaded']}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="round-robin">
                    <div className="flex flex-col">
                      <span>Round Robin</span>
                      <span className="text-xs text-muted-foreground">
                        {STRATEGY_DESCRIPTIONS['round-robin']}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="least-recently-used">
                    <div className="flex flex-col">
                      <span>Least Recently Used</span>
                      <span className="text-xs text-muted-foreground">
                        {STRATEGY_DESCRIPTIONS['least-recently-used']}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="random">
                    <div className="flex flex-col">
                      <span>Random</span>
                      <span className="text-xs text-muted-foreground">
                        {STRATEGY_DESCRIPTIONS['random']}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="skip-rate-limited" className="text-sm">
                  Skip rate-limited profiles
                </Label>
                <Switch
                  id="skip-rate-limited"
                  checked={config.skipRateLimited}
                  onCheckedChange={(skipRateLimited) => 
                    onConfigChange({ skipRateLimited })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Profile Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Profiles</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn(
                    'h-4 w-4',
                    isRefreshing && 'animate-spin'
                  )} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  enabled={config.enabledProfiles.includes(profile.id)}
                  onToggle={(enabled) => {
                    const newProfiles = enabled
                      ? [...config.enabledProfiles, profile.id]
                      : config.enabledProfiles.filter(p => p !== profile.id);
                    onConfigChange({ enabledProfiles: newProfiles });
                  }}
                  onClearRateLimit={() => onClearRateLimit?.(profile.id)}
                  maxConcurrent={config.maxConcurrentPerProfile}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Card
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileCardProps {
  profile: ProfileStats;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onClearRateLimit?: () => void;
  maxConcurrent: number;
}

function ProfileCard({
  profile,
  enabled,
  onToggle,
  onClearRateLimit,
  maxConcurrent,
}: ProfileCardProps) {
  const Icon = PROFILE_ICONS[profile.id];
  const isRateLimited = profile.rateLimitedUntil && profile.rateLimitedUntil > Date.now();
  const rateLimitTimeLeft = isRateLimited 
    ? Math.ceil((profile.rateLimitedUntil! - Date.now()) / 1000)
    : 0;
  
  const successRate = profile.successCount + profile.failureCount > 0
    ? (profile.successCount / (profile.successCount + profile.failureCount)) * 100
    : 100;

  const loadPercentage = (profile.currentLoad / maxConcurrent) * 100;

  return (
    <div className={cn(
      'rounded-lg border p-3',
      !profile.available && 'opacity-50',
      isRateLimited && 'border-yellow-500/50 bg-yellow-500/5'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            enabled ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Icon className={cn('h-4 w-4', PROFILE_COLORS[profile.id])} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{profile.name}</span>
              {!profile.available && (
                <Badge variant="outline" className="text-xs">
                  Not configured
                </Badge>
              )}
              {isRateLimited && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Rate limited ({rateLimitTimeLeft}s)
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {profile.currentLoad}/{maxConcurrent}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {profile.successCount}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                {profile.failureCount}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRateLimited && onClearRateLimit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onClearRateLimit}
            >
              Clear
            </Button>
          )}
          <Switch
            checked={enabled && profile.available}
            onCheckedChange={onToggle}
            disabled={!profile.available}
          />
        </div>
      </div>

      {enabled && profile.available && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Load</span>
            <span>{Math.round(loadPercentage)}%</span>
          </div>
          <Progress value={loadPercentage} className="h-1" />
          
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground">Success rate</span>
            <span className={cn(
              successRate >= 90 ? 'text-green-500' :
              successRate >= 70 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {Math.round(successRate)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Status
// ─────────────────────────────────────────────────────────────────────────────

interface LoadBalancerStatusProps {
  config: LoadBalancerConfig;
  profiles: ProfileStats[];
  className?: string;
}

export function LoadBalancerStatus({ config, profiles, className }: LoadBalancerStatusProps) {
  if (!config.enabled) {
    return (
      <Badge variant="outline" className={className}>
        <Zap className="h-3 w-3 mr-1" />
        LB Off
      </Badge>
    );
  }

  const activeProfiles = profiles.filter(
    p => p.available && config.enabledProfiles.includes(p.id)
  );
  const rateLimited = activeProfiles.filter(
    p => p.rateLimitedUntil && p.rateLimitedUntil > Date.now()
  ).length;
  const totalLoad = activeProfiles.reduce((sum, p) => sum + p.currentLoad, 0);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
        <Zap className="h-3 w-3 mr-1" />
        {activeProfiles.length} profiles
      </Badge>
      {totalLoad > 0 && (
        <Badge variant="secondary">
          <Activity className="h-3 w-3 mr-1" />
          {totalLoad} active
        </Badge>
      )}
      {rateLimited > 0 && (
        <Badge variant="outline" className="text-yellow-600 border-yellow-500">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {rateLimited} limited
        </Badge>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data for Testing
// ─────────────────────────────────────────────────────────────────────────────

export function createMockLoadBalancerData(): {
  config: LoadBalancerConfig;
  profiles: ProfileStats[];
} {
  return {
    config: {
      enabled: true,
      strategy: 'least-loaded',
      maxConcurrentPerProfile: 2,
      rateLimitCooldown: 60000,
      skipRateLimited: true,
      enabledProfiles: ['personal', 'work', 'default'],
    },
    profiles: [
      {
        id: 'personal',
        name: 'Personal Account',
        available: true,
        currentLoad: 1,
        rateLimitedUntil: null,
        lastUsed: Date.now() - 30000,
        successCount: 15,
        failureCount: 2,
      },
      {
        id: 'work',
        name: 'Work Account',
        available: true,
        currentLoad: 0,
        rateLimitedUntil: Date.now() + 45000, // Rate limited for 45s
        lastUsed: Date.now() - 120000,
        successCount: 8,
        failureCount: 1,
      },
      {
        id: 'default',
        name: 'Default Account',
        available: true,
        currentLoad: 2,
        rateLimitedUntil: null,
        lastUsed: Date.now() - 5000,
        successCount: 20,
        failureCount: 0,
      },
    ],
  };
}
