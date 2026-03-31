import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { SearchBar } from "@/components/SearchBar";

type Tenant = {
  tenant_id: string;
  user_id: string | null;
  name: string | null;
  property_name: string | null;
  property_address: string | null;
  lease_signed: boolean | null;
};

export default function LandlordTenantsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTenants = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) return;
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        // Fetch tenants for this landlord, including tenant user info, property, and lease signed status
        const { data, error } = await supabase
          .from("tenants")
          .select(
            "tenant_id, user_id, properties!inner(name,address,landlord_id), leases(signed), users(name)"
          )
          .eq("properties.landlord_id", landlordId)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const mapped: Tenant[] = (data ?? []).map((row: any) => ({
          tenant_id: row.tenant_id,
          user_id: row.user_id ?? null,
          name: row.users?.name ?? null,
          property_name: row.properties?.name ?? null,
          property_address: row.properties?.address ?? null,
          lease_signed: row.leases?.signed ?? null,
        }));

        setTenants(mapped);
      } catch (err) {
        console.error("Error fetching tenants", err);
        setTenants([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  useEffect(() => {
    if (landlordId) fetchTenants();
  }, [landlordId, fetchTenants]);

  useFocusEffect(
    useCallback(() => {
      if (!landlordId) return;
      fetchTenants({ skipFullScreenLoading: true });
    }, [landlordId, fetchTenants])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return tenants;
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const name = (t.name ?? "unlinked tenant").toLowerCase();
      const prop = (t.property_name ?? "").toLowerCase();
      const addr = (t.property_address ?? "").toLowerCase();
      return name.includes(q) || prop.includes(q) || addr.includes(q);
    });
  }, [tenants, search]);

  if (!landlordId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tenants.length > 0 && (
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search tenants or properties..."
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
              fetchTenants({ skipFullScreenLoading: true });
            }}
            tintColor={colors.primary}
          />
        }
      >
        {tenants.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tenants yet</Text>
            <Text style={styles.emptySubtitle}>
              Once you accept applications, tenants for your properties will
              appear here.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySubtitle}>No tenants match your search.</Text>
          </View>
        ) : (
          filtered.map((t) => (
            <TouchableOpacity
              key={t.tenant_id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push(`/landlord/tenants/${t.tenant_id}` as any)}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>{t.name ?? "Unlinked tenant"}</Text>
                <Text style={[styles.badge, t.lease_signed ? styles.badgeSigned : styles.badgeUnsigned]}>
                  {t.lease_signed ? "Lease signed" : "Not signed"}
                </Text>
              </View>
              <Text style={styles.cardProperty}>Property: {t.property_name ?? "—"}</Text>
              {t.property_address ? (
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {t.property_address}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
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
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    searchBar: {
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 8,
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
      textAlign: "center",
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 16,
      marginBottom: 12,
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
      marginBottom: 4,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 4,
    },
    cardProperty: {
      fontSize: 14,
      color: colors.accentText,
      marginTop: 4,
    },
    cardAddress: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    badge: {
      fontSize: 12,
      fontWeight: "600",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      overflow: "hidden",
    },
    badgeSigned: {
      color: colors.success,
      backgroundColor: colors.successBg,
    },
    badgeUnsigned: {
      color: colors.badgeUrgentText,
      backgroundColor: colors.badgeUrgentBg,
    },
  });
}

