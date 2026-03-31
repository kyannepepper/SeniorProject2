import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PropertyDetails = {
  property_id: string;
  name: string;
  address: string;
  occupied: boolean;
  rent_amount: number | null;
  image_url: string | null;
};

type LeaseDetails = {
  lease_id: string;
  rent_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  signed: boolean | null;
  lease_details: string | null;
};

export default function TenantPropertyInfoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [lease, setLease] = useState<LeaseDetails | null>(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setProperty(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // First find the tenant row for this user with a property_id (and lease_id if present)
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("property_id, lease_id")
          .eq("user_id", session.user.id)
          .not("property_id", "is", null)
          .maybeSingle();
        if (tenantError) throw tenantError;
        if (!tenant?.property_id) {
          setProperty(null);
          setLease(null);
          setLoading(false);
          return;
        }

        // Then load the property details
        const { data: prop, error: propError } = await supabase
          .from("properties")
          .select("property_id, name, address, occupied, rent_amount, image_url")
          .eq("property_id", tenant.property_id)
          .single();
        if (propError) throw propError;

        setProperty(prop as PropertyDetails);

        // Then load the lease details if this tenant has a lease_id
        if (tenant.lease_id) {
          const { data: leaseRow, error: leaseError } = await supabase
            .from("leases")
            .select("lease_id, rent_amount, start_date, end_date, signed, lease_details")
            .eq("lease_id", tenant.lease_id)
            .maybeSingle();
          if (leaseError) throw leaseError;
          if (leaseRow) {
            setLease(leaseRow as LeaseDetails);
          } else {
            setLease(null);
          }
        } else {
          setLease(null);
        }
      } catch (e) {
        console.error("Error loading tenant property info", e);
        Alert.alert("Error", "Could not load property information.");
        setProperty(null);
        setLease(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session?.user?.id]);

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

  async function handleSignLease() {
    if (!lease) return;
    setSigning(true);
    try {
      const { data, error } = await supabase.rpc("tenant_sign_lease", {
        p_lease_id: lease.lease_id,
      });
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error ?? "Could not sign lease.");
      }

      // Reload lease from DB so UI reflects the persisted value
      const { data: leaseRow, error: leaseError } = await supabase
        .from("leases")
        .select("lease_id, rent_amount, start_date, end_date, signed, lease_details")
        .eq("lease_id", lease.lease_id)
        .maybeSingle();
      if (leaseError) throw leaseError;
      if (leaseRow) {
        setLease(leaseRow as LeaseDetails);
      }
    } catch (e) {
      console.error("Sign lease error:", e);
      const err = e as { message?: string; details?: string };
      const message = err?.message ?? "Could not sign lease.";
      const details = err?.details ? `\n\n${err.details}` : "";
      Alert.alert("Error", message + details);
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No property linked yet</Text>
        <Text style={styles.emptySubtitle}>
          Once a landlord accepts your application, details about your property will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="light" />

      <View style={[styles.heroMedia, { height: 320 + insets.top }]}>
        {property.image_url ? (
          <Image source={{ uri: property.image_url }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroImagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No photo</Text>
          </View>
        )}
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.title}>{property.name}</Text>
        <Text style={styles.address}>{property.address}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, property.occupied ? styles.badgeOccupied : styles.badgeVacant]}>
            <Text style={styles.badgeText}>{property.occupied ? "Occupied" : "Vacant"}</Text>
          </View>
          {property.rent_amount != null && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Rent: ${property.rent_amount.toFixed(0)}/month</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property details</Text>
          <Text style={styles.sectionText}>
            This is the property your landlord has linked to your tenant account.
          </Text>
        </View>

        {lease && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lease</Text>
            <Text style={styles.sectionText}>
              Term: {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
            </Text>
            {lease.rent_amount != null && (
              <Text style={styles.sectionText}>
                Rent: ${Number(lease.rent_amount).toFixed(0)}/month
              </Text>
            )}
            <View style={[styles.leaseBadge, lease.signed && styles.leaseBadgeSigned]}>
              <Text style={styles.leaseBadgeText}>{lease.signed ? "Signed" : "Unsigned"}</Text>
            </View>
            {lease.lease_details && (
              <>
                <View style={styles.leaseDivider} />
                <Text style={styles.leaseDetailsText} selectable>
                  {lease.lease_details}
                </Text>
              </>
            )}
            {!lease.signed && (
              <TouchableOpacity
                style={styles.signButton}
                onPress={handleSignLease}
                disabled={signing}
                activeOpacity={0.85}
              >
                <Text style={styles.signButtonText}>
                  {signing ? "Signing..." : "Sign lease"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    scroll: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    scrollContent: {
      paddingBottom: 40,
      backgroundColor: colors.bgSecondary,
    },
    heroMedia: {
      width: "100%",
      backgroundColor: colors.bgSecondary,
    },
    heroImage: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.surface,
    },
    heroImagePlaceholder: {
      width: "100%",
      height: 320,
      backgroundColor: colors.bgSecondary,
      justifyContent: "center",
      alignItems: "center",
    },
    imagePlaceholderText: {
      color: colors.placeholder,
      fontSize: 14,
    },
    detailsCard: {
      marginTop: -36,
      marginHorizontal: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      padding: 18,
      ...panelElevation(colors),
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    address: {
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: 16,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 20,
    },
    badge: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.chipBg,
    },
    badgeOccupied: {
      backgroundColor: colors.successBg,
    },
    badgeVacant: {
      backgroundColor: colors.badgeUrgentBg,
    },
    badgeText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    section: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    sectionText: {
      fontSize: 14,
      color: colors.accentText,
    },
    leaseBadge: {
      marginTop: 8,
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.chipBg,
    },
    leaseBadgeSigned: {
      backgroundColor: colors.successBg,
    },
    leaseBadgeText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    leaseDivider: {
      marginTop: 20,
      marginBottom: 20,
      height: 1,
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 999,
      opacity: 0.9,
    },
    leaseDetailsText: {
      fontSize: 13,
      color: colors.accentText,
      lineHeight: 20,
    },
    signButton: {
      marginTop: 12,
      backgroundColor: colors.primary,
      borderRadius: 5,
      paddingVertical: 12,
      alignItems: "center",
    },
    signButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
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
  });
}

