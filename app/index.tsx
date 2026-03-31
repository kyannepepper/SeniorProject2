import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { createContrastScreenStyles } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  const { session, isLoading, userRole, landlordId } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const base = useMemo(() => createContrastScreenStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (isLoading || !session || !userRole) return;
    if (userRole === "landlord") {
      if (!landlordId) return;
      router.replace("/landlord");
      return;
    }
    if (userRole === "tenant") router.replace("/tenant");
    else if (userRole === "maintenance") router.replace("/maintenance");
  }, [session, userRole, landlordId, isLoading, router]);

  if (isLoading || (session && userRole === null) || (session && userRole === "landlord" && !landlordId)) {
    return (
      <View style={base.screenCentered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session && userRole) {
    return (
      <View style={base.screenCentered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={base.screen}>
      <View style={styles.inner}>
        <View style={styles.welcomeBlock}>
          <View style={styles.logoRow}>
            <BrandLogo size={100} />
          </View>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandRent}>RENT </Text>
            <Text style={styles.brandSquirrel}>SQUIRREL</Text>
          </Text>
          <Text style={styles.subtitle}>Log in or create an account to continue.</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/signup")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    inner: {
      flex: 1,
      padding: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    welcomeBlock: {
      width: "100%",
      maxWidth: 420,
      alignItems: "center",
    },
    logoRow: {
      alignItems: "center",
      marginBottom: 16,
    },
    brandTitle: {
      fontSize: 36,
      fontWeight: "800",
      marginBottom: 10,
      textAlign: "center",
      letterSpacing: -0.8,
    },
    brandRent: {
      color: colors.text,
    },
    brandSquirrel: {
      color: colors.primary,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: 22,
      textAlign: "center",
      lineHeight: 22,
    },
    buttons: {
      width: "100%",
      gap: 14,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 5,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 17,
      fontWeight: "700",
    },
    secondaryButton: {
      backgroundColor: "#000000",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 5,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "700",
    },
  });
}
