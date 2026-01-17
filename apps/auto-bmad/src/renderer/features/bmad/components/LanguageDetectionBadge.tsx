/**
 * Language Detection Badge Component
 * 
 * Displays detected programming languages for a project with confidence indicators.
 * Supports the 4-tier language resolution system.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Code,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  ChevronDown,
  RefreshCw,
  Globe,
  Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'minimal';
export type ResolutionTier = 1 | 2 | 3 | 4;

export interface DetectedLanguage {
  language: string;
  displayName: string;
  tier: ResolutionTier;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  family?: string;
  testFramework?: string;
  testCommand?: string;
}

export interface LanguageDetectionResult {
  primaryLanguage?: DetectedLanguage;
  allLanguages: DetectedLanguage[];
  isPolyglot: boolean;
  unknownExtensions: string[];
  discoveryNeeded: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Styling
// ─────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: 'bg-green-500/10 text-green-600 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  low: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  minimal: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const CONFIDENCE_ICONS: Record<ConfidenceLevel, typeof CheckCircle2> = {
  high: CheckCircle2,
  medium: AlertCircle,
  low: HelpCircle,
  minimal: AlertCircle,
};

const TIER_LABELS: Record<ResolutionTier, string> = {
  1: 'Known Language',
  2: 'Family Inference',
  3: 'Discovery Mode',
  4: 'Universal Fallback',
};

const TIER_DESCRIPTIONS: Record<ResolutionTier, string> = {
  1: 'Matched from detection rules with high confidence',
  2: 'Inferred from syntax patterns matching a language family',
  3: 'Discovered via web research and project analysis',
  4: 'Using universal testing principles (manual validation recommended)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageDetectionBadgeProps {
  detection: LanguageDetectionResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDiscover?: (extensions: string[]) => void;
  className?: string;
}

export function LanguageDetectionBadge({
  detection,
  isLoading = false,
  onRefresh,
  onDiscover,
  className,
}: LanguageDetectionBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Detecting...
      </Badge>
    );
  }

  if (!detection || !detection.primaryLanguage) {
    return (
      <Badge variant="outline" className={cn('gap-1 text-muted-foreground', className)}>
        <HelpCircle className="h-3 w-3" />
        No language detected
      </Badge>
    );
  }

  const primary = detection.primaryLanguage;
  const ConfidenceIcon = CONFIDENCE_ICONS[primary.confidenceLevel];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-7 gap-1.5 px-2',
            CONFIDENCE_COLORS[primary.confidenceLevel],
            className
          )}
        >
          <Code className="h-3.5 w-3.5" />
          <span className="font-medium">{primary.displayName}</span>
          {detection.isPolyglot && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              +{detection.allLanguages.length - 1}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Language Detection</h4>
            {onRefresh && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Primary Language */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <span className="font-medium">{primary.displayName}</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', CONFIDENCE_COLORS[primary.confidenceLevel])}
                    >
                      <ConfidenceIcon className="h-3 w-3 mr-1" />
                      {Math.round(primary.confidence * 100)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{primary.confidenceLevel.toUpperCase()} confidence</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Resolution Tier */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <div className="flex items-center gap-1 font-medium">
                <Beaker className="h-3 w-3" />
                Tier {primary.tier}: {TIER_LABELS[primary.tier]}
              </div>
              <p className="mt-1">{TIER_DESCRIPTIONS[primary.tier]}</p>
            </div>

            {/* Test Framework */}
            {primary.testFramework && (
              <div className="text-xs">
                <span className="text-muted-foreground">Test Framework:</span>{' '}
                <span className="font-medium">{primary.testFramework}</span>
              </div>
            )}

            {/* Family */}
            {primary.family && (
              <div className="text-xs">
                <span className="text-muted-foreground">Language Family:</span>{' '}
                <span className="font-medium">{primary.family}</span>
              </div>
            )}
          </div>

          {/* Additional Languages (Polyglot) */}
          {detection.isPolyglot && detection.allLanguages.length > 1 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Additional Languages
              </h5>
              <div className="flex flex-wrap gap-1">
                {detection.allLanguages.slice(1).map((lang) => (
                  <LanguageBadge key={lang.language} language={lang} size="sm" />
                ))}
              </div>
            </div>
          )}

          {/* Unknown Extensions */}
          {detection.unknownExtensions.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                Unknown Extensions
              </h5>
              <div className="flex flex-wrap gap-1">
                {detection.unknownExtensions.map((ext) => (
                  <Badge key={ext} variant="outline" className="text-xs">
                    {ext}
                  </Badge>
                ))}
              </div>
              {onDiscover && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onDiscover(detection.unknownExtensions)}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Run Discovery Mode
                </Button>
              )}
            </div>
          )}

          {/* Discovery Warning */}
          {detection.discoveryNeeded && primary.tier >= 3 && (
            <div className="text-xs bg-yellow-500/10 text-yellow-700 rounded p-2">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Strategy based on discovery/fallback. Validation recommended.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple Badge Version
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageBadgeProps {
  language: DetectedLanguage;
  size?: 'sm' | 'default';
  showConfidence?: boolean;
  className?: string;
}

export function LanguageBadge({
  language,
  size = 'default',
  showConfidence = true,
  className,
}: LanguageBadgeProps) {
  const ConfidenceIcon = CONFIDENCE_ICONS[language.confidenceLevel];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              size === 'sm' ? 'text-xs h-5' : '',
              CONFIDENCE_COLORS[language.confidenceLevel],
              className
            )}
          >
            {language.displayName}
            {showConfidence && (
              <ConfidenceIcon className={cn('ml-1', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>
              <strong>{language.displayName}</strong> - {Math.round(language.confidence * 100)}% confidence
            </p>
            <p className="text-muted-foreground">
              Tier {language.tier}: {TIER_LABELS[language.tier]}
            </p>
            {language.family && <p>Family: {language.family}</p>}
            {language.testFramework && <p>Framework: {language.testFramework}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Polyglot Summary
// ─────────────────────────────────────────────────────────────────────────────

interface PolyglotSummaryProps {
  detection: LanguageDetectionResult;
  className?: string;
}

export function PolyglotSummary({ detection, className }: PolyglotSummaryProps) {
  if (!detection.isPolyglot) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Code className="h-4 w-4" />
        Polyglot Project ({detection.allLanguages.length} languages)
      </h4>
      <div className="flex flex-wrap gap-2">
        {detection.allLanguages.map((lang) => (
          <LanguageBadge key={lang.language} language={lang} />
        ))}
      </div>
      {detection.unknownExtensions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {detection.unknownExtensions.length} unknown extension(s):{' '}
          {detection.unknownExtensions.join(', ')}
        </p>
      )}
    </div>
  );
}
