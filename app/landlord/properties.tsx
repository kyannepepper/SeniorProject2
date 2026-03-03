import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Property = {
  property_id: string;
  landlord_id: string;
  name: string;
  address: string;
  occupied: boolean;
  rent_amount: number | null;
  image_url: string | null;
  created_at: string;
};

export default function LandlordPropertiesScreen() {
  const router = useRouter();
  const { session, landlordId } = useAuth();
  const userId = session?.user?.id ?? null;
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProperties = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!userId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        // Link: properties.landlord_id -> landlords.landlord_id, landlords.user_id = current user
        // Inner join so we only get properties whose landlord belongs to this user
        const { data, error } = await supabase
          .from("properties")
          .select("property_id, landlord_id, name, address, occupied, rent_amount, image_url, created_at, landlords!inner(user_id)")
          .eq("landlords.user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        // data may include nested landlords; we only need the property fields
        setProperties((data ?? []).map((row: Record<string, unknown>) => ({
          property_id: row.property_id,
          landlord_id: row.landlord_id,
          name: row.name,
          address: row.address,
          occupied: row.occupied,
          rent_amount: row.rent_amount,
          image_url: row.image_url,
          created_at: row.created_at,
        })) as Property[]);
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  // Initial load when user is available
  useEffect(() => {
    if (userId) fetchProperties();
  }, [userId, fetchProperties]);

  // Refetch whenever this screen comes into focus (e.g. after adding a property)
  useFocusEffect(
    useCallback(() => {
      if (userId) fetchProperties();
    }, [userId, fetchProperties])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.trim().toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q))
    );
  }, [properties, search]);

  if (!userId) {
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
      {properties.length > 0 && (
        <TextInput
          style={styles.search}
          placeholder="Search properties..."
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
              fetchProperties({ skipFullScreenLoading: true });
            }}
            tintColor="#6366f1"
          />
        }
      >
        {properties.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No properties yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first property to get started.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/landlord/add-property")}
              activeOpacity={0.85}
            >
              <Text style={styles.addButtonText}>Add your first property</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySubtitle}>No properties match your search.</Text>
          </View>
        ) : (
          filtered.map((p) => (
            <TouchableOpacity
              key={p.property_id}
              style={styles.card}
              activeOpacity={0.9}
            >
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Text style={styles.cardImagePlaceholderText}>No photo</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{p.name}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>{p.address}</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.cardRent}>
                    ${p.rent_amount != null ? Number(p.rent_amount).toFixed(0) : "—"}/mo
                  </Text>
                  <Text style={[styles.badge, p.occupied && styles.badgeOccupied]}>
                    {p.occupied ? "Occupied" : "Available"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {properties.length > 0 && (
          <TouchableOpacity
            style={styles.addAnother}
            onPress={() => router.push("/landlord/add-property")}
            activeOpacity={0.85}
          >
            <Text style={styles.addAnotherText}>+ Add another property</Text>
          </TouchableOpacity>
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
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#1e293b",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImagePlaceholderText: {
    color: "#64748b",
    fontSize: 14,
  },
  cardBody: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRent: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a5b4fc",
  },
  badge: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  badgeOccupied: {
    color: "#f59e0b",
  },
  addAnother: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  addAnotherText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "500",
  },
});
