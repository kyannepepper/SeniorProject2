import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddLeaseScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const { tenantId } = useLocalSearchParams<{ tenantId?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  /** Property rent at load time; used to decide whether to sync `properties.rent_amount` on save */
  const [propertyRentLoaded, setPropertyRentLoaded] = useState<number | null>(null);

  const [rentAmount, setRentAmount] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [leaseDetailsText, setLeaseDetailsText] = useState("");
  /** After user edits the lease body, stop overwriting until they tap Regenerate */
  const leaseManuallyEditedRef = useRef(false);

  const formatDateForDisplay = (d: Date) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const formatDateForSave = (d: Date) => d.toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      if (!tenantId || !landlordId) return;
      setLoading(true);
      try {
        const { data: tenant, error: tError } = await supabase
          .from("tenants")
          .select("tenant_id, property_id, user_id")
          .eq("tenant_id", tenantId)
          .single();
        if (tError || !tenant) {
          Alert.alert("Error", "Tenant not found.");
          router.back();
          return;
        }
        const tid = tenant as { tenant_id: string; property_id: string; user_id?: string };
        setPropertyId(tid.property_id);

        const { data: prop, error: pError } = await supabase
          .from("properties")
          .select("name, address, landlord_id, rent_amount")
          .eq("property_id", tid.property_id)
          .single();
        if (pError || !prop || (prop as { landlord_id: string }).landlord_id !== landlordId) {
          Alert.alert("Error", "Property not found or access denied.");
          router.back();
          return;
        }
        const p = prop as { name: string; address: string; rent_amount: number | null };
        setPropertyName(p.name);
        setPropertyAddress(p.address);
        const rawRent = p.rent_amount != null ? Number(p.rent_amount) : null;
        const loadedRent = rawRent != null && !Number.isNaN(rawRent) ? rawRent : null;
        setPropertyRentLoaded(loadedRent);
        setRentAmount(loadedRent != null ? String(Number(p.rent_amount).toFixed(0)) : "");

        const { data: user } = await supabase
          .from("users")
          .select("name")
          .eq("user_id", (tenant as { user_id?: string }).user_id)
          .single();
        setTenantName((user as { name?: string } | null)?.name ?? "Tenant");

        const { data: landlord } = await supabase
          .from("landlords")
          .select("user_id")
          .eq("landlord_id", landlordId)
          .single();
        if (landlord) {
          const { data: landlordUser } = await supabase
            .from("users")
            .select("name")
            .eq("user_id", (landlord as { user_id: string }).user_id)
            .single();
          setLandlordName((landlordUser as { name?: string } | null)?.name ?? "Landlord");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load.";
        Alert.alert("Error", msg);
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, landlordId, router]);

  const generateLeaseText = useCallback(() => {
    const rent = rentAmount.trim()
      ? `$${Number(rentAmount.replace(/[^0-9.]/g, "")) || 0}`
      : "[Rent amount]";
    const start = startDate ? formatDateForDisplay(startDate) : "[Start date]";
    const end = endDate ? formatDateForDisplay(endDate) : "[End date]";
    return `LEASE AGREEMENT

This Lease Agreement is entered into between ${landlordName || "[Landlord]"} ("Landlord") and ${tenantName || "[Tenant]"} ("Tenant") for the property located at ${propertyAddress || propertyName || "[Property address]"}.

1. PROPERTY: ${propertyName || "[Property name]"}

2. TERM: The lease term shall begin on ${start} and end on ${end}.

3. RENT: Tenant shall pay Landlord ${rent} per month, due on the first day of each month.

4. OCCUPANCY: The premises shall be used solely as a residential dwelling by Tenant.

5. SIGNATURES: By signing below, both parties agree to the terms of this lease.

Landlord: _________________________   Date: __________
Tenant:   _________________________   Date: __________

[To be signed by both parties]`;
  }, [rentAmount, startDate, endDate, tenantName, landlordName, propertyName, propertyAddress]);

  // Keep the lease body in sync with rent + dates (and party/property names) until the user edits the text.
  useEffect(() => {
    if (loading) return;
    if (!propertyName && !tenantName) return;
    if (leaseManuallyEditedRef.current) return;
    setLeaseDetailsText(generateLeaseText());
  }, [loading, propertyName, tenantName, generateLeaseText]);

  async function handleSave() {
    if (!tenantId || !landlordId || !propertyId) return;
    const rent = rentAmount.trim() ? Number(rentAmount.replace(/[^0-9.]/g, "")) : null;
    if (rent != null && (isNaN(rent) || rent < 0)) {
      Alert.alert("Error", "Enter a valid rent amount.");
      return;
    }
    if (!startDate) {
      Alert.alert("Error", "Select a start date.");
      return;
    }
    if (!endDate) {
      Alert.alert("Error", "Select an end date.");
      return;
    }

    setSaving(true);
    try {
      const { data: lease, error: leaseError } = await supabase
        .from("leases")
        .insert({
          landlord_id: landlordId,
          property_id: propertyId,
          rent_amount: rent,
          start_date: formatDateForSave(startDate),
          end_date: formatDateForSave(endDate),
          signed: false,
          lease_details: leaseDetailsText.trim() || null,
        })
        .select("lease_id")
        .single();
      if (leaseError) throw leaseError;
      const leaseId = (lease as { lease_id: string }).lease_id;

      const { error: updateError } = await supabase
        .from("tenants")
        .update({ lease_id: leaseId })
        .eq("tenant_id", tenantId);
      if (updateError) throw updateError;

      if (rent != null) {
        const loaded = propertyRentLoaded;
        const differs =
          loaded === null ||
          Number.isNaN(loaded) ||
          Math.abs(loaded - rent) > 0.009;
        if (differs) {
          const { error: propRentError } = await supabase
            .from("properties")
            .update({ rent_amount: rent })
            .eq("property_id", propertyId);
          if (propRentError) throw propRentError;
        }
      }

      Alert.alert("Saved", "Lease created and linked to tenant.");
      router.replace("/landlord/leases");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save lease.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Rent amount ($/month)</Text>
      <Text style={styles.fieldHint}>
        Pre-filled from the property listing. If you change it and save, the property rent will update
        to match.
      </Text>
      <TextInput
        style={styles.input}
        value={rentAmount}
        onChangeText={setRentAmount}
        placeholder="e.g. 1200"
        placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Start date</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowStartDatePicker(true)}
        activeOpacity={0.8}
      >
        <Text style={startDate ? styles.inputText : styles.inputPlaceholder}>
          {startDate ? formatDateForDisplay(startDate) : "Tap to pick start date"}
        </Text>
      </TouchableOpacity>
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedDate) => {
            if (Platform.OS === "android") setShowStartDatePicker(false);
            if (selectedDate != null) setStartDate(selectedDate);
          }}
        />
      )}
      {Platform.OS === "ios" && showStartDatePicker && (
        <TouchableOpacity
          style={styles.datePickerDone}
          onPress={() => setShowStartDatePicker(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.datePickerDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>End date</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowEndDatePicker(true)}
        activeOpacity={0.8}
      >
        <Text style={endDate ? styles.inputText : styles.inputPlaceholder}>
          {endDate ? formatDateForDisplay(endDate) : "Tap to pick end date"}
        </Text>
      </TouchableOpacity>
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate ?? startDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={startDate ?? undefined}
          onChange={(_, selectedDate) => {
            if (Platform.OS === "android") setShowEndDatePicker(false);
            if (selectedDate != null) setEndDate(selectedDate);
          }}
        />
      )}
      {Platform.OS === "ios" && showEndDatePicker && (
        <TouchableOpacity
          style={styles.datePickerDone}
          onPress={() => setShowEndDatePicker(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.datePickerDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Lease details</Text>
      <Text style={styles.leaseHint}>
        Rent, start date, and end date update this text automatically. If you edit the wording below,
        changes to those fields will not overwrite your text until you tap Regenerate.
      </Text>
      <TouchableOpacity
        style={styles.regenerateButton}
        onPress={() => {
          leaseManuallyEditedRef.current = false;
          setLeaseDetailsText(generateLeaseText());
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.regenerateButtonText}>Regenerate from template</Text>
      </TouchableOpacity>
      <TextInput
        style={[styles.leaseTextInput, styles.leaseText]}
        value={leaseDetailsText}
        onChangeText={(text) => {
          leaseManuallyEditedRef.current = true;
          setLeaseDetailsText(text);
        }}
        placeholder="Lease agreement text..."
        placeholderTextColor={colors.placeholder}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Create lease</Text>
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
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accentText,
      marginTop: 16,
      marginBottom: 6,
    },
    fieldHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 8,
      lineHeight: 18,
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
    leaseHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 8,
    },
    regenerateButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    regenerateButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accentText,
    },
    leaseTextInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      padding: 14,
      marginTop: 0,
      minHeight: 280,
      ...panelElevation(colors),
    },
    leaseText: {
      fontSize: 12,
      color: colors.accentText,
      lineHeight: 18,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 24,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
}
