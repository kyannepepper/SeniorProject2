import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type LinkedWorker = {
  maintenance_worker_id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function LandlordMaintenanceWorkersScreen() {
  const { landlordId } = useAuth();
  const [workers, setWorkers] = useState<LinkedWorker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkers() {
      if (!landlordId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("maintenance_worker_landlords")
          .select(
            `
            maintenance_worker_id,
            created_at,
            maintenance_workers (
              user_id,
              users (name, email)
            )
          `
          )
          .eq("landlord_id", landlordId)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const list: LinkedWorker[] = (data ?? []).map((row: Record<string, unknown>) => {
          const mw = (row.maintenance_workers as Record<string, unknown>) ?? {};
          const usersRow = (mw.users as Record<string, unknown>) ?? {};
          return {
            maintenance_worker_id: row.maintenance_worker_id as string,
            name: (usersRow.name as string) ?? "—",
            email: (usersRow.email as string) ?? "—",
            created_at: (row.created_at as string) ?? "",
          };
        });
        setWorkers(list);
      } catch (e) {
        console.error("Error fetching maintenance workers", e);
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkers();
  }, [landlordId]);

  async function copyLandlordId() {
    if (!landlordId) return;
    await Clipboard.setStringAsync(landlordId);
    Alert.alert("Copied", "Landlord ID copied. Share this with maintenance workers to link their accounts.");
  }

  if (!landlordId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Invite maintenance workers</Text>
      <Text style={styles.helperText}>
        Share your Landlord ID with maintenance workers. They’ll enter it when creating an account to
        get linked to you.
      </Text>

      <View style={styles.idCard}>
        <Text style={styles.idLabel}>Your Landlord ID</Text>
        <Text style={styles.idValue} selectable>
          {landlordId}
        </Text>
        <TouchableOpacity style={styles.copyButton} onPress={copyLandlordId} activeOpacity={0.85}>
          <Text style={styles.copyButtonText}>Copy ID</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Linked maintenance workers</Text>
      {workers.length === 0 ? (
        <Text style={styles.emptyText}>No maintenance workers linked yet.</Text>
      ) : (
        workers.map((w) => (
          <View key={w.maintenance_worker_id} style={styles.workerCard}>
            <Text style={styles.workerName}>{w.name}</Text>
            <Text style={styles.workerEmail}>{w.email}</Text>
          </View>
        ))
      )}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
    marginTop: 16,
  },
  helperText: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 16,
  },
  idCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  idLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  idValue: {
    fontSize: 14,
    color: "#f8fafc",
    fontFamily: "monospace",
    marginBottom: 12,
  },
  copyButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  workerCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  workerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  workerEmail: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
});
