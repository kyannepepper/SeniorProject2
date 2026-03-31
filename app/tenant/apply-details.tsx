import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";

export default function TenantApplicationDetailsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId?: string }>();
  const { session, userRole } = useAuth();

  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  type Reference = { name: string; phone: string; email: string; relationship: string };
  const [references, setReferences] = useState<Reference[]>([
    { name: "", phone: "", email: "", relationship: "" },
  ]);

  // Prefill the tenant's own info from their account
  useEffect(() => {
    if (!session) return;

    const meta = (session.user.user_metadata ?? {}) as { full_name?: string };
    const defaultName = meta.full_name ?? "";
    const defaultEmail = session.user.email ?? "";

    if (!fullName) setFullName(defaultName);
    if (!email) setEmail(defaultEmail);

    // Phone lives in the public.users table
    (async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("phone")
          .eq("user_id", session.user.id)
          .single();
        if (!error && data?.phone && !phone) {
          setPhone(data.phone as string);
        }
      } catch {
        // Ignore phone lookup errors; user can still type manually
      }
    })();
  }, [session, fullName, email, phone]);

  useEffect(() => {
    async function loadProperty() {
      if (!propertyId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("name, address")
          .eq("property_id", propertyId)
          .single();
        if (error || !data) throw error ?? new Error("Property not found");
        setPropertyName((data.name as string) ?? "");
        setPropertyAddress((data.address as string) ?? "");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Could not load property.";
        Alert.alert("Error", message);
        router.back();
        return;
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [propertyId, router]);

  function addReference() {
    if (references.length >= 3) return;
    setReferences((prev) => [...prev, { name: "", phone: "", email: "", relationship: "" }]);
  }

  function updateReference(index: number, field: keyof Reference, value: string) {
    setReferences((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function removeReference(index: number) {
    if (references.length <= 1) return;
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  function getFilledReferences(): Reference[] {
    return references.filter((r) => r.name.trim() !== "");
  }

  async function handleSubmit() {
    if (!session || userRole !== "tenant") {
      Alert.alert(
        "Login required",
        "You need to be logged in as a tenant to submit an application."
      );
      return;
    }
    if (!propertyId) return;
    if (!fullName.trim() || !email.trim()) {
      Alert.alert("Missing info", "Please enter at least your name and email.");
      return;
    }
    const filledRefs = getFilledReferences();
    if (filledRefs.length === 0) {
      Alert.alert("Reference required", "Please add at least one reference (name required).");
      return;
    }

    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc("submit_application", {
        p_property_id: propertyId,
        p_name: fullName.trim(),
        p_email: email.trim(),
        p_phone: phone.trim() || null,
        p_move_in_date: moveInDate ? moveInDate.toISOString().split("T")[0] : null,
        p_description: message.trim() || null,
        p_applicant_user_id: session.user.id,
        p_references: filledRefs.map((r) => ({
          name: r.name.trim(),
          phone: r.phone.trim() || null,
          email: r.email.trim() || null,
          relationship: r.relationship.trim() || null,
        })),
      });
      if (rpcError) throw rpcError;

      Alert.alert(
        "Application submitted",
        "Your application has been sent to the landlord."
      );
      router.replace("/tenant");
    } catch (e: unknown) {
      const err = e as { message?: string; details?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : "Could not submit application.");
      const details = err?.details ? `\n${err.details}` : "";
      Alert.alert("Error", msg + details);
    } finally {
      setSubmitting(false);
    }
  }

  if (!propertyId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Application details</Text>
      <View style={styles.selectedSummary}>
        <Text style={styles.selectedSummaryLabel}>Applying for</Text>
        <Text style={styles.propertyName}>{propertyName}</Text>
        <Text style={styles.propertyAddress}>{propertyAddress}</Text>
      </View>

      <Text style={styles.sectionTitle}>Your information</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your full name"
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

      <Text style={styles.label}>Desired move-in date</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.8}
      >
        <Text style={moveInDate ? styles.inputText : styles.inputPlaceholder}>
          {moveInDate
            ? moveInDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Tap to pick year / month / day"}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={moveInDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedDate) => {
            if (Platform.OS === "android") setShowDatePicker(false);
            if (selectedDate != null) setMoveInDate(selectedDate);
          }}
          minimumDate={new Date()}
        />
      )}
      {Platform.OS === "ios" && showDatePicker && (
        <TouchableOpacity
          style={styles.datePickerDone}
          onPress={() => setShowDatePicker(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.datePickerDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Message to landlord</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={message}
        onChangeText={setMessage}
        placeholder="Tell the landlord about yourself, your situation, and any questions."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.sectionTitle}>References (at least one required, up to 3)</Text>
      {references.map((ref, index) => (
        <View key={index} style={styles.referenceBlock}>
          <View style={styles.referenceBlockHeader}>
            <Text style={styles.referenceLabel}>Reference {index + 1}</Text>
            {references.length > 1 && (
              <TouchableOpacity
                onPress={() => removeReference(index)}
                hitSlop={8}
                style={styles.removeRefButton}
              >
                <Text style={styles.removeRefText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={ref.name}
            onChangeText={(v) => updateReference(index, "name", v)}
            placeholder="Full name *"
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={styles.input}
            value={ref.phone}
            onChangeText={(v) => updateReference(index, "phone", v)}
            placeholder="Phone"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            value={ref.email}
            onChangeText={(v) => updateReference(index, "email", v)}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            value={ref.relationship}
            onChangeText={(v) => updateReference(index, "relationship", v)}
            placeholder="Relationship (e.g. employer, landlord)"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      ))}
      {references.length < 3 && (
        <TouchableOpacity style={styles.addRefButton} onPress={addReference} activeOpacity={0.8}>
          <Text style={styles.addRefText}>+ Add another reference</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Submit application</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    selectedSummary: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      marginBottom: 16,
      ...panelElevation(colors),
    },
    selectedSummaryLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    propertyName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    propertyAddress: {
      fontSize: 14,
      color: colors.textMuted,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 8,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      ...panelElevation(colors),
    },
    inputText: {
      fontSize: 16,
      color: colors.text,
    },
    inputPlaceholder: {
      fontSize: 16,
      color: colors.placeholder,
    },
    datePickerDone: {
      marginTop: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    datePickerDoneText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    multiline: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    referenceBlock: {
      marginTop: 16,
      padding: 14,
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    referenceBlockHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    referenceLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    removeRefButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    removeRefText: {
      fontSize: 13,
      color: colors.danger,
    },
    addRefButton: {
      marginTop: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 999,
      borderStyle: "dashed",
    },
    addRefText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 28,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
}

