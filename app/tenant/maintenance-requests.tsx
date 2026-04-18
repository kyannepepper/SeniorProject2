import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import {
  formatUrgencyLabel,
  getMaintenanceCardBadge,
  urgencySeverityColor,
} from "@/lib/maintenanceRequestDisplay";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MaintenanceRequest = {
  request_id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string | null;
  urgency: string | null;
  photo_url: string | null;
  maintenance_worker_id: string | null;
  created_at: string;
  updated_at: string | null;
};

const BUCKET = "maintenance-photos";

async function readImageUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return await res.arrayBuffer();
  }
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!b64?.length) {
    throw new Error("EMPTY_IMAGE_READ");
  }
  return decode(b64);
}

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
  const [activeTab, setActiveTab] = useState<"create" | "requests">("create");

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
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
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
            "request_id, property_id, tenant_id, title, description, status, urgency, photo_url, maintenance_worker_id, created_at, updated_at"
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
        const path = `requests/${tenantId}/${Date.now()}.jpg`;
        let buffer: ArrayBuffer;
        try {
          buffer = await readImageUriAsArrayBuffer(photoUri);
        } catch {
          Alert.alert(
            "Photo error",
            "Could not read the image from your device. Remove the photo and choose it again."
          );
          setSubmitting(false);
          return;
        }
        if (buffer.byteLength < 64) {
          Alert.alert(
            "Photo error",
            "The image file appears empty. Remove the photo and choose a different one."
          );
          setSubmitting(false);
          return;
        }
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
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
          "request_id, property_id, tenant_id, title, description, status, urgency, photo_url, maintenance_worker_id, created_at, updated_at"
        )
        .single();
      if (error) throw error;

      setRequests((prev) => [data as MaintenanceRequest, ...prev]);
      setTitle("");
      setDescription("");
      setUrgency("medium");
      setPhotoUri(null);
      setActiveTab("requests");
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
    <View style={styles.screen}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "create" && styles.tabActive]}
          onPress={() => setActiveTab("create")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === "create" && styles.tabTextActive]}>
            New request
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.tabActive]}
          onPress={() => setActiveTab("requests")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === "requests" && styles.tabTextActive]}>
            Your requests
          </Text>
          {requests.length > 0 ? (
            <View style={[styles.tabBadge, activeTab === "requests" && styles.tabBadgeActive]}>
              <Text
                style={[styles.tabBadgeText, activeTab === "requests" && styles.tabBadgeTextActive]}
              >
                {requests.length > 99 ? "99+" : requests.length}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {activeTab === "create" ? (
        <ScrollView
          style={styles.tabScroll}
          contentContainerStyle={styles.createScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>Describe any issues with your unit.</Text>

          <Text style={styles.labelFirst}>Title</Text>
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
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.tabScroll}
          contentContainerStyle={styles.listScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {requests.length === 0 ? (
            <View style={styles.listEmpty}>
              <Text style={styles.emptySubtitle}>
                You haven’t submitted any maintenance requests yet. Use the New request tab to
                create one.
              </Text>
            </View>
          ) : (
            requests.map((r) => {
              const badge = getMaintenanceCardBadge(r.status, r.maintenance_worker_id);
              const urgencyColor = urgencySeverityColor(colors, r.urgency);
              return (
              <View key={r.request_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      badge.variant === "completed" && styles.statusBadgeCompleted,
                      badge.variant === "assigned" && styles.statusBadgeAssigned,
                      badge.variant === "pending" && styles.statusBadgePending,
                      badge.variant === "cancelled" && styles.statusBadgeCancelled,
                    ]}
                  >
                    {badge.label}
                  </Text>
                </View>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMetaText}>{formatDate(r.created_at)}</Text>
                  {r.urgency ? (
                    <>
                      <Text style={styles.cardMetaText}> · </Text>
                      <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                      <Text style={[styles.cardMetaText, styles.urgencyLabelSpacing]}>
                        {formatUrgencyLabel(r.urgency)}
                      </Text>
                    </>
                  ) : null}
                </View>
                {r.photo_url ? (
                  <Image source={{ uri: r.photo_url }} style={styles.cardPhoto} />
                ) : null}
                {r.description ? (
                  <Text style={styles.cardDescription} numberOfLines={3}>
                    {r.description}
                  </Text>
                ) : null}
              </View>
            );
            })
          )}
        </ScrollView>
      )}
    </View>
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
    screen: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 16,
      marginBottom: 4,
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 8,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      gap: 6,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.tabIndicator,
    },
    tabText: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.tabInactive,
    },
    tabTextActive: {
      color: colors.tabActive,
      fontWeight: "600",
    },
    tabBadge: {
      backgroundColor: colors.borderStrong,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      minWidth: 22,
      alignItems: "center",
    },
    tabBadgeActive: {
      backgroundColor: colors.primaryPressed,
    },
    tabBadgeText: {
      fontSize: 12,
      color: colors.tabInactive,
      fontWeight: "600",
    },
    tabBadgeTextActive: {
      color: colors.onPrimary,
    },
    tabScroll: {
      flex: 1,
    },
    createScrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    listScrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 16,
    },
    labelFirst: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.accentText,
      marginBottom: 6,
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
    listEmpty: {
      paddingVertical: 32,
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
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: "hidden",
    },
    statusBadgeCompleted: {
      backgroundColor: colors.success,
      color: colors.onPrimary,
    },
    statusBadgeAssigned: {
      backgroundColor: colors.selectedAccentBg,
      color: colors.accentText,
    },
    statusBadgePending: {
      backgroundColor: colors.badgeUrgentBg,
      color: colors.badgeUrgentText,
    },
    statusBadgeCancelled: {
      backgroundColor: colors.badgeStatusBg,
      color: colors.textMuted,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: 4,
    },
    cardMetaText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    urgencyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 2,
    },
    urgencyLabelSpacing: {
      marginLeft: 4,
    },
    cardDescription: {
      fontSize: 13,
      color: colors.accentText,
    },
  });
}

