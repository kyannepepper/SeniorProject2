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
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
        <ActivityIndicator size="large" color="#6366f1" />
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
        placeholderTextColor="#64748b"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue..."
        placeholderTextColor="#64748b"
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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save changes</Text>
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
    borderRadius: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#4338ca",
  },
  chipText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  workerList: {
    gap: 8,
  },
  workerOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  workerOptionSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#1e1b4b",
  },
  workerOptionText: {
    fontSize: 15,
    color: "#94a3b8",
  },
  workerOptionTextSelected: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 16,
  },
  metaValue: {
    fontSize: 14,
    color: "#cbd5f5",
    marginTop: 2,
  },
  photo: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#1e293b",
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
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
