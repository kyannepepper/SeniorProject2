import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import {
  formatUrgencyLabel,
  getMaintenanceCardBadge,
  urgencySeverityColor,
} from "@/lib/maintenanceRequestDisplay";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MaintenanceRequest = {
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
  properties?: { name: string } | null;
};

export default function MaintenanceDashboard() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const [maintenanceWorkerId, setMaintenanceWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"uncompleted" | "completed">("uncompleted");
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchWorkerAndRequests = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!session?.user) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data: worker, error: workerError } = await supabase
          .from("maintenance_workers")
          .select("maintenance_worker_id")
          .eq("user_id", session.user.id)
          .single();
        if (workerError || !worker) {
          setMaintenanceWorkerId(null);
          setRequests([]);
          return;
        }
        const mwId = (worker as { maintenance_worker_id: string }).maintenance_worker_id;
        setMaintenanceWorkerId(mwId);

        const { data, error } = await supabase
          .from("maintenance_requests")
          .select(
            `
            request_id, property_id, tenant_id, title, description,
            status, urgency, photo_url, maintenance_worker_id, created_at,
            properties (name)
          `
          )
          .eq("maintenance_worker_id", mwId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRequests((data ?? []) as unknown as MaintenanceRequest[]);
      } catch (e) {
        console.error("Error loading maintenance requests", e);
        setRequests([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    if (session?.user) fetchWorkerAndRequests();
  }, [session?.user?.id, fetchWorkerAndRequests]);

  useFocusEffect(
    useCallback(() => {
      if (session?.user) fetchWorkerAndRequests({ skipFullScreenLoading: true });
    }, [session?.user?.id, fetchWorkerAndRequests])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkerAndRequests({ skipFullScreenLoading: true });
  };

  async function markCompleted(requestId: string) {
    setMarkingId(requestId);
    try {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("request_id", requestId);
      if (error) throw error;
      setRequests((prev) =>
        prev.map((r) =>
          r.request_id === requestId ? { ...r, status: "completed" } : r
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update.";
      Alert.alert("Error", msg);
    } finally {
      setMarkingId(null);
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

  const uncompleted = requests.filter(
    (r) => (r.status ?? "").toLowerCase() !== "completed"
  );
  const completed = requests.filter(
    (r) => (r.status ?? "").toLowerCase() === "completed"
  );
  const displayList = activeTab === "uncompleted" ? uncompleted : completed;

  if (!session?.user) {
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

  if (!maintenanceWorkerId) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>My requests</Text>
              <Text style={styles.subtitle}>{session.user.email}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/maintenance/settings" as any)}
              activeOpacity={0.85}
              style={styles.headerIconButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No linked landlord</Text>
          <Text style={styles.emptySubtitle}>
            Your landlord needs to add you. Ask them to share their Landlord ID and create an account
            with it.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>My requests</Text>
            <Text style={styles.subtitle}>{session.user.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/maintenance/settings" as any)}
            activeOpacity={0.85}
            style={styles.headerIconButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="options-outline" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "uncompleted" && styles.tabActive]}
          onPress={() => setActiveTab("uncompleted")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "uncompleted" && styles.tabTextActive,
            ]}
          >
            Uncompleted
          </Text>
          {uncompleted.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "uncompleted" && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === "uncompleted" && styles.tabBadgeTextActive,
                ]}
              >
                {uncompleted.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.tabTextActive,
            ]}
          >
            Completed
          </Text>
          {completed.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "completed" && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === "completed" && styles.tabBadgeTextActive,
                ]}
              >
                {completed.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {displayList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySubtitle}>
              {activeTab === "uncompleted"
                ? "No uncompleted requests assigned to you."
                : "No completed requests."}
            </Text>
          </View>
        ) : (
          displayList.map((r) => {
            const badge = getMaintenanceCardBadge(r.status, r.maintenance_worker_id);
            const urgencyColor = urgencySeverityColor(colors, r.urgency);
            return (
            <View key={r.request_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    badge.variant === "completed" && styles.statusBadgeCompleted,
                    badge.variant === "assigned" && styles.statusBadgeAssigned,
                    badge.variant === "pending" && styles.statusBadgePending,
                    badge.variant === "cancelled" && styles.statusBadgeCancelled,
                  ]}
                >
                  {badge.label}
                </Text>
              </View>
              {r.properties?.name ? (
                <Text style={styles.cardProperty}>{r.properties.name}</Text>
              ) : null}
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMetaText}>{formatDate(r.created_at)}</Text>
                {r.urgency ? (
                  <>
                    <Text style={styles.cardMetaText}> · </Text>
                    <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                    <Text style={[styles.cardMetaText, styles.urgencyLabelSpacing]}>
                      {formatUrgencyLabel(r.urgency)}
                    </Text>
                  </>
                ) : null}
              </View>
              {r.photo_url ? (
                <Image source={{ uri: r.photo_url }} style={styles.cardPhoto} />
              ) : null}
              {r.description ? (
                <Text style={styles.cardDescription} numberOfLines={3}>
                  {r.description}
                </Text>
              ) : null}
              {activeTab === "uncompleted" && (
                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    markingId === r.request_id && styles.completeButtonDisabled,
                  ]}
                  onPress={() => markCompleted(r.request_id)}
                  disabled={markingId === r.request_id}
                  activeOpacity={0.85}
                >
                  {markingId === r.request_id ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.completeButtonText}>Mark completed</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
      padding: 24,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    headerTitles: {
      flex: 1,
    },
    headerIconButton: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.onPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.onPrimary,
      opacity: 0.9,
      marginTop: 2,
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 8,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      gap: 6,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.tabIndicator,
    },
    tabText: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.tabInactive,
    },
    tabTextActive: {
      color: colors.tabActive,
      fontWeight: "600",
    },
    tabBadge: {
      backgroundColor: colors.borderStrong,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      minWidth: 22,
      alignItems: "center",
    },
    tabBadgeActive: {
      backgroundColor: colors.primaryPressed,
    },
    tabBadgeText: {
      fontSize: 12,
      color: colors.tabInactive,
      fontWeight: "600",
    },
    tabBadgeTextActive: {
      color: colors.onPrimary,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    empty: {
      alignItems: "center",
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    cardProperty: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 2,
    },
    statusBadge: {
      fontSize: 11,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    statusBadgeCompleted: {
      backgroundColor: colors.success,
      color: colors.onPrimary,
    },
    statusBadgeAssigned: {
      backgroundColor: colors.selectedAccentBg,
      color: colors.accentText,
    },
    statusBadgePending: {
      backgroundColor: colors.badgeUrgentBg,
      color: colors.badgeUrgentText,
    },
    statusBadgeCancelled: {
      backgroundColor: colors.badgeStatusBg,
      color: colors.textMuted,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: 4,
    },
    cardMetaText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    urgencyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 2,
    },
    urgencyLabelSpacing: {
      marginLeft: 4,
    },
    cardPhoto: {
      width: "100%",
      height: 160,
      borderRadius: 5,
      marginVertical: 6,
      backgroundColor: colors.border,
    },
    cardDescription: {
      fontSize: 13,
      color: colors.accentText,
    },
    completeButton: {
      backgroundColor: colors.success,
      paddingVertical: 12,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 12,
    },
    completeButtonDisabled: {
      opacity: 0.7,
    },
    completeButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
