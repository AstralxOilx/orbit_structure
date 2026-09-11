export type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordRule {
  readonly id: string;
  readonly label: string;
  readonly test: (value: string) => boolean;
}

export interface StrengthResult {
  readonly score: number;        // 0–5
  readonly level: StrengthLevel;
  readonly percent: number;      // 0–100
  readonly rules: ReadonlyArray<PasswordRule & { passed: boolean }>;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: 'อย่างน้อย 8 ตัวอักษร', test: (v) => v.length >= 8 },
  { id: 'lower', label: 'มีตัวพิมพ์เล็ก (a-z)', test: (v) => /[a-z]/.test(v) },
  { id: 'upper', label: 'มีตัวพิมพ์ใหญ่ (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'มีตัวเลข (0-9)', test: (v) => /[0-9]/.test(v) },
  { id: 'special', label: 'มีอักขระพิเศษ (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
] as const;

export function evaluatePassword(value: string): StrengthResult {
  const rules = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(value) }));
  let score = rules.filter((r) => r.passed).length;

  if (value.length >= 12 && score >= 4) score = 5;

  const level: StrengthLevel =
    value.length === 0 ? 'empty' : score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

  return { score, level, percent: (score / 5) * 100, rules };
}

export const STRENGTH_META: Record<StrengthLevel, { label: string; bar: string; text: string }> = {
  empty:  { label: '—',         bar: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400' },
  weak:   { label: 'อ่อน',      bar: 'bg-rose-500',                    text: 'text-rose-500' },
  medium: { label: 'ปานกลาง',   bar: 'bg-amber-500',                   text: 'text-amber-500' },
  strong: { label: 'แข็งแรง',   bar: 'bg-emerald-500',                 text: 'text-emerald-500' },
};