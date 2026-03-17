import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function LandlordDashboard() {
  const router = useRouter();
  const { session, landlordId } = useAuth();
  const [tenantsWithoutLeaseCount, setTenantsWithoutLeaseCount] = useState(0);

  const name =
    (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    session?.user?.email ??
    "";

  useEffect(() => {
    async function fetchTenantsWithoutLease() {
      if (!landlordId) return;
      try {
        const { data: properties } = await supabase
          .from("properties")
          .select("property_id")
          .eq("landlord_id", landlordId);
        const propertyIds = (properties ?? []).map((p: { property_id: string }) => p.property_id);
        if (propertyIds.length === 0) {
          setTenantsWithoutLeaseCount(0);
          return;
        }
        const { data: tenants } = await supabase
          .from("tenants")
          .select("tenant_id")
          .in("property_id", propertyIds)
          .is("lease_id", null);
        setTenantsWithoutLeaseCount(tenants?.length ?? 0);
      } catch {
        setTenantsWithoutLeaseCount(0);
      }
    }
    fetchTenantsWithoutLease();
  }, [landlordId]);

  const items: { label: string; route: string; alert?: boolean }[] = [
    { label: "Properties", route: "/landlord/properties" },
    { label: "Tenants", route: "/landlord/tenants" },
    { label: "Maintenance Workers", route: "/landlord/maintenance-workers" },
    { label: "Maintenance Requests", route: "/landlord/maintenance-requests" },
    { label: "Leases", route: "/landlord/leases", alert: tenantsWithoutLeaseCount > 0 },
    { label: "Applications", route: "/landlord/applications" },
    { label: "Settings", route: "/landlord/settings" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome{name ? `, ${name}` : ""}</Text>
        <Text style={styles.subtitle}>Landlord Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.85}
          >
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              {item.alert && <Text style={styles.alertIcon}>⚠️</Text>}
            </View>
            <Text style={styles.cardSubtitle}>View and manage {item.label.toLowerCase()}.</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  alertIcon: {
    fontSize: 16,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
});

