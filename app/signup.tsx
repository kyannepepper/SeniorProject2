import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/contexts/AuthContext";

type RoleOption = { key: UserRole; label: string };

const ROLES: RoleOption[] = [
  { key: "landlord", label: "Landlord / Property Manager" },
  { key: "tenant", label: "Tenant" },
  { key: "maintenance", label: "Maintenance Worker" },
];

export default function SignupScreen() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup() {
    if (!role || !name.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in name, email, and password.");
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

      // Insert into users table
      const { error: userError } = await supabase.from("users").insert({
        user_id: userId,
        role,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      });
      if (userError) throw userError;

      // Insert into role-specific table
      if (role === "landlord") {
        const { error: landlordError } = await supabase.from("landlords").insert({
          user_id: userId,
        });
        if (landlordError) throw landlordError;
      } else if (role === "maintenance") {
        const { error: workerError } = await supabase.from("maintenance_workers").insert({
          user_id: userId,
        });
        if (workerError) throw workerError;
      }

      router.replace("/(app)");
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
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Choose your account type</Text>

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
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (optional)"
          placeholderTextColor="#64748b"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#64748b"
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
            <ActivityIndicator color="#fff" />
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 24,
  },
  roleOptions: {
    gap: 12,
    marginBottom: 24,
  },
  roleButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  roleButtonSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#1e1b4b",
  },
  roleLabel: {
    fontSize: 16,
    color: "#94a3b8",
  },
  roleLabelSelected: {
    color: "#a5b4fc",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#f8fafc",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backButtonText: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
