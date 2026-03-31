/** Brand accent — use for primary actions, links, and key UI. */
export const BRAND_PRIMARY = "#029DA7";

/** Standard corner radius (5px). Use for cards, inputs, and buttons. */
export const RADIUS_SM = 5;
/** Fully rounded (pill / circular). */
export const RADIUS_FULL = 999;

/** Semantic colors for the app — use these instead of raw hex in screens. */
export type AppThemeColors = {
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  hairline: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  accentText: string;
  accentBorder: string;
  secondaryButton: string;
  secondaryButtonText: string;
  outlineBorder: string;
  danger: string;
  dangerSoft: string;
  income: string;
  warningText: string;
  success: string;
  successBg: string;
  successText: string;
  lateBg: string;
  lateText: string;
  onTimeBg: string;
  onTimeText: string;
  chipBg: string;
  chipBorder: string;
  chipSelectedBg: string;
  chipText: string;
  chipTextSelected: string;
  inputBg: string;
  inputBorder: string;
  tabActive: string;
  tabInactive: string;
  tabIndicator: string;
  badgeUrgentBg: string;
  badgeUrgentText: string;
  badgeStatusBg: string;
  overlayTint: string;
  /** Selected list / role option background */
  selectedAccentBg: string;
};

export const lightColors: AppThemeColors = {
  bg: "#f8fafc",
  bgSecondary: "#f1f5f9",
  surface: "#ffffff",
  surfaceHover: "#f8fafc",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  hairline: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  placeholder: "#94a3b8",
  primary: BRAND_PRIMARY,
  primaryPressed: "#027a82",
  onPrimary: "#ffffff",
  accentText: "#026a72",
  accentBorder: BRAND_PRIMARY,
  secondaryButton: "#e2e8f0",
  secondaryButtonText: "#0f172a",
  outlineBorder: "#cbd5e1",
  danger: "#dc2626",
  dangerSoft: "#ef4444",
  income: "#059669",
  warningText: "#b45309",
  success: "#16a34a",
  successBg: "#dcfce7",
  successText: "#166534",
  lateBg: "#fee2e2",
  lateText: "#b91c1c",
  onTimeBg: "#dcfce7",
  onTimeText: "#166534",
  chipBg: "#f1f5f9",
  chipBorder: "#e2e8f0",
  chipSelectedBg: "#d4f4f6",
  chipText: "#64748b",
  chipTextSelected: "#014e54",
  inputBg: "#ffffff",
  inputBorder: "#cbd5e1",
  tabActive: BRAND_PRIMARY,
  tabInactive: "#64748b",
  tabIndicator: BRAND_PRIMARY,
  badgeUrgentBg: "#fed7aa",
  badgeUrgentText: "#9a3412",
  badgeStatusBg: "#e2e8f0",
  overlayTint: "rgba(15, 23, 42, 0.04)",
  selectedAccentBg: "#d4f4f6",
};

export const darkColors: AppThemeColors = {
  bg: "#020617",
  bgSecondary: "#020617",
  surface: "#0f172a",
  surfaceHover: "#1e293b",
  border: "#1e293b",
  borderStrong: "#334155",
  hairline: "#334155",
  text: "#f8fafc",
  textSecondary: "#e5e7eb",
  textMuted: "#94a3b8",
  placeholder: "#64748b",
  primary: BRAND_PRIMARY,
  primaryPressed: "#027a82",
  onPrimary: "#ffffff",
  accentText: "#6ee7ea",
  accentBorder: BRAND_PRIMARY,
  secondaryButton: "#334155",
  secondaryButtonText: "#f8fafc",
  outlineBorder: "#475569",
  danger: "#f87171",
  dangerSoft: "#f97373",
  income: "#34d399",
  warningText: "#fefce8",
  success: "#22c55e",
  successBg: "#14532d",
  successText: "#bbf7d0",
  lateBg: "#7f1d1d",
  lateText: "#fecaca",
  onTimeBg: "#14532d",
  onTimeText: "#bbf7d0",
  chipBg: "#020617",
  chipBorder: "#1e293b",
  chipSelectedBg: "#0a3d42",
  chipText: "#9ca3af",
  chipTextSelected: "#e5e7eb",
  inputBg: "#020617",
  inputBorder: "#334155",
  tabActive: "#f8fafc",
  tabInactive: "#94a3b8",
  tabIndicator: BRAND_PRIMARY,
  badgeUrgentBg: "#f97316",
  badgeUrgentText: "#fefce8",
  badgeStatusBg: "#334155",
  overlayTint: "rgba(0, 0, 0, 0.2)",
  selectedAccentBg: "#0a3d42",
};

export type ThemeMode = "light" | "dark";

export function getColors(mode: ThemeMode): AppThemeColors {
  return mode === "light" ? lightColors : darkColors;
}
