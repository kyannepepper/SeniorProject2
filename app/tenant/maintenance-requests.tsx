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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type MaintenanceRequest = {
  request_id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string | null;
  urgency: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string | null;
};

const BUCKET = "maintenance-photos";

export default function TenantMaintenanceRequestsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to photos to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  useEffect(() => {
    async function loadTenantAndRequests() {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Find tenant row for this user with a property
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("tenant_id, property_id")
          .eq("user_id", session.user.id)
          .not("property_id", "is", null)
          .maybeSingle();
        if (tenantError) throw tenantError;
        if (!tenant?.tenant_id || !tenant.property_id) {
          setTenantId(null);
          setPropertyId(null);
          setRequests([]);
          setLoading(false);
          return;
        }

        setTenantId(tenant.tenant_id as string);
        setPropertyId(tenant.property_id as string);

        const { data: reqs, error: reqError } = await supabase
          .from("maintenance_requests")
          .select(
            "request_id, property_id, tenant_id, title, description, status, urgency, photo_url, created_at, updated_at"
          )
          .eq("tenant_id", tenant.tenant_id)
          .order("created_at", { ascending: false });
        if (reqError) throw reqError;

        setRequests((reqs ?? []) as MaintenanceRequest[]);
      } catch (e) {
        console.error("Error loading maintenance requests", e);
        Alert.alert("Error", "Could not load maintenance requests.");
        setRequests([]);
      } finally {
        setLoading(false);
      }
    }

    loadTenantAndRequests();
  }, [session?.user?.id]);

  async function handleSubmit() {
    if (!tenantId || !propertyId) {
      Alert.alert(
        "No property linked",
        "We could not find a property linked to your account. Please contact your landlord."
      );
      return;
    }
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a short title for the issue.");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        const ext = photoUri.split(".").pop() ?? "jpg";
        const path = `requests/${tenantId}/${Date.now()}.${ext}`;
        const res = await fetch(photoUri);
        const blob = await res.blob();
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("maintenance_requests")
        .insert({
          tenant_id: tenantId,
          property_id: propertyId,
          title: title.trim(),
          description: description.trim() || null,
          status: "pending",
          urgency,
          photo_url: photoUrl,
        })
        .select(
          "request_id, property_id, tenant_id, title, description, status, urgency, photo_url, created_at, updated_at"
        )
        .single();
      if (error) throw error;

      setRequests((prev) => [data as MaintenanceRequest, ...prev]);
      setTitle("");
      setDescription("");
      setUrgency("medium");
      setPhotoUri(null);
      Alert.alert("Submitted", "Your maintenance request has been submitted.");
    } catch (e) {
      console.error("Error submitting maintenance request", e);
      Alert.alert("Error", "Could not submit maintenance request.");
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  if (!session?.user || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!tenantId || !propertyId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No property linked yet</Text>
        <Text style={styles.emptySubtitle}>
          Once a landlord accepts your application and links you to a property, you can submit
          maintenance requests here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Maintenance Requests</Text>
      <Text style={styles.subtitle}>Describe any issues with your unit.</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Short summary (e.g. 'Leaky faucet in kitchen')"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>Urgency</Text>
      <View style={styles.urgencyRow}>
        {(["low", "medium", "high"] as const).map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.urgencyChip, urgency === u && styles.urgencyChipActive]}
            onPress={() => setUrgency(u)}
            activeOpacity={0.8}
          >
            <Text style={[styles.urgencyChipText, urgency === u && styles.urgencyChipTextActive]}>
              {u === "low" ? "Low" : u === "medium" ? "Medium" : "High"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Photo (optional)</Text>
      <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto} activeOpacity={0.85}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <Text style={styles.photoButtonText}>📷 Add photo</Text>
        )}
      </TouchableOpacity>
      {photoUri ? (
        <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhoto}>
          <Text style={styles.removePhotoText}>Remove photo</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the problem and when you noticed it."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Submit request</Text>
        )}
      </TouchableOpacity>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Your requests</Text>
        {requests.length === 0 ? (
          <Text style={styles.emptySubtitle}>
            You haven't submitted any maintenance requests yet.
          </Text>
        ) : (
          requests.map((r) => (
            <View key={r.request_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.statusBadge}>
                  {(r.status ?? "open").toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
                {formatDate(r.created_at)}
                {r.urgency ? ` · ${(r.urgency as string).charAt(0).toUpperCase() + (r.urgency as string).slice(1)}` : ""}
              </Text>
              {r.photo_url ? (
                <Image source={{ uri: r.photo_url }} style={styles.cardPhoto} />
              ) : null}
              {r.description ? (
                <Text style={styles.cardDescription} numberOfLines={3}>
                  {r.description}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
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
      padding: 24,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
      backgroundColor: colors.bgSecondary,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.accentText,
      marginTop: 16,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      ...panelElevation(colors),
    },
    multiline: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    urgencyRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 4,
    },
    urgencyChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 5,
      backgroundColor: colors.chipBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    urgencyChipActive: {
      backgroundColor: colors.primaryPressed,
      borderColor: colors.accentBorder,
    },
    urgencyChipText: {
      fontSize: 14,
      color: colors.chipText,
    },
    urgencyChipTextActive: {
      color: colors.onPrimary,
      fontWeight: "600",
    },
    photoButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 80,
      ...panelElevation(colors),
    },
    photoButtonText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    photoPreview: {
      width: 80,
      height: 80,
      borderRadius: 5,
    },
    removePhoto: {
      marginTop: 6,
      alignSelf: "flex-start",
    },
    removePhotoText: {
      fontSize: 13,
      color: colors.danger,
    },
    cardPhoto: {
      width: "100%",
      height: 160,
      borderRadius: 5,
      marginVertical: 6,
      backgroundColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 24,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    listSection: {
      marginTop: 32,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      fontSize: 11,
      color: colors.badgeUrgentText,
      backgroundColor: colors.badgeUrgentBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: "hidden",
    },
    cardMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: 13,
      color: colors.accentText,
    },
  });
}

