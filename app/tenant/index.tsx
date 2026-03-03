import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function TenantDashboard() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome{email ? `, ${email}` : ""}</Text>
      <Text style={styles.subtitle}>Tenant Dashboard</Text>
      <Text style={styles.placeholder}>More options coming soon.</Text>
      <TouchableOpacity style={styles.button} onPress={signOut} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 32,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#475569",
  },
  buttonText: {
    color: "#94a3b8",
    fontSize: 16,
  },
});
