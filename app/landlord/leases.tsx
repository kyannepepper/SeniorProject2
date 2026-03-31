import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type TenantWithLease = {
  tenant_id: string;
  property_id: string;
  lease_id: string | null;
  tenant_name: string;
  property_name: string;
  property_address: string | null;
};

type LeaseRow = {
  lease_id: string;
  property_id: string;
  rent_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  signed: boolean | null;
  tenant_name: string;
  property_name: string;
};

export default function LandlordLeasesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const [tenants, setTenants] = useState<TenantWithLease[]>([]);
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("property_id, name, address")
          .eq("landlord_id", landlordId);
        if (propError) throw propError;
        const propertyIds = (properties ?? []).map((p: { property_id: string }) => p.property_id);
        const propertyMap = new Map(
          (properties ?? []).map(
            (p: { property_id: string; name: string; address: string }) => [
              p.property_id,
              { name: p.name, address: p.address },
            ]
          )
        );

        if (propertyIds.length === 0) {
          setTenants([]);
          setLeases([]);
          return;
        }

        const { data: tenantRows, error: tenantError } = await supabase
          .from("tenants")
          .select("tenant_id, property_id, lease_id, user_id")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });
        if (tenantError) throw tenantError;

        const userIds = [...new Set((tenantRows ?? []).map((t: { user_id?: string }) => t.user_id).filter(Boolean))];
        let userNames: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("user_id, name")
            .in("user_id", userIds);
          userNames = Object.fromEntries(
            (users ?? []).map((u: { user_id: string; name: string }) => [u.user_id, u.name ?? "—"])
          );
        }

        const tenantList: TenantWithLease[] = (tenantRows ?? []).map(
          (t: { tenant_id: string; property_id: string; lease_id: string | null; user_id?: string }) => {
            const prop = propertyMap.get(t.property_id);
            return {
              tenant_id: t.tenant_id,
              property_id: t.property_id,
              lease_id: t.lease_id ?? null,
              tenant_name: userNames[t.user_id ?? ""] ?? "Tenant",
              property_name: prop?.name ?? "—",
              property_address: prop?.address ?? null,
            };
          }
        );
        setTenants(tenantList);

        const { data: leaseRows, error: leaseError } = await supabase
          .from("leases")
          .select("lease_id, property_id, rent_amount, start_date, end_date, signed")
          .eq("landlord_id", landlordId)
          .order("created_at", { ascending: false });
        if (leaseError) throw leaseError;

        const tenantByLease = Object.fromEntries(
          tenantList.filter((t) => t.lease_id).map((t) => [t.lease_id, t])
        );
        const leaseList: LeaseRow[] = (leaseRows ?? []).map(
          (l: { lease_id: string; property_id: string; rent_amount: number | null; start_date: string | null; end_date: string | null; signed: boolean | null }) => {
            const t = tenantByLease[l.lease_id];
            const prop = propertyMap.get(l.property_id);
            return {
              ...l,
              tenant_name: t?.tenant_name ?? "—",
              property_name: prop?.name ?? "—",
            };
          }
        );
        setLeases(leaseList);
      } catch (e) {
        console.error("Error fetching leases/tenants", e);
        setTenants([]);
        setLeases([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  useEffect(() => {
    if (landlordId) fetchData();
  }, [landlordId, fetchData]);

  useFocusEffect(
    useCallback(() => {
      if (landlordId) fetchData({ skipFullScreenLoading: true });
    }, [landlordId, fetchData])
  );

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return d;
    }
  };

  const tenantsWithoutLease = tenants.filter((t) => !t.lease_id);

  if (!landlordId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData({ skipFullScreenLoading: true });
          }}
          tintColor={colors.primary}
        />
      }
    >
      {tenantsWithoutLease.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Need a lease</Text>
          {tenantsWithoutLease.map((t) => (
            <TouchableOpacity
              key={t.tenant_id}
              style={styles.alertCard}
              onPress={() =>
                router.push(`/landlord/add-lease?tenantId=${t.tenant_id}` as any)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.alertTitle}>{t.tenant_name}</Text>
              <Text style={styles.alertSubtitle}>
                You need to create a lease for this tenant.
              </Text>
              <Text style={styles.alertProperty}>{t.property_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leases</Text>
        {leases.length === 0 && tenantsWithoutLease.length === 0 ? (
          <Text style={styles.emptyText}>No leases yet. Accept a tenant application, then create a lease for them above.</Text>
        ) : leases.length === 0 ? (
          <Text style={styles.emptyText}>No leases created yet.</Text>
        ) : (
          leases.map((l) => (
            <TouchableOpacity
              key={l.lease_id}
              style={styles.card}
              onPress={() => router.push(`/landlord/lease-detail?leaseId=${l.lease_id}` as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardTitle}>{l.tenant_name}</Text>
              <Text style={styles.cardProperty}>{l.property_name}</Text>
              <Text style={styles.cardMeta}>
                {formatDate(l.start_date)} – {formatDate(l.end_date)}
              </Text>
              {l.rent_amount != null && (
                <Text style={styles.cardRent}>${Number(l.rent_amount).toFixed(0)}/mo</Text>
              )}
              <View style={[styles.badge, l.signed && styles.badgeSigned]}>
                <Text style={styles.badgeText}>{l.signed ? "Signed" : "Unsigned"}</Text>
              </View>
            </TouchableOpacity>
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
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 12,
    },
    alertCard: {
      backgroundColor: colors.selectedAccentBg,
      borderRadius: 5,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.primaryPressed,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    alertSubtitle: {
      fontSize: 14,
      color: colors.accentText,
      marginTop: 4,
    },
    alertProperty: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...panelElevation(colors),
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    cardProperty: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    cardMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    cardRent: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.accentText,
      marginTop: 4,
    },
    badge: {
      alignSelf: "flex-start",
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 5,
      backgroundColor: colors.borderStrong,
    },
    badgeSigned: {
      backgroundColor: colors.successBg,
    },
    badgeText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },
  });
}
