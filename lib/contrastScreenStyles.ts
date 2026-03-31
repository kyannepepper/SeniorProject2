import { Platform, StyleSheet } from "react-native";
import type { AppThemeColors } from "@/lib/theme";

/** Soft elevation for list rows / panels on bgSecondary. */
export function panelElevation(colors: AppThemeColors) {
  return Platform.select({
    ios: {
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  });
}

/** Teal hero band — use on auth / section headers. */
export function heroBandStyles(colors: AppThemeColors) {
  return {
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 5,
      paddingVertical: 20,
      paddingHorizontal: 18,
      marginBottom: 18,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryPressed,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
        default: {},
      }),
    },
    heroLabel: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 2,
      color: colors.onPrimary,
      opacity: 0.88,
      marginBottom: 6,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.onPrimary,
      marginBottom: 4,
      letterSpacing: -0.4,
    },
    heroTagline: {
      fontSize: 15,
      fontWeight: "500" as const,
      color: colors.onPrimary,
      opacity: 0.92,
      lineHeight: 21,
    },
  };
}

/**
 * Shared high-contrast screen tokens: page tint, section labels, search, panels.
 * Merge with screen-specific styles as needed.
 */
export function createContrastScreenStyles(colors: AppThemeColors) {
  const hero = heroBandStyles(colors);
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    screenCentered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
    },
    ...hero,
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      marginBottom: 10,
      marginTop: 6,
    },
    search: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      ...panelElevation(colors),
    },
    panelCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      padding: 16,
      ...panelElevation(colors),
    },
    formPanel: {
      width: "100%" as const,
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      padding: 22,
      ...panelElevation(colors),
    },
  });
}
