import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Edits `users` name / email / phone and syncs auth when email or display name changes.
 * Same behavior as the Profile block on the landlord settings screen.
 */
export function UserProfileSettingsSection() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("name, email, phone")
          .eq("user_id", userId)
          .single();
        if (error) throw error;
        setName((data?.name as string) ?? "");
        setEmail((data?.email as string) ?? session?.user?.email ?? "");
        setPhone((data?.phone as string) ?? "");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Could not load profile.";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userId]);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      const emailChanged = trimmedEmail !== (session?.user?.email ?? "");
      const metaName =
        (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? "";
      const nameChanged = trimmedName !== metaName;

      if (emailChanged || nameChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          ...(emailChanged ? { email: trimmedEmail } : {}),
          ...(nameChanged ? { data: { full_name: trimmedName || undefined } } : {}),
        });
        if (authError) throw authError;
      }

      const { error: userError } = await supabase
        .from("users")
        .update({
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || null,
        })
        .eq("user_id", userId);

      if (userError) throw userError;
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not save profile.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Profile</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone (optional)"
        placeholderTextColor={colors.placeholder}
        keyboardType="phone-pad"
      />

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryButtonText}>Save profile</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    loaderWrap: {
      paddingVertical: 24,
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.accentText,
      marginTop: 16,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      ...panelElevation(colors),
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 24,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.7,
    },
  });
}
