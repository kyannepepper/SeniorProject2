import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId, isLoading } = useAuth();
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!landlordId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Landlord profile not found</Text>
        <Text style={styles.emptySubtitle}>
          This account doesn’t have a landlord record yet. Create a landlord account from the app’s
          signup flow, then log in again.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {properties.length > 0 && (
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search properties..."
          containerStyle={styles.searchBar}
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
            tintColor={colors.primary}
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

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
    },
    searchBar: {
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 8,
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
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: 24,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 5,
    },
    addButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    addAnother: {
      marginTop: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 999,
      borderStyle: "dashed",
    },
    addAnotherText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
  });
}
