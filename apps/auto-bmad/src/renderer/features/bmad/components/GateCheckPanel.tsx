/**
 * GateCheckPanel Component
 * 
 * Displays gate check results with pass/fail indicators.
 * Allows running gate checks and overriding with confirmation.
 * 
 * Stories: 8.1, 8.2, 8.3, 8.4
 */

import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  SkipForward, 
  Play, 
  Loader2,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useGateCheckStore, type GateCheckItem } from '../stores/gate-check-store';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GateCheckPanelProps {
  projectPath: string;
  onPass?: () => void;
  onBlock?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Icon Component
// ─────────────────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: GateCheckItem['status'] }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'fail':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'skipped':
      return <SkipForward className="h-5 w-5 text-gray-400" />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate Check Item Component
// ─────────────────────────────────────────────────────────────────────────────

function GateCheckItemRow({ item }: { item: GateCheckItem }) {
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg p-3 transition-colors',
      item.status === 'pass' && 'bg-green-500/5',
      item.status === 'fail' && 'bg-red-500/5',
      item.status === 'warning' && 'bg-yellow-500/5',
      item.status === 'skipped' && 'bg-muted/50',
    )}>
      <StatusIcon status={item.status} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {item.required && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              Required
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{item.message}</p>
        {item.details && item.details.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {item.details.map((detail, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {detail}
              </li>
            ))}
          </ul>
        )}
        {item.artifactPath && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span className="truncate">{item.artifactPath}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function GateCheckPanel({ projectPath, onPass, onBlock }: GateCheckPanelProps) {
  const { t } = useTranslation(['common']);

  const {
    result,
    isRunning,
    error,
    showOverrideDialog,
    overrideConfirmation,
    runGateCheck,
    override,
    setShowOverrideDialog,
    setOverrideConfirmation,
    clearError,
    shouldBlockPhase4,
    getBlockingReasons,
  } = useGateCheckStore();

  // Run gate check on mount
  useEffect(() => {
    if (!result && projectPath) {
      runGateCheck(projectPath);
    }
  }, [projectPath, result, runGateCheck]);

  // Notify parent of pass/block
  useEffect(() => {
    if (result) {
      if (result.passed || result.overridden) {
        onPass?.();
      } else {
        onBlock?.();
      }
    }
  }, [result, onPass, onBlock]);

  // Handle override
  const handleOverride = useCallback(async () => {
    const success = await override(projectPath, overrideConfirmation);
    if (success) {
      onPass?.();
    }
  }, [projectPath, overrideConfirmation, override, onPass]);

  // Determine overall status
  const passed = result?.passed || result?.overridden || false;
  const blockingReasons = getBlockingReasons();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between border-b px-4 py-3',
        passed ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20' : 
                 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
      )}>
        <div className="flex items-center gap-3">
          {passed ? (
            <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
          )}
          <div>
            <h2 className="font-semibold">Implementation Readiness</h2>
            <p className="text-sm text-muted-foreground">
              {passed 
                ? result?.overridden 
                  ? 'Gate check overridden' 
                  : 'All checks passed'
                : `${blockingReasons.length} blocking issue${blockingReasons.length === 1 ? '' : 's'}`
              }
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => runGateCheck(projectPath)}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Re-run Check
            </>
          )}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={clearError}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Summary */}
      {result && (
        <div className="grid grid-cols-4 gap-4 border-b border-border p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{result.summary.passed}</div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{result.summary.warnings}</div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{result.summary.skipped}</div>
            <div className="text-xs text-muted-foreground">Skipped</div>
          </div>
        </div>
      )}

      {/* Check Items */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {result?.items.map((item) => (
            <GateCheckItemRow key={item.id} item={item} />
          ))}
        </div>
      </ScrollArea>

      {/* Blocking Footer */}
      {!passed && result && (
        <div className="border-t border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-red-700 dark:text-red-400">
                Phase 4 Blocked
              </h3>
              <p className="text-sm text-red-600 dark:text-red-500">
                Fix the issues above or override to proceed
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowOverrideDialog(true)}
            >
              Override & Proceed
            </Button>
          </div>
        </div>
      )}

      {/* Override Confirmation */}
      {result?.overridden && (
        <div className="border-t border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Gate check was overridden on{' '}
              {result.overriddenAt?.toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Override Gate Check
            </DialogTitle>
            <DialogDescription>
              You are about to override the implementation-readiness gate check. 
              This allows you to proceed to Phase 4 despite failing checks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive mb-2">
                Warning: Proceeding without passing the gate check may result in:
              </p>
              <ul className="list-disc list-inside space-y-1 text-destructive/80">
                <li>Incomplete documentation</li>
                <li>Missing architectural decisions</li>
                <li>Undefined user stories</li>
                <li>Implementation difficulties</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <code className="bg-muted px-1 rounded">I UNDERSTAND</code> to confirm:
              </label>
              <Input
                value={overrideConfirmation}
                onChange={(e) => setOverrideConfirmation(e.target.value)}
                placeholder="Type confirmation..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleOverride}
              disabled={overrideConfirmation !== 'I UNDERSTAND' || isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Overriding...
                </>
              ) : (
                'Override & Proceed'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
