import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function WelcomeScreen() {
  const { session, isLoading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session && userRole) {
      if (userRole === "landlord") router.replace("/landlord");
      else if (userRole === "tenant") router.replace("/tenant");
      else if (userRole === "maintenance") router.replace("/maintenance");
    }
  }, [session, userRole, isLoading, router]);

  // Loading: wait for auth and role
  if (isLoading || (session && userRole === null)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Logged in and redirecting by role
  if (session && userRole) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PropertyFlow</Text>
      <Text style={styles.subtitle}>Micro Property Management</Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/signup")}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 48,
  },
  buttons: {
    width: "100%",
    maxWidth: 320,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#334155",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  outlineButtonText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
  },
});
