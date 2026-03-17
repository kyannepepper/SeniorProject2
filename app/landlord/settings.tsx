import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type PreferredPaymentMethod =
  | "cash"
  | "check"
  | "venmo"
  | "cash_app"
  | "zelle"
  | "other"
  | null;

export default function LandlordSettingsScreen() {
  const router = useRouter();
  const { session, landlordId, signOut } = useAuth();
  const userId = session?.user?.id ?? null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredPaymentMethod, setPreferredPaymentMethod] =
    useState<PreferredPaymentMethod>(null);
  const [preferredPaymentDetails, setPreferredPaymentDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!userId || !landlordId) return;
      setLoading(true);
      try {
        // Basic user info
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("name, email, phone")
          .eq("user_id", userId)
          .single();
        if (userError) throw userError;

        // Landlord-specific payment prefs live on landlords table
        const { data: landlord, error: landlordError } = await supabase
          .from("landlords")
          .select("preferred_payment_method, preferred_payment_details")
          .eq("landlord_id", landlordId)
          .single();
        if (landlordError) throw landlordError;

        setName((user.name as string) ?? "");
        setEmail((user.email as string) ?? session?.user?.email ?? "");
        setPhone((user.phone as string) ?? "");
        setPreferredPaymentMethod(
          (landlord?.preferred_payment_method as PreferredPaymentMethod) ?? null
        );
        setPreferredPaymentDetails((landlord?.preferred_payment_details as string) ?? "");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Could not load settings.";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userId, landlordId, session?.user?.email]);

  async function handleSave() {
    if (!userId || !landlordId) return;
    setSaving(true);
    try {
      // Keep Supabase Auth user in sync (display name / email)
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      const { error: authError } = await supabase.auth.updateUser({
        email: trimmedEmail || undefined,
        data: { full_name: trimmedName || undefined },
      });
      if (authError) throw authError;

      const { error: userError } = await supabase
        .from("users")
        .update({
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || null,
        })
        .eq("user_id", userId);

      if (userError) throw userError;

      const { error: landlordError } = await supabase
        .from("landlords")
        .update({
          preferred_payment_method: preferredPaymentMethod,
          preferred_payment_details: preferredPaymentDetails.trim() || null,
        })
        .eq("landlord_id", landlordId);

      if (landlordError) throw landlordError;
      Alert.alert("Saved", "Your settings have been updated.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not save settings.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }

  if (!userId || !landlordId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Profile</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone (optional)"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionTitle}>Payments</Text>

        <Text style={styles.label}>Preferred payment method</Text>
        <View style={styles.chipRow}>
          {[
            { key: "cash", label: "Cash" },
            { key: "check", label: "Check" },
            { key: "venmo", label: "Venmo" },
            { key: "cash_app", label: "Cash App" },
            { key: "zelle", label: "Zelle" },
            { key: "other", label: "Other" },
          ].map((option) => {
            const selected = preferredPaymentMethod === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() =>
                  setPreferredPaymentMethod(
                    selected ? null : (option.key as PreferredPaymentMethod)
                  )
                }
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Payment details</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={3}
          value={preferredPaymentDetails}
          onChangeText={setPreferredPaymentDetails}
          placeholder="e.g. Venmo handle, Cash App tag, Zelle phone/email, or instructions."
          placeholderTextColor="#64748b"
        />

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.dangerButtonText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#cbd5f5",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#f8fafc",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
  },
  chipSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#1e293b",
  },
  chipText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  dangerButton: {
    marginTop: 24,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#f97373",
    fontSize: 15,
    fontWeight: "500",
  },
});

