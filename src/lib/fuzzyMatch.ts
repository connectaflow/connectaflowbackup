/**
 * Fuzzy matching utilities for resilient header-to-field mapping.
 * Uses Levenshtein distance and scoring heuristics for smart field detection.
 * Integrates with standardFields for alias-aware matching.
 */

import { STANDARD_FIELDS, getStandardFieldByAlias, type StandardField } from './standardFields';

/**
 * Calculate Levenshtein distance between two strings (edit distance)
 * Lower values = more similar
 */
function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      const cost = aLower[j - 1] === bLower[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j] + 1,      // deletion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Calculate similarity score between 0 and 1 (1 = perfect match)
 */
function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * Normalize a header string for comparison
 * - lowercase
 * - remove punctuation and extra whitespace
 * - split into tokens
 */
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/[\s_-]+/)
    .filter(Boolean);
}

/**
 * Check if tokens from source are contained in target (subset matching)
 */
function isSubsetMatch(source: string[], target: string[]): boolean {
  return source.every((token) =>
    target.some((tToken) => tToken === token || similarityScore(token, tToken) > 0.85)
  );
}

/**
 * Score a candidate field against a header
 * Returns a score between 0 and 1
 * Now includes alias-based matching for standard fields
 */
function scoreCandidate(
  header: string,
  fieldLabel: string,
  fieldKey: string,
  aliases?: string[]
): number {
  const headerNorm = normalize(header);
  const labelNorm = normalize(fieldLabel);
  const keyNorm = normalize(fieldKey);
  const headerNormalized = headerNorm.join('');

  // ─── ALIAS MATCHING (highest priority) ───────────────────────────────────
  // Check if header matches any alias directly (normalized)
  if (aliases) {
    for (const alias of aliases) {
      const aliasNorm = normalize(alias).join('');
      if (headerNormalized === aliasNorm) return 1.0; // Perfect match using alias
      
      // Fuzzy match against alias
      const aliasSim = Math.max(...headerNorm.map((token) =>
        Math.max(...normalize(alias).map((aToken) => similarityScore(token, aToken)))
      ));
      if (aliasSim >= 0.92) return 0.96; // Very high score for strong alias match
    }
  }

  // ─── STANDARD MATCHING (existing logic) ──────────────────────────────────
  // Exact key match (best)
  if (headerNormalized === keyNorm.join('')) return 1.0;

  // Exact label match
  if (headerNormalized === labelNorm.join('')) return 0.95;

  // Subset match (all header tokens in label)
  if (isSubsetMatch(headerNorm, labelNorm)) return 0.9;

  // Subset match with key
  if (isSubsetMatch(headerNorm, keyNorm)) return 0.85;

  // Calculate combined similarity: avg of label and key similarity
  const labelSim = Math.max(...headerNorm.map((token) =>
    Math.max(...labelNorm.map((lToken) => similarityScore(token, lToken)))
  ));
  const keySim = Math.max(...headerNorm.map((token) =>
    Math.max(...keyNorm.map((kToken) => similarityScore(token, kToken)))
  ));

  const avgSim = (labelSim + keySim) / 2;

  // Penalty if header is very short and match is partial
  if (header.length <= 3 && avgSim < 0.9) return avgSim * 0.7;

  return avgSim;
}

export interface FuzzyMatchResult {
  fieldKey: string;
  score: number;
  isCustom?: false;
}

export interface CustomFieldMatch {
  headerName: string;
  isCustom: true;
}

export type MatchResult = FuzzyMatchResult | CustomFieldMatch;

/**
 * Find the best matching field for a header, or return a custom field marker
 * Now supports fields with aliases for smarter matching
 * @param header - the column header from CSV
 * @param availableFields - array of known fields (with optional aliases)
 * @param threshold - minimum score to consider a match (default 0.6)
 * @returns matched field or custom field marker
 */
export function fuzzyMatch(
  header: string,
  availableFields: Array<{ key: string; label: string; aliases?: string[] }>,
  threshold: number = 0.6
): MatchResult {
  const scores = availableFields
    .map((field) => ({
      fieldKey: field.key,
      score: scoreCandidate(header, field.label, field.key, field.aliases),
    }))
    .sort((a, b) => b.score - a.score);

  const bestMatch = scores[0];

  // If we have a good match above threshold, use it
  if (bestMatch && bestMatch.score >= threshold) {
    return {
      fieldKey: bestMatch.fieldKey,
      score: bestMatch.score,
      isCustom: false,
    };
  }

  // Otherwise, suggest creating a custom field
  return {
    headerName: header,
    isCustom: true,
  };
}

/**
 * Batch fuzzy match multiple headers
 */
export function fuzzyMatchBatch(
  headers: string[],
  availableFields: Array<{ key: string; label: string; aliases?: string[] }>,
  threshold: number = 0.6
): Record<string, MatchResult> {
  const result: Record<string, MatchResult> = {};
  headers.forEach((header) => {
    result[header] = fuzzyMatch(header, availableFields, threshold);
  });
  return result;
}

/**
 * Convenient wrapper for fuzzy matching with standard fields
 * Uses STANDARD_FIELDS from standardFields.ts
 */
export function fuzzyMatchWithStandards(
  header: string,
  threshold: number = 0.65
): MatchResult {
  return fuzzyMatch(header, STANDARD_FIELDS, threshold);
}

/**
 * Batch fuzzy matching with standard fields
 */
export function fuzzyMatchBatchWithStandards(
  headers: string[],
  threshold: number = 0.65
): Record<string, MatchResult> {
  return fuzzyMatchBatch(headers, STANDARD_FIELDS, threshold);
}
