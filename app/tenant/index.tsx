import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TenantDashboard() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "";
  const [hasProperty, setHasProperty] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadTenantProperty() {
      if (!session?.user) {
        setHasProperty(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("tenant_id, property_id")
          .eq("user_id", session.user.id)
          .not("property_id", "is", null)
          .maybeSingle();
        if (error) {
          console.warn("Error checking tenant property", error);
          setHasProperty(false);
          return;
        }
        setHasProperty(!!data?.property_id);
      } catch (e) {
        console.warn("Error checking tenant property", e);
        setHasProperty(false);
      }
    }
    loadTenantProperty();
  }, [session?.user]);

  if (!session || hasProperty === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome{email ? `, ${email}` : ""}</Text>
      <Text style={styles.subtitle}>Tenant Dashboard</Text>
      <Text style={styles.placeholder}>What would you like to do?</Text>

      <View style={styles.menu}>
        {!hasProperty && (
          <>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push("/tenant/apply" as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.menuTitle}>Fill Out Application</Text>
              <Text style={styles.menuSubtitle}>Start a new rental application.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push("/tenant/applications" as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.menuTitle}>View Applications</Text>
              <Text style={styles.menuSubtitle}>See applications you've submitted.</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={hasProperty ? styles.menuCard : styles.menuCardDisabled}
          activeOpacity={hasProperty ? 0.85 : 1}
          onPress={
            hasProperty ? () => router.push("/tenant/property-info" as any) : undefined
          }
        >
          <Text style={styles.menuTitle}>View Property & Lease Info</Text>
          <Text style={styles.menuSubtitle}>
            See details about the property you are renting and your lease.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={hasProperty ? styles.menuCard : styles.menuCardDisabled}
          activeOpacity={hasProperty ? 0.85 : 1}
          onPress={
            hasProperty
              ? () => router.push("/tenant/maintenance-requests" as any)
              : undefined
          }
        >
          <Text style={styles.menuTitle}>Maintenance Requests</Text>
          <Text style={styles.menuSubtitle}>
            View and submit maintenance issues for your unit.
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
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
    marginBottom: 16,
    textAlign: "center",
  },
  menu: {
    width: "100%",
    marginTop: 8,
    gap: 12,
  },
  menuCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  menuCardDisabled: {
    backgroundColor: "#020617",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    opacity: 0.6,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
  signOutButton: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#475569",
  },
  signOutText: {
    color: "#94a3b8",
    fontSize: 16,
  },
});
