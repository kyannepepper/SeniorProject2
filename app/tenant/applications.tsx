import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
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

export default function TenantApplicationsScreen() {
  const { session } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setApplications([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Get applications created by this user
        const { data: apps, error: appError } = await supabase
          .from("applications")
          .select(
            "application_id, property_id, name, email, phone, move_in_date, description, created_at"
          )
          .eq("applicant_user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (appError) throw appError;

        const propertyIds = (apps ?? []).map((a) => a.property_id);

        let propertyMap = new Map<string, { name: string; address: string }>();
        if (propertyIds.length > 0) {
          const { data: props, error: propError } = await supabase
            .from("properties")
            .select("property_id, name, address")
            .in("property_id", propertyIds);
          if (propError) throw propError;
          propertyMap = new Map(
            (props ?? []).map((p) => [
              p.property_id as string,
              { name: p.name as string, address: p.address as string },
            ])
          );
        }

        const withProperty: Application[] = (apps ?? []).map((a) => {
          const prop = propertyMap.get(a.property_id);
          return {
            ...a,
            property_name: prop?.name,
            property_address: prop?.address,
          };
        });

        setApplications(withProperty);
      } catch (e) {
        console.error("Error loading tenant applications", e);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session?.user?.id]);

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

  if (!session?.user || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {applications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptySubtitle}>
              When you submit applications, they will appear here.
            </Text>
          </View>
        ) : (
          applications.map((a) => (
            <View key={a.application_id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {a.property_name ?? "Application"}
              </Text>
              {a.property_address ? (
                <Text style={styles.cardAddress}>{a.property_address}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                Submitted {formatDate(a.created_at)}
              </Text>
              <Text style={styles.cardMeta}>
                Desired move-in: {formatDate(a.move_in_date)}
              </Text>
              {a.description ? (
                <Text style={styles.cardDescription} numberOfLines={3}>
                  {a.description}
                </Text>
              ) : null}
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
  cardAddress: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: "#cbd5f5",
    marginTop: 8,
  },
});

