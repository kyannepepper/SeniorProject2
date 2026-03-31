import type { AppThemeColors } from "@/lib/theme";
import { Platform, StyleSheet } from "react-native";

/** Shared layout for add / edit property screens — contrast panels + hero. */
export function createLandlordPropertyFormStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 44,
    },
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 5,
      paddingVertical: 22,
      paddingHorizontal: 20,
      marginBottom: 22,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryPressed,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 14,
        },
        android: { elevation: 8 },
        default: {},
      }),
    },
    heroLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
      color: colors.onPrimary,
      opacity: 0.85,
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.onPrimary,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    heroTagline: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.onPrimary,
      opacity: 0.92,
      lineHeight: 22,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 10,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      paddingVertical: 4,
      paddingHorizontal: 16,
      marginBottom: 18,
      ...Platform.select({
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    fieldGroup: {
      paddingVertical: 12,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 14,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
    },
    photoCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      overflow: "hidden",
      marginBottom: 20,
      ...Platform.select({
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    photoButton: {
      width: "100%",
      height: 200,
      backgroundColor: colors.chipBg,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    previewImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    photoButtonText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "600",
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 17,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 8,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryPressed,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        android: { elevation: 5 },
        default: {},
      }),
    },
    saveButtonDisabled: {
      opacity: 0.65,
    },
    saveButtonText: {
      color: colors.onPrimary,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
}
