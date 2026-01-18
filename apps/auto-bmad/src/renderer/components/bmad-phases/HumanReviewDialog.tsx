/**
 * HumanReviewDialog Component
 * Dialog for human review checkpoints with approve/reject/regress options
 */

import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  RotateCcw,
  FileText,
  AlertTriangle,
  ChevronDown,
  User,
  Clock,
  FolderOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import { BMAD_PHASES, BMAD_AGENTS, REGRESSION_TARGETS, REGRESSION_REASONS } from '../../../shared/constants';
import type {
  HumanReviewCheckpoint,
  HumanReviewDecision,
  BmadPhaseId,
  WorkflowId,
} from '../../../shared/types';

// ============================================
// Types
// ============================================

interface HumanReviewDialogProps {
  open: boolean;
  checkpoint: HumanReviewCheckpoint | null;
  onClose: () => void;
  onApprove: (checkpointId: string, feedback?: string) => void;
  onRequestChanges: (
    checkpointId: string,
    feedback: string,
    requestedChanges: string[],
    sendBackTo: 'in_progress' | 'ai_review'
  ) => void;
  onRegress: (
    checkpointId: string,
    targetPhase: BmadPhaseId,
    reason: string,
    workflowsToRerun?: WorkflowId[]
  ) => void;
  isSubmitting?: boolean;
}

type DecisionMode = 'approve' | 'request_changes' | 'regress';

// ============================================
// HumanReviewDialog Component
// ============================================

