import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Reference = {
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
};

export default function ApplicationDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const { applicationId } = useLocalSearchParams<{ applicationId?: string }>();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [application, setApplication] = useState<{
    application_id: string;
    property_id: string;
    applicant_user_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    move_in_date: string | null;
    description: string | null;
    created_at: string;
    property_name: string;
    property_address: string;
  } | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);

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

  useEffect(() => {
    async function load() {
      if (!applicationId || !landlordId) return;
      setLoading(true);
      try {
        const { data: app, error: appError } = await supabase
          .from("applications")
          .select("application_id, property_id, applicant_user_id, name, email, phone, move_in_date, description, created_at")
          .eq("application_id", applicationId)
          .single();
        if (appError || !app) {
          Alert.alert("Error", "Application not found.");
          router.back();
          return;
        }

        const { data: prop, error: propError } = await supabase
          .from("properties")
          .select("name, address, landlord_id")
          .eq("property_id", app.property_id)
          .single();
        if (propError || !prop || (prop as { landlord_id: string }).landlord_id !== landlordId) {
          Alert.alert("Error", "You don't have access to this application.");
          router.back();
          return;
        }

        setApplication({
          ...app,
          property_name: (prop as { name: string }).name,
          property_address: (prop as { address: string }).address,
        } as typeof application);

        const { data: refs, error: refError } = await supabase
          .from("applicant_references")
          .select("name, phone, email, relationship")
          .eq("application_id", applicationId);
        if (!refError && refs) {
          setReferences(refs as Reference[]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load application.";
        Alert.alert("Error", msg);
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applicationId, landlordId, router]);

  async function handleDecline() {
    if (!applicationId || !landlordId) return;
    Alert.alert(
      "Decline application",
      "This will permanently delete the application. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await supabase.from("applicant_references").delete().eq("application_id", applicationId);
              const { error } = await supabase.from("applications").delete().eq("application_id", applicationId);
              if (error) throw error;
              router.back();
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Could not decline.";
              Alert.alert("Error", msg);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function handleAccept() {
    if (!application || !landlordId) return;
    setBusy(true);
    try {
      if (!application.applicant_user_id) {
        throw new Error(
          "This application is not linked to a tenant account. Please ask the applicant to submit the application while logged in."
        );
      }

      // Update existing tenant for this user, or create one if it does not exist
      const { data: existingTenant, error: fetchTenantError } = await supabase
        .from("tenants")
        .select("tenant_id")
        .eq("user_id", application.applicant_user_id)
        .maybeSingle();
      if (fetchTenantError) throw fetchTenantError;

      let tid: string | null = existingTenant?.tenant_id ?? null;

      if (tid) {
        const { error: updateError } = await supabase
          .from("tenants")
          .update({ property_id: application.property_id })
          .eq("tenant_id", tid);
        if (updateError) throw updateError;
      } else {
        const { data: newTenant, error: tenantError } = await supabase
          .from("tenants")
          .insert({ property_id: application.property_id, user_id: application.applicant_user_id })
          .select("tenant_id")
          .single();
        if (tenantError) throw tenantError;
        tid = (newTenant as { tenant_id: string })?.tenant_id ?? null;
      }

      if (!tid) throw new Error("No tenant ID returned.");

      // Mark the property as occupied now that a tenant has been created
      const { error: propUpdateError } = await supabase
        .from("properties")
        .update({ occupied: true })
        .eq("property_id", application.property_id);
      if (propUpdateError) throw propUpdateError;

      await supabase.from("applicant_references").delete().eq("application_id", application.application_id);
      const { error: delError } = await supabase.from("applications").delete().eq("application_id", application.application_id);
      if (delError) throw delError;

      router.replace(`/landlord/add-lease?tenantId=${encodeURIComponent(tid)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not accept application.";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  }

  if (!applicationId || !landlordId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionTitle}>Applicant</Text>
      <Text style={styles.label}>Name</Text>
      <Text style={styles.value}>{application.name}</Text>
      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{application.email}</Text>
      {application.phone ? (
        <>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{application.phone}</Text>
        </>
      ) : null}
      <Text style={styles.label}>Desired move-in date</Text>
      <Text style={styles.value}>{formatDate(application.move_in_date)}</Text>
      {application.description ? (
        <>
          <Text style={styles.label}>Message to landlord</Text>
          <Text style={styles.valueBlock}>{application.description}</Text>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Property</Text>
      <Text style={styles.value}>{application.property_name}</Text>
      <Text style={styles.valueSecondary}>{application.property_address}</Text>

      {references.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>References</Text>
          {references.map((r, i) => (
            <View key={i} style={styles.refCard}>
              <Text style={styles.refName}>{r.name}</Text>
              {r.phone ? <Text style={styles.refMeta}>{r.phone}</Text> : null}
              {r.email ? <Text style={styles.refMeta}>{r.email}</Text> : null}
              {r.relationship ? <Text style={styles.refMeta}>{r.relationship}</Text> : null}
            </View>
          ))}
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.acceptButton, busy && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.acceptButtonText}>Accept</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineButton, busy && styles.buttonDisabled]}
          onPress={handleDecline}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
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
    scroll: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 24,
      marginBottom: 8,
    },
    label: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 12,
      marginBottom: 2,
    },
    value: {
      fontSize: 16,
      color: colors.text,
    },
    valueSecondary: {
      fontSize: 14,
      color: colors.textMuted,
    },
    valueBlock: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    refCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    refName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    refMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    actions: {
      marginTop: 32,
      gap: 12,
    },
    acceptButton: {
      backgroundColor: colors.success,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
    },
    acceptButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    declineButton: {
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.danger,
    },
    declineButtonText: {
      color: colors.danger,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
