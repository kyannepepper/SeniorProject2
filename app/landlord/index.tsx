import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function LandlordDashboard() {
  const router = useRouter();
  const { session } = useAuth();

  const email = session?.user?.email ?? "";

  const items = [
    { label: "Properties", route: "/landlord/properties" },
    { label: "Tenants", route: "/landlord/tenants" },
    { label: "Maintenance Workers", route: "/landlord/maintenance-workers" },
    { label: "Maintenance Requests", route: "/landlord/maintenance-requests" },
    { label: "Leases", route: "/landlord/leases" },
    { label: "Applications", route: "/landlord/applications" },
    { label: "Settings", route: "/landlord/settings" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome{email ? `, ${email}` : ""}</Text>
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
            <Text style={styles.cardTitle}>{item.label}</Text>
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
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
});