export const HumanReviewDialog = memo(function HumanReviewDialog({
  open,
  checkpoint,
  onClose,
  onApprove,
  onRequestChanges,
  onRegress,
  isSubmitting = false,
}: HumanReviewDialogProps) {
  const { t } = useTranslation('bmad');
  
  // Local state for form
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('approve');
  const [feedback, setFeedback] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [sendBackTo, setSendBackTo] = useState<'in_progress' | 'ai_review'>('in_progress');
  const [targetPhase, setTargetPhase] = useState<BmadPhaseId | null>(null);
  const [regressionReason, setRegressionReason] = useState('');
  const [isArtifactsOpen, setIsArtifactsOpen] = useState(false);
  const [isChangesOpen, setIsChangesOpen] = useState(false);

  if (!checkpoint) return null;

  const validRegressionTargets = REGRESSION_TARGETS[checkpoint.phase] || [];
  const agent = checkpoint.context?.completedBy 
    ? BMAD_AGENTS[checkpoint.context.completedBy] 
    : null;

  const handleSubmit = () => {
    if (!checkpoint) return;

    switch (decisionMode) {
      case 'approve':
        onApprove(checkpoint.id, feedback || undefined);
        break;
      case 'request_changes':
        if (!feedback.trim()) return;
        const changes = requestedChanges
          .split('\n')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);
        onRequestChanges(checkpoint.id, feedback, changes, sendBackTo);
        break;
      case 'regress':
        if (!targetPhase || !regressionReason.trim()) return;
        onRegress(checkpoint.id, targetPhase, regressionReason);
        break;
    }

    // Reset form
    setDecisionMode('approve');
    setFeedback('');
    setRequestedChanges('');
    setRegressionReason('');
    setTargetPhase(null);
  };

  const canSubmit = () => {
    switch (decisionMode) {
      case 'approve':
        return true;
      case 'request_changes':
        return feedback.trim().length > 0;
      case 'regress':
        return targetPhase !== null && regressionReason.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" />
            {t('review.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('review.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Checkpoint Info */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{checkpoint.title}</h4>
                  {checkpoint.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {checkpoint.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  {t(`review.itemType.${checkpoint.itemType}`)}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {agent && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{agent.displayName} ({agent.title})</span>
                  </div>
                )}
                {checkpoint.context?.completedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(checkpoint.context.completedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Artifacts Section */}
            {checkpoint.artifacts && checkpoint.artifacts.length > 0 && (
              <Collapsible open={isArtifactsOpen} onOpenChange={setIsArtifactsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('review.artifacts')} ({checkpoint.artifacts.length})
                    </span>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      isArtifactsOpen && 'rotate-180'
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                    {checkpoint.artifacts.map((artifact, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{artifact.path}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* File Changes Section (for stories) */}
            {checkpoint.changes && checkpoint.changes.length > 0 && (
              <Collapsible open={isChangesOpen} onOpenChange={setIsChangesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('review.changes')} ({checkpoint.changes.length})
                    </span>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      isChangesOpen && 'rotate-180'
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1 rounded-lg border p-3 bg-muted/20 max-h-40 overflow-y-auto">
                    {checkpoint.changes.map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          change.type === 'added' && 'bg-success',
                          change.type === 'modified' && 'bg-warning',
                          change.type === 'deleted' && 'bg-destructive'
                        )} />
                        <span className="font-mono text-xs flex-1 truncate">{change.path}</span>
                        <span className="text-xs text-muted-foreground">
                          {change.type === 'added' ? 'new' : change.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Separator />

            {/* Decision Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">{t('review.yourDecision')}</Label>

              {/* Decision Mode Selection */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={decisionMode === 'approve' ? 'default' : 'outline'}
                  className={cn(
                    'flex flex-col items-center gap-1 h-auto py-3',
                    decisionMode === 'approve' && 'bg-success hover:bg-success/90'
                  )}
                  onClick={() => setDecisionMode('approve')}
                >
                  <Check className="h-5 w-5" />
                  <span className="text-xs">{t('review.approve')}</span>
                </Button>

                <Button
                  variant={decisionMode === 'request_changes' ? 'default' : 'outline'}
                  className={cn(
                    'flex flex-col items-center gap-1 h-auto py-3',
                    decisionMode === 'request_changes' && 'bg-warning hover:bg-warning/90 text-warning-foreground'
                  )}
                  onClick={() => setDecisionMode('request_changes')}
                >
                  <X className="h-5 w-5" />
                  <span className="text-xs">{t('review.requestChanges')}</span>
                </Button>

                <Button
                  variant={decisionMode === 'regress' ? 'default' : 'outline'}
                  className={cn(
                    'flex flex-col items-center gap-1 h-auto py-3',
                    decisionMode === 'regress' && 'bg-destructive hover:bg-destructive/90'
                  )}
                  onClick={() => setDecisionMode('regress')}
                  disabled={validRegressionTargets.length === 0}
                >
                  <RotateCcw className="h-5 w-5" />
                  <span className="text-xs">{t('review.regress')}</span>
                </Button>
              </div>

              {/* Approve Form */}
              {decisionMode === 'approve' && (
                <div className="space-y-3 p-4 rounded-lg border bg-success/5 border-success/20">
                  <p className="text-sm text-success">
                    {t('review.approveDescription')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="approve-feedback">{t('review.feedbackOptional')}</Label>
                    <Textarea
                      id="approve-feedback"
                      placeholder={t('review.feedbackPlaceholder')}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Request Changes Form */}
              {decisionMode === 'request_changes' && (
                <div className="space-y-3 p-4 rounded-lg border bg-warning/5 border-warning/20">
                  <p className="text-sm text-warning">
                    {t('review.requestChangesDescription')}
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="changes-feedback">{t('review.feedbackRequired')} *</Label>
                    <Textarea
                      id="changes-feedback"
                      placeholder={t('review.changesFeedbackPlaceholder')}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requested-changes">{t('review.requestedChanges')}</Label>
                    <Textarea
                      id="requested-changes"
                      placeholder={t('review.requestedChangesPlaceholder')}
                      value={requestedChanges}
                      onChange={(e) => setRequestedChanges(e.target.value)}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">{t('review.onePerLine')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('review.sendBackTo')}</Label>
                    <RadioGroup
                      value={sendBackTo}
                      onValueChange={(v) => setSendBackTo(v as 'in_progress' | 'ai_review')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="send-in-progress" />
                        <Label htmlFor="send-in-progress" className="text-sm font-normal">
                          {t('review.sendToInProgress')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ai_review" id="send-ai-review" />
                        <Label htmlFor="send-ai-review" className="text-sm font-normal">
                          {t('review.sendToAiReview')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Regress Form */}
              {decisionMode === 'regress' && (
                <div className="space-y-3 p-4 rounded-lg border bg-destructive/5 border-destructive/20">
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{t('review.regressWarning')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('review.regressTo')} *</Label>
                    <RadioGroup
                      value={targetPhase?.toString() || ''}
                      onValueChange={(v) => setTargetPhase(parseInt(v) as BmadPhaseId)}
                      className="space-y-2"
                    >
                      {validRegressionTargets.map((phaseId) => {
                        const phase = BMAD_PHASES[phaseId];
                        return (
                          <div key={phaseId} className="flex items-center space-x-2">
                            <RadioGroupItem value={phaseId.toString()} id={`phase-${phaseId}`} />
                            <Label htmlFor={`phase-${phaseId}`} className="text-sm font-normal">
                              Phase {phaseId}: {phase.displayName}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regression-reason">{t('review.regressionReason')} *</Label>
                    <Textarea
                      id="regression-reason"
                      placeholder={t('review.regressionReasonPlaceholder')}
                      value={regressionReason}
                      onChange={(e) => setRegressionReason(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>

                  {/* Suggested reasons based on target phase */}
                  {targetPhase && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {t('review.suggestedReasons')}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {(REGRESSION_REASONS[`to-phase-${targetPhase}`] || []).map((reason, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => setRegressionReason(reason)}
                          >
                            {reason}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className={cn(
              decisionMode === 'approve' && 'bg-success hover:bg-success/90',
              decisionMode === 'request_changes' && 'bg-warning hover:bg-warning/90 text-warning-foreground',
              decisionMode === 'regress' && 'bg-destructive hover:bg-destructive/90'
            )}
          >
            {isSubmitting ? (
              t('common:buttons.submitting')
            ) : decisionMode === 'approve' ? (
              t('review.approveAndContinue')
            ) : decisionMode === 'request_changes' ? (
              t('review.sendForChanges')
            ) : (
              t('review.confirmRegress')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default HumanReviewDialog;
