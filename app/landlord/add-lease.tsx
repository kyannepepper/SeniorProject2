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
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function AddLeaseScreen() {
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

  const [rentAmount, setRentAmount] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [leaseDetailsText, setLeaseDetailsText] = useState("");

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
          .select("name, address, landlord_id")
          .eq("property_id", tid.property_id)
          .single();
        if (pError || !prop || (prop as { landlord_id: string }).landlord_id !== landlordId) {
          Alert.alert("Error", "Property not found or access denied.");
          router.back();
          return;
        }
        const p = prop as { name: string; address: string };
        setPropertyName(p.name);
        setPropertyAddress(p.address);

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

  // Seed editable lease text when we have loaded names/property (template may still have placeholders until rent/dates are set)
  useEffect(() => {
    if (!loading && (tenantName || landlordName || propertyName)) {
      setLeaseDetailsText((prev) => (prev === "" ? generateLeaseText() : prev));
    }
  }, [loading, tenantName, landlordName, propertyName, propertyAddress]);

  function generateLeaseText() {
    const rent = rentAmount.trim() ? `$${Number(rentAmount.replace(/[^0-9.]/g, "")) || 0}` : "[Rent amount]";
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
  }

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
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Rent amount ($/month)</Text>
      <TextInput
        style={styles.input}
        value={rentAmount}
        onChangeText={setRentAmount}
        placeholder="e.g. 1200"
        placeholderTextColor="#64748b"
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
      <Text style={styles.leaseHint}>Edit the lease text below. Use "Regenerate" to refresh from the template after changing rent or dates.</Text>
      <TouchableOpacity
        style={styles.regenerateButton}
        onPress={() => setLeaseDetailsText(generateLeaseText())}
        activeOpacity={0.8}
      >
        <Text style={styles.regenerateButtonText}>Regenerate from template</Text>
      </TouchableOpacity>
      <TextInput
        style={[styles.leaseTextInput, styles.leaseText]}
        value={leaseDetailsText}
        onChangeText={setLeaseDetailsText}
        placeholder="Lease agreement text..."
        placeholderTextColor="#64748b"
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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Create lease</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#020617",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
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
  inputText: {
    fontSize: 16,
    color: "#f8fafc",
  },
  inputPlaceholder: {
    fontSize: 16,
    color: "#64748b",
  },
  datePickerDone: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6366f1",
  },
  leaseHint: {
    fontSize: 13,
    color: "#94a3b8",
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
    color: "#6366f1",
  },
  leaseTextInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginTop: 0,
    minHeight: 280,
  },
  leaseText: {
    fontSize: 12,
    color: "#cbd5f5",
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
