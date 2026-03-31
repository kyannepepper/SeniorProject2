import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { SearchBar } from "@/components/SearchBar";

type PropertyForApplication = {
  property_id: string;
  name: string;
  address: string;
  landlord_email: string | null;
  image_url: string | null;
};

export default function TenantApplicationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyForApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadProperties() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          // Only show properties with no tenant linked (tenants.property_id -> properties.property_id)
          .select("property_id, name, address, image_url, tenants(tenant_id)")
          .is("tenants.tenant_id", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setProperties(
          (data ?? []).map((row: any) => ({
            property_id: row.property_id,
            name: row.name,
            address: row.address,
            landlord_email: null,
            image_url: row.image_url ?? null,
          }))
        );
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Could not load properties.";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    }
    loadProperties();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      const inName = p.name?.toLowerCase().includes(q);
      const inAddress = p.address?.toLowerCase().includes(q);
      const inLandlord = p.landlord_email?.toLowerCase().includes(q);
      return inName || inAddress || inLandlord;
    });
  }, [properties, search]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedProperty =
    properties.find((p) => p.property_id === selectedPropertyId) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Fill Out Application</Text>
      <Text style={styles.subtitle}>Step 1: Choose a property.</Text>

      <Text style={styles.sectionTitle}>Select property</Text>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by property or landlord..."
        containerStyle={styles.searchBar}
        inputProps={{ returnKeyType: "search" }}
      />

      {filtered.map((p) => {
        const selected = p.property_id === selectedPropertyId;
        return (
          <TouchableOpacity
            key={p.property_id}
            style={[styles.propertyCard, selected && styles.propertyCardSelected]}
            onPress={() => setSelectedPropertyId(p.property_id)}
            activeOpacity={0.85}
          >
            {p.image_url ? (
              <Image source={{ uri: p.image_url }} style={styles.propertyImage} />
            ) : (
              <View style={styles.propertyImagePlaceholder}>
                <Text style={styles.propertyImagePlaceholderText}>No photo</Text>
              </View>
            )}
            <View style={styles.propertyText}>
              <Text style={styles.propertyName}>{p.name}</Text>
              <Text style={styles.propertyAddress}>{p.address}</Text>
            </View>
            {p.landlord_email && (
              <Text style={styles.propertyLandlord}>{p.landlord_email}</Text>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.nextButton, !selectedPropertyId && styles.submitButtonDisabled]}
        onPress={() =>
          selectedPropertyId &&
          router.push(`/tenant/apply-details?propertyId=${selectedPropertyId}`)
        }
        disabled={!selectedPropertyId}
        activeOpacity={0.85}
      >
        <Text style={styles.submitButtonText}>Next: Your information</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    searchBar: {
      marginBottom: 12,
    },
    propertyCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      marginBottom: 8,
      overflow: "hidden",
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    propertyCardSelected: {
      borderColor: colors.accentBorder,
      backgroundColor: colors.selectedAccentBg,
    },
    propertyImage: {
      width: "100%",
      height: 140,
      backgroundColor: colors.border,
    },
    propertyImagePlaceholder: {
      width: "100%",
      height: 140,
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    propertyImagePlaceholderText: {
      color: colors.placeholder,
      fontSize: 13,
    },
    propertyText: {
      padding: 14,
    },
    propertyName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    propertyAddress: {
      fontSize: 14,
      color: colors.textMuted,
    },
    propertyLandlord: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    nextButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 28,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
}

