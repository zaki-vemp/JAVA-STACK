import type { SyntaxDrill, SyntaxRuleCheck } from '../types/curriculum';

export interface CheckResult {
  id: string;
  description: string;
  passed: boolean;
  message: string;
}

export interface EvaluationOutcome {
  passed: boolean;
  scorePercent: number;
  passedCount: number;
  totalCount: number;
  results: CheckResult[];
  summaryMessage: string;
}

export function normalizeCodeForInspection(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export function evaluateRuleCheck(code: string, rule: SyntaxRuleCheck): CheckResult {
  const regex = new RegExp(rule.pattern, rule.flags ?? 'm');
  const matched = regex.test(code);
  const passed = rule.required ? matched : !matched;

  return {
    id: rule.id,
    description: rule.description,
    passed,
    message: passed ? 'Verified' : rule.errorHint,
  };
}

export function evaluateSyntaxDrill(userCode: string, drill: SyntaxDrill): EvaluationOutcome {
  const cleaned = normalizeCodeForInspection(userCode);

  if (!cleaned) {
    return {
      passed: false,
      scorePercent: 0,
      passedCount: 0,
      totalCount: drill.checks.length,
      results: drill.checks.map((c) => ({
        id: c.id,
        description: c.description,
        passed: false,
        message: 'Editor is empty. Write your implementation before validating.',
      })),
      summaryMessage: 'Write code in the editor before running syntax validation.',
    };
  }

  const results = drill.checks.map((rule) => evaluateRuleCheck(cleaned, rule));
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const scorePercent = totalCount === 0 ? 100 : Math.round((passedCount / totalCount) * 100);
  const passed = passedCount === totalCount;

  const summaryMessage = passed
    ? `All ${totalCount} structural and semantic checks passed.`
    : `${passedCount} of ${totalCount} checks passed. Review the diagnostics below to resolve missing idioms or anti-patterns.`;

  return {
    passed,
    scorePercent,
    passedCount,
    totalCount,
    results,
    summaryMessage,
  };
}

export function evaluateBugSelection(
  drill: SyntaxDrill,
  selectedOptionId: string | null
): {
  answered: boolean;
  isCorrect: boolean;
  rationale: string;
} {
  if (!drill.bugOptions || !selectedOptionId) {
    return {
      answered: false,
      isCorrect: false,
      rationale: 'Select the root cause option above to verify your diagnosis.',
    };
  }

  const chosen = drill.bugOptions.find((opt) => opt.id === selectedOptionId);
  if (!chosen) {
    return {
      answered: false,
      isCorrect: false,
      rationale: 'Invalid option selected.',
    };
  }

  return {
    answered: true,
    isCorrect: chosen.isCorrect,
    rationale: chosen.rationale,
  };
}
