import type { UserRole } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { createContrastScreenStyles } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RoleOption = { key: UserRole; label: string };

const ROLES: RoleOption[] = [
  { key: "landlord", label: "Landlord / Property Manager" },
  { key: "tenant", label: "Tenant" },
  { key: "maintenance", label: "Maintenance Worker" },
];

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const base = useMemo(() => createContrastScreenStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [landlordId, setLandlordId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup() {
    if (!role) {
      Alert.alert("Error", "Please select an account type.");
      return;
    }
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in name, email, and password.");
      return;
    }
    if (role === "maintenance" && !landlordId.trim()) {
      Alert.alert("Error", "Please enter the Landlord ID from your landlord.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), role },
        },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("No user ID returned.");

      const { error: userError } = await supabase.from("users").insert({
        user_id: userId,
        role,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      });
      if (userError) throw userError;

      if (role === "landlord") {
        const { data: landlordRow, error: landlordError } = await supabase
          .from("landlords")
          .upsert({ user_id: userId }, { onConflict: "user_id" })
          .select("landlord_id, user_id")
          .single();
        if (landlordError) throw landlordError;
        if (!landlordRow?.landlord_id) {
          throw new Error("Landlord record was not created.");
        }
      } else if (role === "maintenance") {
        const { data: workerData, error: workerError } = await supabase
          .from("maintenance_workers")
          .insert({ user_id: userId })
          .select("maintenance_worker_id")
          .single();
        if (workerError) throw workerError;
        if (workerData?.maintenance_worker_id) {
          const { error: linkError } = await supabase.from("maintenance_worker_landlords").insert({
            maintenance_worker_id: workerData.maintenance_worker_id,
            landlord_id: landlordId.trim(),
          });
          if (linkError) throw linkError;
        }
      } else if (role === "tenant") {
        const { error: tenantError } = await supabase.from("tenants").insert({
          user_id: userId,
        });
        if (tenantError) throw tenantError;
      }

      router.replace("/");
    } catch (error: unknown) {
      const err = error as { message?: string; details?: string };
      const message = err?.message ?? (error instanceof Error ? error.message : "Signup failed.");
      const details = err?.details ? `\n\n${err.details}` : "";
      console.error("Signup error:", error);
      Alert.alert("Signup Error", message + details);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={base.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={base.hero}>
          <Text style={base.heroLabel}>CREATE ACCOUNT</Text>
          <Text style={base.heroTitle}>Join Rent Squirrel</Text>
          <Text style={base.heroTagline}>Pick your role, then add your details below.</Text>
        </View>

        <View style={base.formPanel}>
          <View style={styles.logoRow}>
            <BrandLogo size={88} />
          </View>
          <Text style={styles.brandName}>Rent Squirrel</Text>
          <Text style={styles.sectionHint}>Choose your account type</Text>

          <View style={styles.roleOptions}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleButton, role === r.key && styles.roleButtonSelected]}
              onPress={() => setRole(r.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleLabel, role === r.key && styles.roleLabelSelected]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (optional)"
          placeholderTextColor={colors.placeholder}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        {role === "maintenance" && (
          <TextInput
            style={styles.input}
            placeholder="Landlord ID (get this from your landlord)"
            placeholderTextColor={colors.placeholder}
            value={landlordId}
            onChangeText={setLandlordId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    scrollContent: {
      padding: 22,
      paddingBottom: 48,
    },
    logoRow: {
      alignItems: "center",
      marginBottom: 8,
    },
    brandName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: 6,
      textAlign: "center",
    },
    sectionHint: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 14,
    },
    roleOptions: {
      gap: 12,
      marginBottom: 24,
    },
    roleButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 5,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    roleButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedAccentBg,
    },
    roleLabel: {
      fontSize: 16,
      color: colors.textMuted,
    },
    roleLabelSelected: {
      color: colors.accentText,
      fontWeight: "600",
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    backButton: {
      marginTop: 24,
      alignItems: "center",
    },
    backButtonText: {
      color: colors.textMuted,
      fontSize: 14,
    },
  });
}
