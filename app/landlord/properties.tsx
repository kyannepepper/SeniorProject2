import { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PropertyCard } from "@/components/PropertyCard";

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
  const { landlordId } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProperties = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select(
            "property_id, landlord_id, name, address, occupied, rent_amount, image_url, created_at"
          )
          .eq("landlord_id", landlordId)
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
      } catch (err) {
        console.error("Error fetching properties", err);
        setProperties([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  // Initial load when user is available
  useEffect(() => {
    if (landlordId) fetchProperties();
  }, [landlordId, fetchProperties]);

  // Refetch whenever this screen comes into focus (e.g. after adding a property)
  useFocusEffect(
    useCallback(() => {
      if (landlordId) fetchProperties();
    }, [landlordId, fetchProperties])
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
            <PropertyCard
              key={p.property_id}
              name={p.name}
              address={p.address}
              rentAmount={p.rent_amount}
              occupied={p.occupied}
              imageUrl={p.image_url}
              onPress={() => router.push(`/landlord/edit-property?propertyId=${p.property_id}`)}
            />
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
