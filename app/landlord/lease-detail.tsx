import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
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

export default function LeaseDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const { leaseId } = useLocalSearchParams<{ leaseId?: string }>();

  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<{
    lease_id: string;
    property_id: string;
    rent_amount: number | null;
    start_date: string | null;
    end_date: string | null;
    signed: boolean | null;
    lease_details: string | null;
    tenant_name: string;
    property_name: string;
    property_address: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      if (!leaseId || !landlordId) return;
      setLoading(true);
      try {
        const { data: l, error: leaseError } = await supabase
          .from("leases")
          .select("lease_id, property_id, rent_amount, start_date, end_date, signed, lease_details")
          .eq("lease_id", leaseId)
          .eq("landlord_id", landlordId)
          .single();
        if (leaseError || !l) {
          Alert.alert("Error", "Lease not found.");
          router.back();
          return;
        }

        const leaseRow = l as Record<string, unknown>;
        const { data: prop } = await supabase
          .from("properties")
          .select("name, address")
          .eq("property_id", leaseRow.property_id)
          .single();
        const propertyName = (prop as { name?: string } | null)?.name ?? "—";
        const propertyAddress = (prop as { address?: string } | null)?.address ?? null;

        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("user_id")
          .eq("lease_id", leaseId)
          .maybeSingle();
        let tenantName = "—";
        if (tenantRow && (tenantRow as { user_id?: string }).user_id) {
          const { data: user } = await supabase
            .from("users")
            .select("name")
            .eq("user_id", (tenantRow as { user_id: string }).user_id)
            .single();
          tenantName = (user as { name?: string } | null)?.name ?? "—";
        }

        setLease({
          lease_id: leaseRow.lease_id as string,
          property_id: leaseRow.property_id as string,
          rent_amount: leaseRow.rent_amount as number | null,
          start_date: leaseRow.start_date as string | null,
          end_date: leaseRow.end_date as string | null,
          signed: leaseRow.signed as boolean | null,
          lease_details: leaseRow.lease_details as string | null,
          tenant_name: tenantName,
          property_name: propertyName,
          property_address: propertyAddress,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load lease.";
        Alert.alert("Error", msg);
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leaseId, landlordId, router]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lease) return null;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.summary}>
        <Text style={styles.label}>Tenant</Text>
        <Text style={styles.value}>{lease.tenant_name}</Text>

        <Text style={styles.label}>Property</Text>
        <Text style={styles.value}>{lease.property_name}</Text>
        {lease.property_address ? (
          <Text style={styles.valueSub}>{lease.property_address}</Text>
        ) : null}

        <Text style={styles.label}>Term</Text>
        <Text style={styles.value}>
          {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
        </Text>

        {lease.rent_amount != null && (
          <>
            <Text style={styles.label}>Rent</Text>
            <Text style={styles.value}>${Number(lease.rent_amount).toFixed(0)}/mo</Text>
          </>
        )}

        <View style={[styles.badge, lease.signed && styles.badgeSigned]}>
          <Text style={styles.badgeText}>{lease.signed ? "Signed" : "Unsigned"}</Text>
        </View>
      </View>

      {lease.lease_details ? (
        <>
          <Text style={styles.sectionTitle}>Lease details</Text>
          <View style={styles.detailsBlock}>
            <Text style={styles.detailsText} selectable>
              {lease.lease_details}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.noDetails}>No lease details saved for this lease.</Text>
      )}
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
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    summary: {
      marginBottom: 24,
    },
    label: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 14,
      marginBottom: 2,
    },
    value: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    valueSub: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    badge: {
      alignSelf: "flex-start",
      marginTop: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 5,
      backgroundColor: colors.borderStrong,
    },
    badgeSigned: {
      backgroundColor: colors.successBg,
    },
    badgeText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 10,
    },
    detailsBlock: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderRadius: 5,
      padding: 16,
      ...panelElevation(colors),
    },
    detailsText: {
      fontSize: 13,
      color: colors.accentText,
      lineHeight: 20,
    },
    noDetails: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
