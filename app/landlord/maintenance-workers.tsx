import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type LinkedWorker = {
  maintenance_worker_id: string;
  name: string;
  email: string;
  created_at: string;
};
 
export default function LandlordMaintenanceWorkersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    helperText: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 16,
    },
    idCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    idLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    idValue: {
      fontSize: 14,
      color: colors.text,
      fontFamily: "monospace",
      marginBottom: 12,
    },
    copyButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 5,
      alignSelf: "flex-start",
    },
    copyButtonText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    workerCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    workerName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    workerEmail: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}
