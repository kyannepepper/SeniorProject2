import { ThemeToggleRow } from "@/components/ThemeToggleRow";
import { UserProfileSettingsSection } from "@/components/UserProfileSettingsSection";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { createContrastScreenStyles } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MaintenanceSettingsScreen() {
  const { colors } = useTheme();
  const base = useMemo(() => createContrastScreenStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <ScrollView
      style={base.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={base.hero}>
        <Text style={base.heroLabel}>SETTINGS</Text>
        <Text style={base.heroTitle}>Maintenance</Text>
        <Text style={base.heroTagline}>Profile, contact info, and display preferences.</Text>
      </View>

      <View style={[base.panelCard, styles.displayPanel]}>
        <Text style={base.sectionLabel}>Display</Text>
        <ThemeToggleRow />
      </View>

      <View style={base.panelCard}>
        <UserProfileSettingsSection />
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    displayPanel: {
      marginBottom: 20,
    },
    signOutButton: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.outlineBorder,
      borderRadius: 5,
    },
    signOutText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: "500",
    },
  });
}
