/**
 * Language Detector for TEA Polyglot Support
 * 
 * Implements the 4-tier language resolution system:
 * - Tier 1: Known language (direct match)
 * - Tier 2: Family inference (syntax patterns)
 * - Tier 3: Discovery mode (web research + project analysis)
 * - Tier 4: Universal fallback
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import type {
  DetectedLanguage,
  LanguageDetectionResult,
  LanguageFamily,
  LanguageResolutionTier,
  ConfidenceLevel,
  LanguageStrategy,
  FamilyInferenceResult,
  TestFramework,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DETECTION_RULES_PATH = '_bmad/bmm/testarch/knowledge/languages/_detection-rules.yaml';
const FAMILIES_INDEX_PATH = '_bmad/bmm/testarch/knowledge/families/_index.yaml';

const CONFIDENCE_THRESHOLDS = {
  high: 0.7,
  medium: 0.4,
  low: 0.2,
  minimal: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Language Detector Class
// ─────────────────────────────────────────────────────────────────────────────

export class LanguageDetector {
  private projectPath: string;
  private bmadPath: string;
  private detectionRules: any;
  private familyIndex: any;
  private cache: Map<string, LanguageDetectionResult> = new Map();

  constructor(projectPath: string, bmadPath?: string) {
    this.projectPath = projectPath;
    this.bmadPath = bmadPath || path.join(projectPath, '_bmad');
  }

  /**
   * Detect languages in the project
   */
  async detect(): Promise<LanguageDetectionResult> {
    const cacheKey = this.projectPath;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    await this.loadDetectionRules();
    
    const detectedLanguages: DetectedLanguage[] = [];
    const unknownExtensions: string[] = [];
    
    // Scan project for files
    const files = await this.scanProjectFiles();
    // Ensure files is always an array
    const fileList = Array.isArray(files) ? files : [];
    const extensionCounts = this.countExtensions(fileList);
    
    // First, check for marker files (tsconfig.json, pyproject.toml, etc.)
    const markerDetected = await this.detectByMarkerFiles(fileList);
    for (const detected of markerDetected) {
      const existing = detectedLanguages.find(d => d.language === detected.language);
      if (!existing) {
        detectedLanguages.push(detected);
      }
    }
    
    // Then try to detect each unique extension
    for (const [ext, count] of Object.entries(extensionCounts)) {
      const detected = await this.detectLanguageForExtension(ext, count as number);
      if (detected) {
        // Check if language already detected
        const existing = detectedLanguages.find(d => d.language === detected.language);
        if (!existing) {
          detectedLanguages.push(detected);
        }
      } else {
        // Only mark as unknown if not already detected via markers
        if (!detectedLanguages.some(d => this.extensionMatchesLanguage(ext, d.language))) {
          unknownExtensions.push(ext);
        }
      }
    }

    // Sort by confidence (higher first), then by priority (lower first)
    detectedLanguages.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return (a.priority || 999) - (b.priority || 999);
    });

    const result: LanguageDetectionResult = {
      primaryLanguage: detectedLanguages[0],
      allLanguages: detectedLanguages,
      isPolyglot: detectedLanguages.length > 1,
      unknownExtensions,
      discoveryNeeded: unknownExtensions.length > 0 || detectedLanguages.some(d => d.tier >= 3),
    };

    this.cache.set(cacheKey, result);
    return result;
  }
  
  /**
   * Detect languages by marker files (tsconfig.json, pyproject.toml, etc.)
   */
  private async detectByMarkerFiles(files: string[]): Promise<DetectedLanguage[]> {
    const detected: DetectedLanguage[] = [];
    const rules = this.detectionRules?.detection_rules || [];
    
    for (const rule of rules) {
      const indicators = rule.indicators || {};
      const requiredAny = indicators.required_any || [];
      const required = indicators.required || [];
      
      // Check required_any - at least one must match
      let hasRequiredAny = requiredAny.length === 0; // If none required, pass
      for (const indicator of requiredAny) {
        if (indicator.type === 'file' && indicator.pattern) {
          if (files.some(f => f === indicator.pattern || f.endsWith('/' + indicator.pattern))) {
            hasRequiredAny = true;
            break;
          }
        }
      }
      
      // Check required - all must match
      let hasAllRequired = true;
      for (const indicator of required) {
        if (indicator.type === 'file' && indicator.pattern) {
          if (!files.some(f => f === indicator.pattern || f.endsWith('/' + indicator.pattern))) {
            hasAllRequired = false;
            break;
          }
        }
      }
      
      if (hasRequiredAny && hasAllRequired && (requiredAny.length > 0 || required.length > 0)) {
        detected.push(this.createDetectedLanguage(rule, 1, 0.95));
      }
    }
    
    return detected;
  }
  
  /**
   * Check if an extension matches a language
   */
  private extensionMatchesLanguage(extension: string, language: string): boolean {
    const extensionToLanguage: Record<string, string[]> = {
      '.ts': ['typescript'],
      '.tsx': ['typescript'],
      '.js': ['javascript', 'typescript'],
      '.jsx': ['javascript', 'typescript'],
      '.py': ['python'],
      '.go': ['go'],
      '.rs': ['rust'],
      '.java': ['java', 'kotlin'],
      '.kt': ['kotlin'],
      '.kts': ['kotlin'],
      '.cs': ['csharp'],
      '.rb': ['ruby'],
      '.php': ['php'],
      '.swift': ['swift'],
      '.scala': ['scala'],
      '.ex': ['elixir'],
      '.exs': ['elixir'],
      '.clj': ['clojure'],
      '.cljs': ['clojure'],
      '.cljc': ['clojure'],
      '.hs': ['haskell'],
      '.lhs': ['haskell'],
      '.ml': ['ocaml'],
      '.mli': ['ocaml'],
      '.fs': ['fsharp'],
      '.fsx': ['fsharp'],
      '.fsi': ['fsharp'],
      '.dart': ['dart'],
      '.zig': ['zig'],
    };
    
    const languages = extensionToLanguage[extension] || [];
    return languages.includes(language);
  }

  /**
   * Load detection rules from YAML
   */
  private async loadDetectionRules(): Promise<void> {
    if (this.detectionRules) return;

    const rulesPath = path.join(this.bmadPath, 'bmm/testarch/knowledge/languages/_detection-rules.yaml');
    const familiesPath = path.join(this.bmadPath, 'bmm/testarch/knowledge/families/_index.yaml');

    try {
      if (fs.existsSync(rulesPath)) {
        const content = fs.readFileSync(rulesPath, 'utf-8');
        this.detectionRules = yaml.load(content);
      }
    } catch (error) {
      console.warn('Failed to load detection rules:', error);
      this.detectionRules = { detection_rules: [] };
    }

    try {
      if (fs.existsSync(familiesPath)) {
        const content = fs.readFileSync(familiesPath, 'utf-8');
        this.familyIndex = yaml.load(content);
      }
    } catch (error) {
      console.warn('Failed to load family index:', error);
      this.familyIndex = { families: {} };
    }
  }

  /**
   * Scan project files
   */
  private async scanProjectFiles(): Promise<string[]> {
    const exclusions = this.detectionRules?.global_exclusions || [
      '**/node_modules/**',
      '**/vendor/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
    ];

    try {
      const files = await glob('**/*.*', {
        cwd: this.projectPath,
        ignore: exclusions,
        nodir: true,
        maxDepth: 5,
      });
      return files;
    } catch (error) {
      console.warn('Failed to scan project files:', error);
      return [];
    }
  }

  /**
   * Count file extensions
   */
  private countExtensions(files: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        counts[ext] = (counts[ext] || 0) + 1;
      }
    }
    return counts;
  }

  /**
   * Detect language for a file extension
   */
  private async detectLanguageForExtension(
    extension: string,
    fileCount: number
  ): Promise<DetectedLanguage | null> {
    // Tier 1: Direct match
    const tier1Result = this.tier1DirectMatch(extension);
    if (tier1Result) {
      return tier1Result;
    }

    // Tier 2: Family inference
    const tier2Result = await this.tier2FamilyInference(extension);
    if (tier2Result && tier2Result.confidence >= CONFIDENCE_THRESHOLDS.medium) {
      return tier2Result;
    }

    // Tier 3 & 4 would require async operations (web fetch, user interaction)
    // For now, return null to indicate unknown
    return null;
  }

  /**
   * Tier 1: Direct language match
   */
  private tier1DirectMatch(extension: string): DetectedLanguage | null {
    const rules = this.detectionRules?.detection_rules || [];
    
    for (const rule of rules) {
      // Check file extensions in indicators
      const indicators = rule.indicators || {};
      const requiredAny = indicators.required_any || [];
      const required = indicators.required || [];
      const optional = indicators.optional || [];
      
      const allIndicators = [...requiredAny, ...required, ...optional];
      
      for (const indicator of allIndicators) {
        if (indicator.type === 'glob' && indicator.pattern) {
          // Check if pattern matches extension
          if (indicator.pattern.endsWith(extension) || 
              indicator.pattern.includes(`*${extension}`)) {
            return this.createDetectedLanguage(rule, 1, 0.9);
          }
        }
      }
    }

    // Check common extension mappings - only if we have a detection rule for the language
    const extensionMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.zig': 'zig',
      '.nim': 'nim',
      '.d': 'd',
      '.ml': 'ocaml',
      '.mli': 'ocaml',
      '.hs': 'haskell',
      '.lhs': 'haskell',
      '.fs': 'fsharp',
      '.fsx': 'fsharp',
      '.fsi': 'fsharp',
      '.dart': 'dart',
      '.clj': 'clojure',
      '.cljs': 'clojure',
      '.cljc': 'clojure',
      '.ex': 'elixir',
      '.exs': 'elixir',
      '.erl': 'erlang',
      '.lua': 'lua',
      '.pl': 'perl',
      '.r': 'r',
      '.jl': 'julia',
    };

    const language = extensionMap[extension];
    if (language) {
      const rule = rules.find((r: any) => r.language === language);
      if (rule) {
        return this.createDetectedLanguage(rule, 1, 0.85);
      }
      // If no rule exists for this language, don't return it as detected
      // This allows proper handling of unknown extensions
    }

    return null;
  }

  /**
   * Tier 2: Family inference from syntax patterns
   */
  private async tier2FamilyInference(extension: string): Promise<DetectedLanguage | null> {
    if (!this.familyIndex?.families) return null;

    // Read sample files with this extension
    const sampleContent = await this.readSampleFiles(extension, 3, 100);
    if (!sampleContent) return null;

    // Try to match against each family
    const familyScores: FamilyInferenceResult[] = [];

    for (const [familyId, familyDef] of Object.entries(this.familyIndex.families as Record<string, any>)) {
      const patterns = familyDef.syntax_patterns || [];
      let totalWeight = 0;
      const matchedPatterns: { pattern: string; weight: number }[] = [];

      for (const patternDef of patterns) {
        try {
          const regex = new RegExp(patternDef.pattern, 'gm');
          const matches = sampleContent.match(regex);
          if (matches && matches.length > 0) {
            totalWeight += patternDef.weight || 1;
            matchedPatterns.push({
              pattern: patternDef.description || patternDef.pattern,
              weight: patternDef.weight || 1,
            });
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }

      if (totalWeight > 0) {
        const minWeight = this.familyIndex.inference_settings?.min_total_weight || 8;
        const confidence = Math.min(1, totalWeight / minWeight);
        
        familyScores.push({
          family: familyId as LanguageFamily,
          confidence,
          matchedPatterns,
          totalWeight,
        });
      }
    }

    // Sort by confidence
    familyScores.sort((a, b) => b.confidence - a.confidence);

    if (familyScores.length > 0 && familyScores[0].confidence >= CONFIDENCE_THRESHOLDS.medium) {
      const bestMatch = familyScores[0];
      return {
        language: `unknown-${extension.replace('.', '')}`,
        displayName: `Unknown (${bestMatch.family})`,
        tier: 2,
        confidence: bestMatch.confidence,
        confidenceLevel: this.getConfidenceLevel(bestMatch.confidence),
        family: bestMatch.family,
        strategyFile: `families/${bestMatch.family}.md`,
      };
    }

    return null;
  }

  /**
   * Read sample files for pattern analysis
   */
  private async readSampleFiles(
    extension: string,
    maxFiles: number,
    maxLinesPerFile: number
  ): Promise<string | null> {
    try {
      const files = await glob(`**/*${extension}`, {
        cwd: this.projectPath,
        ignore: this.detectionRules?.global_exclusions || ['**/node_modules/**'],
        nodir: true,
        maxDepth: 5,
      });

      const sampleFiles = files.slice(0, maxFiles);
      const contents: string[] = [];

      for (const file of sampleFiles) {
        const filePath = path.join(this.projectPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, maxLinesPerFile);
        contents.push(lines.join('\n'));
      }

      return contents.join('\n\n');
    } catch (error) {
      return null;
    }
  }

  /**
   * Create DetectedLanguage from rule
   */
  private createDetectedLanguage(
    rule: any,
    tier: LanguageResolutionTier,
    confidence: number
  ): DetectedLanguage {
    const defaultFramework = rule.test_frameworks_available?.find(
      (f: any) => f.id === rule.test_framework_default
    );

    return {
      language: rule.language,
      displayName: rule.display_name || rule.language,
      tier,
      confidence,
      confidenceLevel: this.getConfidenceLevel(confidence),
      priority: rule.priority,
      strategyFile: rule.strategy_file,
      testFramework: defaultFramework?.name,
      testCommand: defaultFramework?.test_command,
      testPattern: defaultFramework?.test_pattern,
    };
  }

  /**
   * Get confidence level from numeric confidence
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'high';
    if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
    if (confidence >= CONFIDENCE_THRESHOLDS.low) return 'low';
    return 'minimal';
  }

  /**
   * Get test frameworks for a language
   */
  getTestFrameworks(language: string): TestFramework[] {
    const rules = this.detectionRules?.detection_rules || [];
    const rule = rules.find((r: any) => r.language === language);
    return rule?.test_frameworks_available || [];
  }

  /**
   * Get strategy file path for a language
   */
  getStrategyPath(language: string): string | null {
    const rules = this.detectionRules?.detection_rules || [];
    const rule = rules.find((r: any) => r.language === language);
    if (rule?.strategy_file) {
      return path.join(this.bmadPath, 'bmm/testarch/knowledge', rule.strategy_file);
    }
    return null;
  }

  /**
   * Get family strategy path
   */
  getFamilyStrategyPath(family: LanguageFamily): string {
    return path.join(this.bmadPath, `bmm/testarch/knowledge/families/${family}.md`);
  }

  /**
   * Get universal fallback path
   */
  getUniversalFallbackPath(): string {
    return path.join(this.bmadPath, 'bmm/testarch/knowledge/universal/universal-fallback.md');
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export singleton factory
// ─────────────────────────────────────────────────────────────────────────────

let detectorInstance: LanguageDetector | null = null;

export function getLanguageDetector(projectPath: string, bmadPath?: string): LanguageDetector {
  if (!detectorInstance || detectorInstance['projectPath'] !== projectPath) {
    detectorInstance = new LanguageDetector(projectPath, bmadPath);
  }
  return detectorInstance;
}

export function clearLanguageDetector(): void {
  detectorInstance = null;
}
