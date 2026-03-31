import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { createLandlordPropertyFormStyles } from "@/lib/landlordPropertyFormStyles";
import { supabase } from "@/lib/supabase";

const BUCKET = "property-photos";

export default function EditPropertyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createLandlordPropertyFormStyles(colors), [colors]);
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
    if (rentAmount.trim() && (rent == null || isNaN(rent) || rent < 0)) {
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
        <ActivityIndicator size="large" color={colors.primary} />
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
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>EDIT LISTING</Text>
          <Text style={styles.heroTitle}>Edit property</Text>
          <Text style={styles.heroTagline}>
            Update details or swap the listing photo — changes apply to your portfolio right away.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Property details</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Property name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Main St Unit A"
              placeholderTextColor={colors.placeholder}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Full street address"
              placeholderTextColor={colors.placeholder}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Rent</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Monthly rent (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1200"
              placeholderTextColor={colors.placeholder}
              value={rentAmount}
              onChangeText={setRentAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Photo</Text>
        <View style={styles.photoCard}>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage} activeOpacity={0.85}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <Text style={styles.photoButtonText}>Tap to add or change photo</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

