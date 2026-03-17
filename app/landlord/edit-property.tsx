import { useEffect, useState } from "react";
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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const BUCKET = "property-photos";

export default function EditPropertyScreen() {
  const router = useRouter();
  const { landlordId } = useAuth();
  const { propertyId } = useLocalSearchParams<{ propertyId?: string }>();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [occupied, setOccupied] = useState(false);
  const [rentAmount, setRentAmount] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProperty() {
      if (!propertyId || !landlordId) return;
      const { data, error } = await supabase
        .from("properties")
        .select("name, address, occupied, rent_amount, image_url")
        .eq("property_id", propertyId)
        .eq("landlord_id", landlordId)
        .single();
      if (error || !data) {
        Alert.alert("Error", "Could not load property.");
        router.back();
        return;
      }
      setName((data.name as string) ?? "");
      setAddress((data.address as string) ?? "");
      setOccupied(Boolean(data.occupied));
      setRentAmount(
        data.rent_amount != null ? String(Number(data.rent_amount).toFixed(0)) : ""
      );
      setImageUri((data.image_url as string) ?? null);
      setInitialImageUrl((data.image_url as string) ?? null);
      setLoading(false);
    }
    loadProperty();
  }, [propertyId, landlordId, router]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to update the image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function uploadImage(base64: string, path: string): Promise<string> {
    const buffer = decode(base64);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function handleSave() {
    if (!landlordId || !propertyId) return;
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName || !trimmedAddress) {
      Alert.alert("Missing fields", "Please enter property name and address.");
      return;
    }
    const rent = rentAmount.trim() ? parseFloat(rentAmount.replace(/[^0-9.]/g, "")) : null;
    if (rentAmount.trim() && (isNaN(rent) || rent < 0)) {
      Alert.alert("Invalid rent", "Please enter a valid rent amount.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl: string | null = initialImageUrl;
      if (imageUri && imageBase64) {
        const path = `${landlordId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        imageUrl = await uploadImage(imageBase64, path);
      }

      const { error } = await supabase
        .from("properties")
        .update({
          name: trimmedName,
          address: trimmedAddress,
          occupied,
          rent_amount: rent,
          image_url: imageUrl,
        })
        .eq("property_id", propertyId)
        .eq("landlord_id", landlordId);

      if (error) throw error;
      router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not update property.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }

  if (!landlordId || !propertyId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Property name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123 Main St Unit A"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Full street address"
          placeholderTextColor="#64748b"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Rent amount (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1200"
          placeholderTextColor="#64748b"
          value={rentAmount}
          onChangeText={setRentAmount}
          keyboardType="decimal-pad"
        />

        <View style={styles.row}>
          <Text style={styles.label}>Occupied</Text>
          <Switch
            value={occupied}
            onValueChange={setOccupied}
            trackColor={{ false: "#334155", true: "#6366f1" }}
            thumbColor="#f8fafc"
          />
        </View>

        <Text style={styles.label}>Photo (optional)</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage} activeOpacity={0.85}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.photoButtonText}>Tap to change photo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#e2e8f0",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#f8fafc",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  photoButton: {
    width: "100%",
    height: 200,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderStyle: "dashed",
    marginTop: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoButtonText: {
    color: "#64748b",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

