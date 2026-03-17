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
import { supabase } from "@/lib/supabase";

type PropertyForApplication = {
  property_id: string;
  name: string;
  address: string;
  landlord_email: string | null;
  image_url: string | null;
};

export default function TenantApplicationScreen() {
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
          .select("property_id, name, address, image_url")
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
        <ActivityIndicator size="large" color="#6366f1" />
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
      <TextInput
        style={styles.search}
        placeholder="Search by property or landlord..."
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#020617",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginTop: 16,
    marginBottom: 8,
  },
  search: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#f8fafc",
    marginBottom: 12,
  },
  propertyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 8,
    overflow: "hidden",
  },
  propertyCardSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#020617",
  },
  propertyImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#1e293b",
  },
  propertyImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  propertyImagePlaceholderText: {
    color: "#64748b",
    fontSize: 13,
  },
  propertyText: {
    padding: 14,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 14,
    color: "#94a3b8",
  },
  propertyLandlord: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  nextButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

