import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Application = {
  application_id: string;
  property_id: string;
  name: string;
  email: string;
  phone: string | null;
  move_in_date: string | null;
  description: string | null;
  created_at: string;
  property_name?: string;
  property_address?: string;
};

export default function LandlordApplicationsScreen() {
  const router = useRouter();
  const { landlordId } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchApplications = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("property_id, name, address")
          .eq("landlord_id", landlordId);
        if (propError) throw propError;
        const propertyIds = (properties ?? []).map((p: { property_id: string }) => p.property_id);
        const propertyMap = new Map(
          (properties ?? []).map((p: { property_id: string; name: string; address: string }) => [
            p.property_id,
            { name: p.name, address: p.address },
          ])
        );

        if (propertyIds.length === 0) {
          setApplications([]);
          return;
        }

        const { data: apps, error: appError } = await supabase
          .from("applications")
          .select("application_id, property_id, name, email, phone, move_in_date, description, created_at")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });
        if (appError) throw appError;

        const withProperty = (apps ?? []).map((a: Record<string, unknown>) => {
          const prop = propertyMap.get(a.property_id as string);
          return {
            application_id: a.application_id,
            property_id: a.property_id,
            name: a.name,
            email: a.email,
            phone: a.phone,
            move_in_date: a.move_in_date,
            description: a.description,
            created_at: a.created_at,
            property_name: prop?.name,
            property_address: prop?.address,
          } as Application;
        });
        setApplications(withProperty);
      } catch (err) {
        console.error("Error fetching applications", err);
        setApplications([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  useEffect(() => {
    if (landlordId) fetchApplications();
  }, [landlordId, fetchApplications]);

  useFocusEffect(
    useCallback(() => {
      if (!landlordId) return;
      // Refetch when returning from detail (e.g. after decline/accept) without full-screen loader
      fetchApplications({ skipFullScreenLoading: true });
    }, [landlordId, fetchApplications])
  );

  const filtered = search.trim()
    ? applications.filter(
        (a) =>
          a.name?.toLowerCase().includes(search.trim().toLowerCase()) ||
          a.email?.toLowerCase().includes(search.trim().toLowerCase()) ||
          a.property_name?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : applications;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

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
      {applications.length > 0 && (
        <TextInput
          style={styles.search}
          placeholder="Search by applicant or property..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchApplications({ skipFullScreenLoading: true });
            }}
            tintColor="#6366f1"
          />
        }
      >
        {applications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptySubtitle}>
              Applications for your properties will appear here.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySubtitle}>No applications match your search.</Text>
          </View>
        ) : (
          filtered.map((a) => (
            <TouchableOpacity
              key={a.application_id}
              style={styles.card}
              onPress={() => router.push(`/landlord/application-detail?applicationId=${a.application_id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardName}>{a.name}</Text>
              <Text style={styles.cardEmail}>{a.email}</Text>
              {a.phone ? (
                <Text style={styles.cardMeta}>Phone: {a.phone}</Text>
              ) : null}
              <Text style={styles.cardProperty}>
                Property: {a.property_name ?? "—"} {a.property_address ? ` · ${a.property_address}` : ""}
              </Text>
              <Text style={styles.cardMeta}>Move-in: {formatDate(a.move_in_date)}</Text>
              {a.description ? (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {a.description}
                </Text>
              ) : null}
              <Text style={styles.cardDate}>
                Applied {formatDate(a.created_at)}
              </Text>
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
  search: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 16,
    color: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 4,
  },
  cardEmail: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },
  cardProperty: {
    fontSize: 13,
    color: "#a5b4fc",
    marginTop: 6,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 8,
    fontStyle: "italic",
  },
  cardDate: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
});
