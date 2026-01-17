/**
 * Browser mock for window.electronAPI
 * This allows the app to run in a regular browser for UI development/testing
 *
 * This module aggregates all mock implementations from separate modules
 * for better code organization and maintainability.
 */

import type { ElectronAPI } from '../../shared/types';
import {
  projectMock,
  taskMock,
  workspaceMock,
  terminalMock,
  claudeProfileMock,
  contextMock,
  integrationMock,
  changelogMock,
  insightsMock,
  infrastructureMock,
  settingsMock
} from './mocks';

// Check if we're in a browser (not Electron)
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

/**
 * Create mock electronAPI for browser
 * Aggregates all mock implementations from separate modules
 */
const browserMockAPI: ElectronAPI = {
  // Project Operations
  ...projectMock,

  // Task Operations
  ...taskMock,

  // Workspace Management
  ...workspaceMock,

  // Terminal Operations
  ...terminalMock,

  // Claude Profile Management
  ...claudeProfileMock,

  // Settings
  ...settingsMock,

  // Roadmap Operations
  getRoadmap: async () => ({
    success: true,
    data: null
  }),

  getRoadmapStatus: async () => ({
    success: true,
    data: { isRunning: false }
  }),

  saveRoadmap: async () => ({
    success: true
  }),

  generateRoadmap: (_projectId: string, _enableCompetitorAnalysis?: boolean, _refreshCompetitorAnalysis?: boolean) => {
    console.warn('[Browser Mock] generateRoadmap called');
  },

  refreshRoadmap: (_projectId: string, _enableCompetitorAnalysis?: boolean, _refreshCompetitorAnalysis?: boolean) => {
    console.warn('[Browser Mock] refreshRoadmap called');
  },

  updateFeatureStatus: async () => ({ success: true }),

  convertFeatureToSpec: async (projectId: string, _featureId: string) => ({
    success: true,
    data: {
      id: `task-${Date.now()}`,
      specId: '',
      projectId,
      title: 'Converted Feature',
      description: 'Feature converted from roadmap',
      status: 'backlog' as const,
      subtasks: [],
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }),

  stopRoadmap: async () => ({ success: true }),

  // Roadmap Event Listeners
  onRoadmapProgress: () => () => {},
  onRoadmapComplete: () => () => {},
  onRoadmapError: () => () => {},
  onRoadmapStopped: () => () => {},
  // Context Operations
  ...contextMock,

  // Environment Configuration & Integration Operations
  ...integrationMock,

  // Changelog & Release Operations
  ...changelogMock,

  // Insights Operations
  ...insightsMock,

  // Infrastructure & Docker Operations
  ...infrastructureMock,

  // API Profile Management (custom Anthropic-compatible endpoints)
  getAPIProfiles: async () => ({
    success: true,
    data: {
      profiles: [],
      activeProfileId: null,
      version: 1
    }
  }),

  saveAPIProfile: async (profile) => ({
    success: true,
    data: {
      id: `mock-profile-${Date.now()}`,
      ...profile,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }),

  updateAPIProfile: async (profile) => ({
    success: true,
    data: {
      ...profile,
      updatedAt: Date.now()
    }
  }),

  deleteAPIProfile: async (_profileId: string) => ({
    success: true
  }),

  setActiveAPIProfile: async (_profileId: string | null) => ({
    success: true
  }),

  testConnection: async (_baseUrl: string, _apiKey: string, _signal?: AbortSignal) => ({
    success: true,
    data: {
      success: true,
      message: 'Connection successful (mock)'
    }
  }),

  discoverModels: async (_baseUrl: string, _apiKey: string, _signal?: AbortSignal) => ({
    success: true,
    data: {
      models: []
    }
  }),

  // GitHub API
  github: {
    getGitHubRepositories: async () => ({ success: true, data: [] }),
    getGitHubIssues: async () => ({ success: true, data: { issues: [], hasMore: false } }),
    getGitHubIssue: async () => ({ success: true, data: null as any }),
    getIssueComments: async () => ({ success: true, data: [] }),
    checkGitHubConnection: async () => ({ success: true, data: { connected: false, repoFullName: undefined, error: undefined } }),
    investigateGitHubIssue: () => {},
    importGitHubIssues: async () => ({ success: true, data: { success: true, imported: 0, failed: 0, issues: [] } }),
    createGitHubRelease: async () => ({ success: true, data: { url: '' } }),
    suggestReleaseVersion: async () => ({ success: true, data: { suggestedVersion: '1.0.0', currentVersion: '0.0.0', bumpType: 'minor' as const, commitCount: 0, reason: 'Initial' } }),
    checkGitHubCli: async () => ({ success: true, data: { installed: false } }),
    checkGitHubAuth: async () => ({ success: true, data: { authenticated: false } }),
    startGitHubAuth: async () => ({ success: true, data: { success: false } }),
    getGitHubToken: async () => ({ success: true, data: { token: '' } }),
    getGitHubUser: async () => ({ success: true, data: { username: '' } }),
    listGitHubUserRepos: async () => ({ success: true, data: { repos: [] } }),
    detectGitHubRepo: async () => ({ success: true, data: '' }),
    getGitHubBranches: async () => ({ success: true, data: [] }),
    createGitHubRepo: async () => ({ success: true, data: { fullName: '', url: '' } }),
    addGitRemote: async () => ({ success: true, data: { remoteUrl: '' } }),
    listGitHubOrgs: async () => ({ success: true, data: { orgs: [] } }),
    onGitHubAuthDeviceCode: () => () => {},
    onGitHubInvestigationProgress: () => () => {},
    onGitHubInvestigationComplete: () => () => {},
    onGitHubInvestigationError: () => () => {},
    getAutoFixConfig: async () => null,
    saveAutoFixConfig: async () => true,
    getAutoFixQueue: async () => [],
    checkAutoFixLabels: async () => [],
    checkNewIssues: async () => [],
    startAutoFix: () => {},
    onAutoFixProgress: () => () => {},
    onAutoFixComplete: () => () => {},
    onAutoFixError: () => () => {},
    listPRs: async () => [],
    getPR: async () => null,
    runPRReview: () => {},
    cancelPRReview: async () => true,
    postPRReview: async () => true,
    postPRComment: async () => true,
    mergePR: async () => true,
    assignPR: async () => true,
    getPRReview: async () => null,
    getPRReviewsBatch: async () => ({}),
    deletePRReview: async () => true,
    checkNewCommits: async () => ({ hasNewCommits: false, newCommitCount: 0 }),
    checkMergeReadiness: async () => ({ isDraft: false, mergeable: 'UNKNOWN' as const, isBehind: false, ciStatus: 'none' as const, blockers: [] }),
    runFollowupReview: () => {},
    getPRLogs: async () => null,
    getWorkflowsAwaitingApproval: async () => ({ awaiting_approval: 0, workflow_runs: [], can_approve: false }),
    approveWorkflow: async () => true,
    onPRReviewProgress: () => () => {},
    onPRReviewComplete: () => () => {},
    onPRReviewError: () => () => {},
    batchAutoFix: () => {},
    getBatches: async () => [],
    onBatchProgress: () => () => {},
    onBatchComplete: () => () => {},
    onBatchError: () => () => {},
    // Analyze & Group Issues (proactive workflow)
    analyzeIssuesPreview: () => {},
    approveBatches: async () => ({ success: true, batches: [] }),
    onAnalyzePreviewProgress: () => () => {},
    onAnalyzePreviewComplete: () => () => {},
    onAnalyzePreviewError: () => () => {}
  },

  // OpenCode Operations
  checkOpenCodeVersion: async () => ({
    success: true,
    data: {
      installed: '0.1.0',
      latest: '0.1.0',
      isOutdated: false,
      path: '/home/user/go/bin/opencode',
      detectionResult: {
        found: true,
        version: '0.1.0',
        path: '/home/user/go/bin/opencode',
        source: 'go-install' as const,
        message: 'OpenCode CLI found'
      }
    }
  }),
  installOpenCode: async () => ({
    success: true,
    data: { command: 'go install github.com/opencode-ai/opencode@latest' }
  }),
  getOpenCodeVersions: async () => ({
    success: true,
    data: {
      versions: ['0.1.5', '0.1.4', '0.1.3', '0.1.2', '0.1.1', '0.1.0']
    }
  }),
  installOpenCodeVersion: async (version: string) => ({
    success: true,
    data: { command: `go install github.com/opencode-ai/opencode@v${version}`, version }
  }),
  getOpenCodeInstallations: async () => ({
    success: true,
    data: {
      installations: [
        {
          path: '/home/user/go/bin/opencode',
          version: '0.1.0',
          source: 'go-install' as const,
          isActive: true,
        }
      ],
      activePath: '/home/user/go/bin/opencode',
    }
  }),
  setOpenCodeActivePath: async (cliPath: string) => ({
    success: true,
    data: { path: cliPath }
  }),

  // Terminal Worktree Operations
  createTerminalWorktree: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  listTerminalWorktrees: async () => ({
    success: true,
    data: []
  }),
  removeTerminalWorktree: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),

  // MCP Server Health Check Operations
  checkMcpHealth: async (server) => ({
    success: true,
    data: {
      serverId: server.id,
      status: 'unknown' as const,
      message: 'Health check not available in browser mode',
      checkedAt: new Date().toISOString()
    }
  }),
  testMcpConnection: async (server) => ({
    success: true,
    data: {
      serverId: server.id,
      success: false,
      message: 'Connection test not available in browser mode'
    }
  }),

  // Debug Operations
  getDebugInfo: async () => ({
    systemInfo: {
      appVersion: '0.0.0-browser-mock',
      platform: 'browser',
      isPackaged: 'false'
    },
    recentErrors: [],
    logsPath: '/mock/logs',
    debugReport: '[Browser Mock] Debug report not available in browser mode'
  }),
  openLogsFolder: async () => ({ success: false, error: 'Not available in browser mode' }),
  copyDebugInfo: async () => ({ success: false, error: 'Not available in browser mode' }),
  getRecentErrors: async () => [],
  listLogFiles: async () => [],

  // File Operations
  openPath: async (_filePath: string) => ({ success: false, error: 'Not available in browser mode' }),

  // BMAD API (nested object)
  bmad: {
    // Project Management
    selectFolder: async () => ({ success: true, data: { canceled: true, path: null } }),
    validateProject: async () => ({ success: true, data: { valid: false, hasBmadDir: false, hasBmadOutput: false, hasStatusFile: false, hasConfigFile: false, errors: ['Not available in browser mode'] } }),
    createProject: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    importProject: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    getProjects: async () => ({ success: true, data: [] }),
    getProject: async () => ({ success: true, data: undefined }),
    getRecentProjects: async () => ({ success: true, data: [] }),
    openProject: async () => ({ success: true, data: undefined }),
    removeProject: async () => ({ success: true, data: true }),
    updateProject: async () => ({ success: true, data: undefined }),
    getSettings: async () => ({ success: true, data: {} }),
    updateSettings: async () => ({ success: true, data: undefined }),
    
    // Project Detection
    isProject: async () => false,
    hasConfig: async () => false,
    hasStatus: async () => false,
    
    // Configuration
    getConfig: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    getDefaultConfig: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    
    // Status Management
    initStatus: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    getStatus: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    updateStatus: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    
    // Artifact Management
    initArtifacts: async () => ({ success: true, data: [] }),
    listArtifacts: async () => ({ success: true, data: [] }),
    getArtifactsByType: async () => ({ success: true, data: [] }),
    
    // Workflow Execution
    checkOpenCode: async () => ({ success: true, data: { available: false } }),
    initWorkflowRunner: async () => ({ success: true, data: undefined }),
    getWorkflows: async () => ({ success: true, data: [] }),
    getWorkflowsForPhase: async () => ({ success: true, data: [] }),
    startWorkflow: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    cancelWorkflow: async () => ({ success: true, data: undefined }),
    isWorkflowRunning: async () => ({ success: true, data: { running: false, workflowId: null } }),
    writeToWorkflow: async () => ({ success: true, data: undefined }),
    
    // Agent Management
    getAgents: async () => ({ success: true, data: [] }),
    getAgentsByModule: async () => ({ success: true, data: [] }),
    loadAllAgents: async () => ({ success: true, data: [] }),
    loadAgent: async () => ({ success: false, error: { code: 'BROWSER_MOCK', message: 'Not available in browser mode' } }),
    
    // Cleanup
    dispose: async () => ({ success: true, data: undefined }),
    
    // Load Balancer
    initLoadBalancer: async () => ({ success: true, data: { initialized: false } }),
    getLoadBalancerState: async () => ({
      success: true,
      data: {
        initialized: false,
        profiles: [],
        config: {
          enabled: false,
          strategy: 'round-robin' as const,
          maxConcurrentPerProfile: 2,
          rateLimitCooldown: 60000,
          skipRateLimited: true,
          enabledProfiles: []
        }
      }
    }),
    getProfileStats: async () => ({
      success: true,
      data: {
        personal: { id: 'personal' as const, name: 'Personal', available: false, currentLoad: 0, rateLimitedUntil: null, lastUsed: 0, successCount: 0, failureCount: 0 },
        work: { id: 'work' as const, name: 'Work', available: false, currentLoad: 0, rateLimitedUntil: null, lastUsed: 0, successCount: 0, failureCount: 0 },
        default: { id: 'default' as const, name: 'Default', available: false, currentLoad: 0, rateLimitedUntil: null, lastUsed: 0, successCount: 0, failureCount: 0 }
      }
    }),
    clearRateLimit: async () => ({ success: true, data: undefined }),
    enableLoadBalancing: async () => ({ success: true, data: undefined }),
    disableLoadBalancing: async () => ({ success: true, data: undefined }),
    isLoadBalancingEnabled: async () => ({ success: true, data: { enabled: false } }),
    
    // Event Subscriptions
    onStatusChanged: () => () => {},
    onArtifactChanged: () => () => {},
    onWorkflowProgress: () => () => {},
    onWorkflowStdout: () => () => {},
    onWorkflowStderr: () => () => {},
    onWorkflowExit: () => () => {},
    onRateLimited: () => () => {},
    onExecutionCompleted: () => () => {},
  }
};

/**
 * Initialize browser mock if not running in Electron
 */
export function initBrowserMock(): void {
  if (!isElectron) {
    console.warn('%c[Browser Mock] Initializing mock electronAPI for browser preview', 'color: #f0ad4e; font-weight: bold;');
    (window as Window & { electronAPI: ElectronAPI }).electronAPI = browserMockAPI;
  }
}

// Auto-initialize
initBrowserMock();
