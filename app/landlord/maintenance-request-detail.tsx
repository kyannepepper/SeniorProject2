import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
 
type WorkerOption = {
  maintenance_worker_id: string;
  name: string;
  email: string;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function MaintenanceRequestDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState<{
    request_id: string;
    property_id: string;
    tenant_id: string;
    title: string;
    description: string | null;
    status: string | null;
    urgency: string | null;
    photo_url: string | null;
    maintenance_worker_id: string | null;
    created_at: string;
    property_name: string;
  } | null>(null);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!requestId || !landlordId) return;
      setLoading(true);
      try {
        const { data: req, error: reqError } = await supabase
          .from("maintenance_requests")
          .select(
            `
            request_id, property_id, tenant_id, title, description,
            status, urgency, photo_url, maintenance_worker_id, created_at,
            properties (name)
          `
          )
          .eq("request_id", requestId)
          .single();
        if (reqError || !req) {
          Alert.alert("Error", "Request not found.");
          router.back();
          return;
        }

        const prop = (req as Record<string, unknown>).properties as Record<string, unknown> | null;
        const propertyName = (prop?.name as string) ?? "—";

        const { data: propsData } = await supabase
          .from("properties")
          .select("landlord_id")
          .eq("property_id", (req as Record<string, unknown>).property_id)
          .single();
        const propLandlordId = (propsData as { landlord_id?: string } | null)?.landlord_id;
        if (propLandlordId !== landlordId) {
          Alert.alert("Error", "You don't have access to this request.");
          router.back();
          return;
        }

        setRequest({
          ...(req as Record<string, unknown>),
          property_name: propertyName,
        } as typeof request);
        setTitle((req as Record<string, unknown>).title as string);
        setDescription(((req as Record<string, unknown>).description as string) ?? "");
        setStatus(((req as Record<string, unknown>).status as string) ?? "pending");
        setAssignedWorkerId((req as Record<string, unknown>).maintenance_worker_id as string | null);

        const { data: workersData, error: workersError } = await supabase
          .from("maintenance_worker_landlords")
          .select(
            `
            maintenance_worker_id,
            maintenance_workers (
              users (name, email)
            )
          `
          )
          .eq("landlord_id", landlordId);
        if (!workersError && workersData) {
          const list: WorkerOption[] = (workersData as Record<string, unknown>[]).map((row) => {
            const mw = (row.maintenance_workers as Record<string, unknown>) ?? {};
            const u = (mw.users as Record<string, unknown>) ?? {};
            return {
              maintenance_worker_id: row.maintenance_worker_id as string,
              name: (u.name as string) ?? "—",
              email: (u.email as string) ?? "—",
            };
          });
          setWorkers(list);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load request.";
        Alert.alert("Error", msg);
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId, landlordId, router]);

  async function handleSave() {
    if (!requestId || !title.trim()) {
      Alert.alert("Error", "Title is required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          status,
          maintenance_worker_id: assignedWorkerId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("request_id", requestId);
      if (error) throw error;
      Alert.alert("Saved", "Request updated.");
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!request) return null;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Short summary"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue..."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.chipRow}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, status === opt.value && styles.chipSelected]}
            onPress={() => setStatus(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, status === opt.value && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Assigned maintenance worker</Text>
      <View style={styles.workerList}>
        <TouchableOpacity
          style={[styles.workerOption, !assignedWorkerId && styles.workerOptionSelected]}
          onPress={() => setAssignedWorkerId(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.workerOptionText, !assignedWorkerId && styles.workerOptionTextSelected]}>
            None
          </Text>
        </TouchableOpacity>
        {workers.map((w) => (
          <TouchableOpacity
            key={w.maintenance_worker_id}
            style={[
              styles.workerOption,
              assignedWorkerId === w.maintenance_worker_id && styles.workerOptionSelected,
            ]}
            onPress={() => setAssignedWorkerId(w.maintenance_worker_id)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.workerOptionText,
                assignedWorkerId === w.maintenance_worker_id && styles.workerOptionTextSelected,
              ]}
            >
              {w.name} ({w.email})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {workers.length === 0 && (
        <Text style={styles.hint}>No maintenance workers linked yet. Add some in Maintenance Workers.</Text>
      )}

      <Text style={styles.metaLabel}>Property</Text>
      <Text style={styles.metaValue}>{request.property_name}</Text>
      <Text style={styles.metaLabel}>Submitted</Text>
      <Text style={styles.metaValue}>{formatDate(request.created_at)}</Text>
      {request.urgency && (
        <>
          <Text style={styles.metaLabel}>Urgency</Text>
          <Text style={styles.metaValue}>
            {String(request.urgency).charAt(0).toUpperCase() + String(request.urgency).slice(1)}
          </Text>
        </>
      )}
      {request.photo_url && (
        <>
          <Text style={styles.metaLabel}>Photo</Text>
          <Image source={{ uri: request.photo_url }} style={styles.photo} />
        </>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Save changes</Text>
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
    multiline: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 5,
      backgroundColor: colors.chipBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    chipSelected: {
      borderColor: colors.accentBorder,
      backgroundColor: colors.primaryPressed,
    },
    chipText: {
      fontSize: 14,
      color: colors.chipText,
    },
    chipTextSelected: {
      color: colors.onPrimary,
      fontWeight: "600",
    },
    workerList: {
      gap: 8,
    },
    workerOption: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    workerOptionSelected: {
      borderColor: colors.accentBorder,
      backgroundColor: colors.selectedAccentBg,
    },
    workerOptionText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    workerOptionTextSelected: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
    },
    metaLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 16,
    },
    metaValue: {
      fontSize: 14,
      color: colors.accentText,
      marginTop: 2,
    },
    photo: {
      width: "100%",
      height: 160,
      borderRadius: 5,
      marginTop: 6,
      backgroundColor: colors.border,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 32,
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
