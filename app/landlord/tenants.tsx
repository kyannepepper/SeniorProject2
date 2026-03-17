import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Tenant = {
  tenant_id: string;
  property_id: string;
  created_at?: string | null;
  property_name?: string;
  property_address?: string;
};

export default function LandlordTenantsScreen() {
  const { landlordId } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTenants = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        // First get all properties for this landlord
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("property_id, name, address")
          .eq("landlord_id", landlordId);
        if (propError) throw propError;

        const propertyIds = (properties ?? []).map(
          (p: { property_id: string }) => p.property_id
        );
        const propertyMap = new Map(
          (properties ?? []).map(
            (p: { property_id: string; name: string; address: string }) => [
              p.property_id,
              { name: p.name, address: p.address },
            ]
          )
        );

        if (propertyIds.length === 0) {
          setTenants([]);
          return;
        }

        // Then fetch tenants whose property_id is in that list
        const { data: tenantRows, error: tenantError } = await supabase
          .from("tenants")
          .select("tenant_id, property_id, created_at")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });
        if (tenantError) throw tenantError;

        const withProperty = (tenantRows ?? []).map(
          (t: { tenant_id: string; property_id: string; created_at?: string }) => {
            const prop = propertyMap.get(t.property_id);
            return {
              tenant_id: t.tenant_id,
              property_id: t.property_id,
              created_at: t.created_at,
              property_name: prop?.name,
              property_address: prop?.address,
            } as Tenant;
          }
        );

        setTenants(withProperty);
      } catch (err) {
        console.error("Error fetching tenants", err);
        setTenants([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  useEffect(() => {
    if (landlordId) fetchTenants();
  }, [landlordId, fetchTenants]);

  useFocusEffect(
    useCallback(() => {
      if (!landlordId) return;
      fetchTenants({ skipFullScreenLoading: true });
    }, [landlordId, fetchTenants])
  );

  const formatDate = (d: string | null | undefined) => {
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

  if (!landlordId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTenants({ skipFullScreenLoading: true });
            }}
            tintColor="#6366f1"
          />
        }
      >
        {tenants.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tenants yet</Text>
            <Text style={styles.emptySubtitle}>
              Once you accept applications, tenants for your properties will
              appear here.
            </Text>
          </View>
        ) : (
          tenants.map((t) => (
            <View key={t.tenant_id} style={styles.card}>
              <Text style={styles.cardTitle}>
                Tenant code: <Text style={styles.code}>{t.tenant_id}</Text>
              </Text>
              <Text style={styles.cardProperty}>
                Property: {t.property_name ?? "—"}
              </Text>
              {t.property_address ? (
                <Text style={styles.cardAddress}>{t.property_address}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                Created {formatDate(t.created_at ?? null)}
              </Text>
            </View>
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
    textAlign: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  code: {
    fontFamily: "monospace",
    color: "#a5b4fc",
  },
  cardProperty: {
    fontSize: 14,
    color: "#c4b5fd",
    marginTop: 4,
  },
  cardAddress: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
});

