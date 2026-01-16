import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal, Loader2, Check, AlertTriangle, X, RefreshCw, Download, Info, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { OpenCodeVersionInfo } from '../../../shared/types/cli';

interface OpenCodeStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

type DetectionStatus = 'loading' | 'installed' | 'outdated' | 'not-found' | 'error';

/**
 * OpenCode CLI installation step for the onboarding wizard.
 *
 * Checks if OpenCode CLI is installed, shows version information,
 * and provides one-click installation/update functionality.
 */
export function OpenCodeStep({ onNext, onBack, onSkip }: OpenCodeStepProps) {
  const { t } = useTranslation('onboarding');
  const [status, setStatus] = useState<DetectionStatus>('loading');
  const [versionInfo, setVersionInfo] = useState<OpenCodeVersionInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Check OpenCode version on mount
  const checkVersion = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setInstallSuccess(false);

    try {
      if (!window.electronAPI?.checkOpenCodeVersion) {
        console.warn('[OpenCodeStep] Version check API not available');
        setStatus('error');
        setError('Version check API not available');
        return;
      }

      const result = await window.electronAPI.checkOpenCodeVersion();

      if (result.success && result.data) {
        setVersionInfo(result.data);

        if (!result.data.installed) {
          setStatus('not-found');
        } else if (result.data.isOutdated) {
          setStatus('outdated');
        } else {
          setStatus('installed');
        }
      } else {
        setStatus('error');
        setError(result.error || 'Failed to check version');
      }
    } catch (err) {
      console.error('Failed to check OpenCode version:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // Handle install/update button click
  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      if (!window.electronAPI?.installOpenCode) {
        setError('Install API not available');
        return;
      }

      const result = await window.electronAPI.installOpenCode();

      if (result.success) {
        setInstallSuccess(true);
        // Re-check version after a short delay to give user time to complete installation
        setTimeout(() => {
          checkVersion();
        }, 5000);
      } else {
        setError(result.error || 'Failed to start installation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsInstalling(false);
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
      case 'installed':
        return <Check className="h-6 w-6 text-green-500" />;
      case 'outdated':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'not-found':
        return <X className="h-6 w-6 text-destructive" />;
      case 'error':
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'loading':
        return t('openCode.detecting', 'Checking OpenCode installation...');
      case 'installed':
        return t('openCode.status.installed', 'Installed');
      case 'outdated':
        return t('openCode.status.outdated', 'Update Available');
      case 'not-found':
        return t('openCode.status.notFound', 'Not Installed');
      case 'error':
        return error || 'Error checking status';
    }
  };

  // Get status color class
  const getStatusColorClass = () => {
    switch (status) {
      case 'installed':
        return 'text-green-500';
      case 'outdated':
        return 'text-yellow-500';
      case 'not-found':
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Terminal className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t('openCode.title', 'OpenCode CLI')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('openCode.description', 'Install or update the OpenCode CLI to enable AI-powered BMAD workflows')}
          </p>
        </div>

        {/* Main content */}
        <div className="space-y-6">
          {/* Info card */}
          <Card className="border border-info/30 bg-info/10">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {t('openCode.info.title', 'What is OpenCode?')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('openCode.info.description', "OpenCode is the AI coding assistant CLI that powers Auto BMAD's workflows. It provides secure AI-assisted development capabilities.")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Install via Go: <code className="bg-muted px-1 py-0.5 rounded">go install github.com/opencode-ai/opencode@latest</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status card */}
          <Card className={`border ${status === 'installed' ? 'border-green-500/30 bg-green-500/5' : status === 'outdated' ? 'border-yellow-500/30 bg-yellow-500/5' : status === 'not-found' || status === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon()}
                  <div>
                    <p className={`text-sm font-medium ${getStatusColorClass()}`}>
                      {getStatusText()}
                    </p>
                    {versionInfo && status !== 'loading' && (
                      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {versionInfo.installed && (
                          <p>
                            {t('openCode.version.current', 'Current Version')}: <span className="font-mono">{versionInfo.installed}</span>
                          </p>
                        )}
                        {versionInfo.latest && versionInfo.latest !== 'unknown' && (
                          <p>
                            {t('openCode.version.latest', 'Latest Version')}: <span className="font-mono">{versionInfo.latest}</span>
                          </p>
                        )}
                        {versionInfo.path && (
                          <p className="truncate max-w-md" title={versionInfo.path}>
                            Path: <span className="font-mono">{versionInfo.path}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Refresh button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkVersion}
                  disabled={status === 'loading' || isInstalling}
                >
                  <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error message */}
          {error && status !== 'loading' && (
            <Card className="border border-destructive/30 bg-destructive/10">
              <CardContent className="p-4">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Install success message */}
          {installSuccess && (
            <Card className="border border-green-500/30 bg-green-500/10">
              <CardContent className="p-4">
                <p className="text-sm text-green-700 dark:text-green-400">
                  {t('openCode.install.success', 'Installation command sent to terminal. Please complete the installation there.')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('openCode.install.instructions', 'The installer will open in your terminal. Make sure Go is installed on your system.')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Install/Update button */}
          {(status === 'not-found' || status === 'outdated') && !installSuccess && (
            <div className="flex justify-center">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                size="lg"
                className="gap-2"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('openCode.install.inProgress', 'Installing...')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {status === 'outdated'
                      ? t('openCode.install.updating', 'Update OpenCode')
                      : t('openCode.install.button', 'Install OpenCode')
                    }
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Documentation link */}
          <div className="flex justify-center">
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground gap-1"
              onClick={() => window.electronAPI?.openExternal?.('https://github.com/opencode-ai/opencode')}
            >
              {t('openCode.learnMore', 'Learn more about OpenCode')}
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button variant="outline" onClick={onBack}>
            {t('common:back', 'Back')}
          </Button>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onSkip}>
              {t('common:skip', 'Skip')}
            </Button>
            <Button
              onClick={onNext}
              disabled={status === 'loading'}
            >
              {status === 'installed'
                ? t('common:continue', 'Continue')
                : t('common:continueAnyway', 'Continue Anyway')
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
