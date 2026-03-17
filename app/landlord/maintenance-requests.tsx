import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type MaintenanceRequest = {
  request_id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string | null;
  urgency: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string | null;
  properties?: { name: string } | null;
};

export default function LandlordMaintenanceRequestsScreen() {
  const router = useRouter();
  const { landlordId } = useAuth();
  const [activeTab, setActiveTab] = useState<"uncompleted" | "completed">("uncompleted");
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("property_id")
          .eq("landlord_id", landlordId);
        if (propError) throw propError;
        const propertyIds = (properties ?? []).map((p) => p.property_id);
        if (propertyIds.length === 0) {
          setRequests([]);
          return;
        }

        const { data, error } = await supabase
          .from("maintenance_requests")
          .select(
            `
            request_id, property_id, tenant_id, title, description,
            status, urgency, photo_url, created_at, updated_at,
            properties (name)
          `
          )
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });
        if (error) throw error;

        setRequests((data ?? []) as MaintenanceRequest[]);
      } catch (e) {
        console.error("Error loading maintenance requests", e);
        setRequests([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  useEffect(() => {
    if (landlordId) fetchRequests();
  }, [landlordId, fetchRequests]);

  useFocusEffect(
    useCallback(() => {
      if (landlordId) fetchRequests({ skipFullScreenLoading: true });
    }, [landlordId, fetchRequests])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests({ skipFullScreenLoading: true });
  };

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
    <View style={styles.container}>
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
            tintColor="#6366f1"
          />
        }
      >
        {displayList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySubtitle}>
              {activeTab === "uncompleted"
                ? "No uncompleted maintenance requests."
                : "No completed maintenance requests."}
            </Text>
          </View>
        ) : (
          displayList.map((r) => (
            <TouchableOpacity
              key={r.request_id}
              style={styles.card}
              onPress={() =>
                router.push(`/landlord/maintenance-request-detail?requestId=${r.request_id}` as any)
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    (r.status ?? "").toLowerCase() === "completed" &&
                      styles.statusBadgeCompleted,
                  ]}
                >
                  {(r.status ?? "open").replace("_", " ").toUpperCase()}
                </Text>
              </View>
              {r.properties?.name ? (
                <Text style={styles.cardProperty}>{r.properties.name}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {formatDate(r.created_at)}
                {r.urgency
                  ? ` · ${String(r.urgency).charAt(0).toUpperCase() + String(r.urgency).slice(1)}`
                  : ""}
              </Text>
              {r.photo_url ? (
                <Image source={{ uri: r.photo_url }} style={styles.cardPhoto} />
              ) : null}
              {r.description ? (
                <Text style={styles.cardDescription} numberOfLines={3}>
                  {r.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
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
    borderBottomColor: "#6366f1",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94a3b8",
  },
  tabTextActive: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "#4338ca",
  },
  tabBadgeText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  tabBadgeTextActive: {
    color: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
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
    color: "#e5e7eb",
    flex: 1,
    marginRight: 8,
  },
  cardProperty: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 2,
  },
  statusBadge: {
    fontSize: 11,
    color: "#fefce8",
    backgroundColor: "#f97316",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusBadgeCompleted: {
    backgroundColor: "#22c55e",
    color: "#fff",
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  cardPhoto: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: "#1e293b",
  },
  cardDescription: {
    fontSize: 13,
    color: "#cbd5f5",
  },
});
