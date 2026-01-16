/**
 * OpenCode Load Balancer
 * 
 * Distributes workflow execution across multiple OpenCode profiles
 * (personal, work, default) for better rate limit management and
 * parallel execution capabilities.
 */

import { spawn, type ChildProcess, execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OpenCodeProfile = 'personal' | 'work' | 'default' | string;

export interface ProfileConfig {
  id: string;
  name: string;
  alias: string;
  shortAlias: string;
  configHome: string;
  dataHome: string;
  available: boolean;
  currentLoad: number;
  rateLimitedUntil: number | null;
  lastUsed: number;
  successCount: number;
  failureCount: number;
}

export interface CustomProfileDefinition {
  id: string;
  configPath: string;
  name: string;
}

export interface LoadBalancerConfig {
  /** Strategy for selecting profiles */
  strategy: 'round-robin' | 'least-loaded' | 'least-recently-used' | 'random';
  /** Maximum concurrent tasks per profile */
  maxConcurrentPerProfile: number;
  /** Rate limit cooldown in milliseconds */
  rateLimitCooldown: number;
  /** Whether to skip rate-limited profiles */
  skipRateLimited: boolean;
  /** Profiles to use (empty = all available) */
  enabledProfiles: OpenCodeProfile[];
  /** Whether load balancing is enabled */
  enabled: boolean;
  /** Custom profile definitions (for testing or advanced config) */
  profiles?: CustomProfileDefinition[];
}

export interface LoadBalancerState {
  profiles: ProfileConfig[];
  config: LoadBalancerConfig;
}

export interface ExecutionOptions {
  /** Preferred profile (optional) */
  preferredProfile?: OpenCodeProfile;
  /** Force specific profile (ignores load balancing) */
  forceProfile?: OpenCodeProfile;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Working directory */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Callback for stdout */
  onStdout?: (data: string) => void;
  /** Callback for stderr */
  onStderr?: (data: string) => void;
}

export interface ExecutionResult {
  profile: OpenCodeProfile;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  rateLimited: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LoadBalancerConfig = {
  strategy: 'least-loaded',
  maxConcurrentPerProfile: 2,
  rateLimitCooldown: 60000, // 1 minute
  skipRateLimited: true,
  enabledProfiles: ['personal', 'work', 'default'],
  enabled: true,
};

const PROFILE_DEFINITIONS: Record<OpenCodeProfile, Omit<ProfileConfig, 'available' | 'currentLoad' | 'rateLimitedUntil' | 'lastUsed' | 'successCount' | 'failureCount'>> = {
  personal: {
    id: 'personal',
    name: 'Personal Account',
    alias: 'opencode-personal',
    shortAlias: 'ocp',
    configHome: join(process.env.HOME || '', '.config/opencode-personal'),
    dataHome: join(process.env.HOME || '', '.local/share/opencode-personal'),
  },
  work: {
    id: 'work',
    name: 'Work Account',
    alias: 'opencode-work',
    shortAlias: 'ocw',
    configHome: join(process.env.HOME || '', '.config/opencode-work'),
    dataHome: join(process.env.HOME || '', '.local/share/opencode-work'),
  },
  default: {
    id: 'default',
    name: 'Default Account',
    alias: 'opencode-default',
    shortAlias: 'ocd',
    configHome: join(process.env.HOME || '', '.config/opencode'),
    dataHome: join(process.env.HOME || '', '.local/share/opencode'),
  },
};

// Rate limit detection patterns
const RATE_LIMIT_PATTERNS = [
  /rate.?limit/i,
  /too.?many.?requests/i,
  /429/,
  /throttl/i,
  /quota.?exceeded/i,
  /capacity/i,
  /overloaded/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// OpenCode Load Balancer Class
// ─────────────────────────────────────────────────────────────────────────────

export class OpenCodeLoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private profiles: Map<OpenCodeProfile, ProfileConfig> = new Map();
  private activeProcesses: Map<string, { process: ChildProcess; profile: OpenCodeProfile }> = new Map();
  private roundRobinIndex: number = 0;
  private opencodePath: string | null = null;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize custom profiles if provided
    if (config.profiles && config.profiles.length > 0) {
      for (const customProfile of config.profiles) {
        this.profiles.set(customProfile.id as OpenCodeProfile, {
          id: customProfile.id,
          name: customProfile.name,
          alias: customProfile.id,
          shortAlias: customProfile.id.substring(0, 3),
          configHome: customProfile.configPath,
          dataHome: customProfile.configPath.replace('config', 'data'),
          available: true,
          currentLoad: 0,
          rateLimitedUntil: null,
          lastUsed: 0,
          successCount: 0,
          failureCount: 0,
        });
      }
      // Update enabled profiles to include custom ones
      this.config.enabledProfiles = config.profiles.map(p => p.id as OpenCodeProfile);
    } else {
      // Initialize default profiles (availability will be checked during initialize())
      for (const [id, def] of Object.entries(PROFILE_DEFINITIONS)) {
        this.profiles.set(id as OpenCodeProfile, {
          ...def,
          available: false, // Will be updated during initialize()
          currentLoad: 0,
          rateLimitedUntil: null,
          lastUsed: 0,
          successCount: 0,
          failureCount: 0,
        });
      }
    }
  }

  /**
   * Initialize the load balancer
   */
  async initialize(): Promise<void> {
    // Find opencode binary
    this.opencodePath = await this.findOpenCode();
    if (!this.opencodePath) {
      throw new Error('OpenCode CLI not found in PATH');
    }

    // Initialize profile states
    for (const [id, def] of Object.entries(PROFILE_DEFINITIONS)) {
      const profileId = id as OpenCodeProfile;
      
      // Check if profile is configured
      const available = this.isProfileConfigured(profileId);
      
      this.profiles.set(profileId, {
        ...def,
        available,
        currentLoad: 0,
        rateLimitedUntil: null,
        lastUsed: 0,
        successCount: 0,
        failureCount: 0,
      });
    }

    const availableProfiles = Array.from(this.profiles.values())
      .filter(p => p.available)
      .map(p => p.id);
    
    console.log(`[LoadBalancer] Initialized with profiles: ${availableProfiles.join(', ')}`);
    this.emit('initialized', { profiles: availableProfiles });
  }

  /**
   * Find the opencode binary
   */
  private async findOpenCode(): Promise<string | null> {
    const candidates = [
      'opencode',
      '/usr/local/bin/opencode',
      '/usr/bin/opencode',
      join(process.env.HOME || '', '.local/bin/opencode'),
      join(process.env.HOME || '', 'go/bin/opencode'),
    ];

    for (const candidate of candidates) {
      try {
        execSync(`${candidate} --version`, { stdio: 'pipe', timeout: 5000 });
        return candidate;
      } catch {
        // Continue to next
      }
    }
    return null;
  }

  /**
   * Check if a profile is configured
   */
  private isProfileConfigured(profile: OpenCodeProfile): boolean {
    const def = PROFILE_DEFINITIONS[profile];
    // Check if config directory exists
    return existsSync(def.configHome);
  }

  /**
   * Get available profiles
   */
  getAvailableProfiles(): ProfileConfig[] {
    return Array.from(this.profiles.values()).filter(p => p.available);
  }

  /**
   * Get the current state of the load balancer
   */
  getState(): LoadBalancerState {
    return {
      profiles: Array.from(this.profiles.values()),
      config: { ...this.config },
    };
  }

  /**
   * Get the next available profile (alias for selectProfile)
   */
  getNextProfile(options: ExecutionOptions = {}): OpenCodeProfile | null {
    return this.selectProfile(options);
  }

  /**
   * Record an execution result for a profile
   */
  recordExecution(profileId: string, success: boolean): void {
    const profile = this.profiles.get(profileId as OpenCodeProfile);
    if (profile) {
      if (success) {
        profile.successCount++;
      } else {
        profile.failureCount++;
      }
      profile.lastUsed = Date.now();
      this.emit('execution-recorded', { profileId, success });
    }
  }

  /**
   * Get profile stats - optionally for a specific profile
   */
  getProfileStats(profileId?: string): ProfileConfig | Record<OpenCodeProfile, ProfileConfig> | undefined {
    if (profileId) {
      return this.profiles.get(profileId as OpenCodeProfile);
    }
    const stats: Record<string, ProfileConfig> = {};
    for (const [id, config] of this.profiles) {
      stats[id] = { ...config };
    }
    return stats as Record<OpenCodeProfile, ProfileConfig>;
  }

  /**
   * Select the best profile based on strategy
   */
  selectProfile(options: ExecutionOptions = {}): OpenCodeProfile | null {
    // Force specific profile
    if (options.forceProfile) {
      const profile = this.profiles.get(options.forceProfile);
      if (profile?.available) {
        return options.forceProfile;
      }
      return null;
    }

    // Get available profiles
    let candidates = this.getAvailableProfiles()
      .filter(p => this.config.enabledProfiles.includes(p.id));

    // Filter out rate-limited profiles
    if (this.config.skipRateLimited) {
      const now = Date.now();
      candidates = candidates.filter(p => 
        !p.rateLimitedUntil || p.rateLimitedUntil < now
      );
    }

    // Filter by max concurrent
    candidates = candidates.filter(p => 
      p.currentLoad < this.config.maxConcurrentPerProfile
    );

    // Prefer requested profile if available
    if (options.preferredProfile) {
      const preferred = candidates.find(p => p.id === options.preferredProfile);
      if (preferred) {
        return preferred.id;
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Apply selection strategy
    switch (this.config.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(candidates);
      case 'least-loaded':
        return this.selectLeastLoaded(candidates);
      case 'least-recently-used':
        return this.selectLeastRecentlyUsed(candidates);
      case 'random':
        return this.selectRandom(candidates);
      default:
        return candidates[0].id;
    }
  }

  private selectRoundRobin(candidates: ProfileConfig[]): OpenCodeProfile {
    const index = this.roundRobinIndex % candidates.length;
    this.roundRobinIndex++;
    return candidates[index].id;
  }

  private selectLeastLoaded(candidates: ProfileConfig[]): OpenCodeProfile {
    candidates.sort((a, b) => a.currentLoad - b.currentLoad);
    return candidates[0].id;
  }

  private selectLeastRecentlyUsed(candidates: ProfileConfig[]): OpenCodeProfile {
    candidates.sort((a, b) => a.lastUsed - b.lastUsed);
    return candidates[0].id;
  }

  private selectRandom(candidates: ProfileConfig[]): OpenCodeProfile {
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index].id;
  }

  /**
   * Execute a command with the selected profile
   */
  async execute(
    args: string[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const profile = this.selectProfile(options);
    
    if (!profile) {
      throw new Error('No available profiles for execution');
    }

    const profileConfig = this.profiles.get(profile)!;
    const startTime = Date.now();
    
    // Update load
    profileConfig.currentLoad++;
    profileConfig.lastUsed = startTime;
    this.emit('execution-started', { profile, args });

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      
      // Build environment for profile
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        ...options.env,
        OPENCODE_DISABLE_AUTOUPDATE: 'true',
        XDG_CONFIG_HOME: profileConfig.configHome,
        XDG_DATA_HOME: profileConfig.dataHome,
      };

      const proc = spawn(this.opencodePath!, args, {
        cwd: options.cwd,
        env,
        stdio: 'pipe',
      });

      const processId = `${profile}-${Date.now()}`;
      this.activeProcesses.set(processId, { process: proc, profile });

      proc.stdout?.on('data', (data) => {
        const str = data.toString();
        stdout += str;
        options.onStdout?.(str);
      });

      proc.stderr?.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        options.onStderr?.(str);
      });

      // Timeout handling
      let timeoutHandle: NodeJS.Timeout | null = null;
      if (options.timeout) {
        timeoutHandle = setTimeout(() => {
          proc.kill();
        }, options.timeout);
      }

      proc.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.activeProcesses.delete(processId);
        
        const duration = Date.now() - startTime;
        const rateLimited = this.detectRateLimit(stdout + stderr);
        
        // Update profile stats
        profileConfig.currentLoad = Math.max(0, profileConfig.currentLoad - 1);
        
        if (rateLimited) {
          profileConfig.rateLimitedUntil = Date.now() + this.config.rateLimitCooldown;
          profileConfig.failureCount++;
          this.emit('rate-limited', { profile, cooldownUntil: profileConfig.rateLimitedUntil });
        } else if (code === 0) {
          profileConfig.successCount++;
        } else {
          profileConfig.failureCount++;
        }

        const result: ExecutionResult = {
          profile,
          exitCode: code ?? -1,
          stdout,
          stderr,
          duration,
          rateLimited,
        };

        this.emit('execution-completed', result);
        resolve(result);
      });

      proc.on('error', (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.activeProcesses.delete(processId);
        
        profileConfig.currentLoad = Math.max(0, profileConfig.currentLoad - 1);
        profileConfig.failureCount++;

        resolve({
          profile,
          exitCode: -1,
          stdout,
          stderr: stderr + '\n' + err.message,
          duration: Date.now() - startTime,
          rateLimited: false,
        });
      });
    });
  }

  /**
   * Execute with automatic retry on rate limit
   */
  async executeWithRetry(
    args: string[],
    options: ExecutionOptions = {},
    maxRetries: number = 3
  ): Promise<ExecutionResult> {
    let lastResult: ExecutionResult | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.execute(args, options);
      lastResult = result;

      if (!result.rateLimited && result.exitCode === 0) {
        return result;
      }

      if (result.rateLimited && attempt < maxRetries - 1) {
        console.log(`[LoadBalancer] Rate limited on ${result.profile}, retrying with different profile...`);
        // Will automatically select a different profile on next attempt
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return lastResult!;
  }

  /**
   * Detect rate limiting from output
   */
  private detectRateLimit(output: string): boolean {
    return RATE_LIMIT_PATTERNS.some(pattern => pattern.test(output));
  }

  /**
   * Mark a profile as rate limited
   */
  markRateLimited(profile: OpenCodeProfile, durationMs: number = this.config.rateLimitCooldown): void {
    const profileConfig = this.profiles.get(profile);
    if (profileConfig) {
      profileConfig.rateLimitedUntil = Date.now() + durationMs;
      this.emit('rate-limited', { profile, cooldownUntil: profileConfig.rateLimitedUntil });
    }
  }

  /**
   * Clear rate limit for a profile
   */
  clearRateLimit(profile: OpenCodeProfile): void {
    const profileConfig = this.profiles.get(profile);
    if (profileConfig) {
      profileConfig.rateLimitedUntil = null;
      this.emit('rate-limit-cleared', { profile });
    }
  }

  /**
   * Get current load across all profiles
   */
  getTotalLoad(): number {
    return Array.from(this.profiles.values())
      .reduce((sum, p) => sum + p.currentLoad, 0);
  }

  /**
   * Cancel all active processes
   */
  cancelAll(): void {
    for (const [id, { process, profile }] of this.activeProcesses) {
      process.kill();
      this.emit('execution-cancelled', { profile, processId: id });
    }
    this.activeProcesses.clear();
  }

  /**
   * Dispose the load balancer
   */
  dispose(): void {
    this.cancelAll();
    this.removeAllListeners();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let loadBalancerInstance: OpenCodeLoadBalancer | null = null;

export function getLoadBalancer(config?: Partial<LoadBalancerConfig>): OpenCodeLoadBalancer {
  if (!loadBalancerInstance) {
    loadBalancerInstance = new OpenCodeLoadBalancer(config);
  }
  return loadBalancerInstance;
}

export function disposeLoadBalancer(): void {
  if (loadBalancerInstance) {
    loadBalancerInstance.dispose();
    loadBalancerInstance = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute a BMAD workflow with load balancing
 */
export async function executeWorkflowWithLoadBalancing(
  command: string,
  agent: string,
  options: ExecutionOptions & { yoloMode?: boolean } = {}
): Promise<ExecutionResult> {
  const lb = getLoadBalancer();
  await lb.initialize();

  // OpenCode CLI syntax: opencode run --command "/slash-command" [flags]
  const args: string[] = ['run'];
  
  // The workflow command must be passed via --command flag for slash commands
  args.push('--command', command);
  
  if (agent) {
    args.push('--agent', agent);
  }
  
  if (options.yoloMode) {
    args.push('--yolo');
  }

  return lb.executeWithRetry(args, options);
}
