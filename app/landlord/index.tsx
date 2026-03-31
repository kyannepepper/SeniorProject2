import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INCOME_GROWTH_IMAGE = require("../../assets/images/income-growth.png");

function withAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function paidLocalYmd(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function sumCollectedIncome(
  rows: { amount_due: number; late_fee: number; date_paid: string }[],
  ref: Date
): { month: number; year: number } {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, "0");
  const ymPrefix = `${y}-${m}`;
  let month = 0;
  let year = 0;
  for (const p of rows) {
    if (!p.date_paid) continue;
    const ymd = paidLocalYmd(p.date_paid);
    if (!ymd) continue;
    const amt = Number(p.amount_due) + Number(p.late_fee ?? 0);
    if (Number.isNaN(amt)) continue;
    if (ymd.slice(0, 7) === ymPrefix) month += amt;
    if (ymd.slice(0, 4) === String(y)) year += amt;
  }
  return { month, year };
}

export default function LandlordDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, landlordId, isLoading: authLoading } = useAuth();
  const [tenantsWithoutLeaseCount, setTenantsWithoutLeaseCount] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [yearlyIncome, setYearlyIncome] = useState<number | null>(null);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [appCount, setAppCount] = useState(0);
  const [maintenanceOpenCount, setMaintenanceOpenCount] = useState(0);
  const [maintenanceUnassignedCount, setMaintenanceUnassignedCount] = useState(0);
  const [unpaidPaymentCount, setUnpaidPaymentCount] = useState(0);

  const name =
    (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    session?.user?.email ??
    "";

  useEffect(() => {
    async function fetchTenantsWithoutLease() {
      if (!landlordId) return;
      try {
        const { data: properties } = await supabase
          .from("properties")
          .select("property_id")
          .eq("landlord_id", landlordId);
        const propertyIds = (properties ?? []).map((p: { property_id: string }) => p.property_id);
        if (propertyIds.length === 0) {
          setTenantsWithoutLeaseCount(0);
          return;
        }
        const { data: tenants } = await supabase
          .from("tenants")
          .select("tenant_id")
          .in("property_id", propertyIds)
          .is("lease_id", null);
        setTenantsWithoutLeaseCount(tenants?.length ?? 0);
      } catch {
        setTenantsWithoutLeaseCount(0);
      }
    }
    fetchTenantsWithoutLease();
  }, [landlordId]);

  const loadIncome = useCallback(async () => {
    if (authLoading) return;
    if (!landlordId) {
      setMonthlyIncome(null);
      setYearlyIncome(null);
      setLoadingIncome(false);
      return;
    }
    setLoadingIncome(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("amount_due, late_fee, date_paid")
        .not("date_paid", "is", null);
      if (error) throw error;
      const rows = (data ?? []) as {
        amount_due: number;
        late_fee: number;
        date_paid: string;
      }[];
      const { month, year } = sumCollectedIncome(rows, new Date());
      setMonthlyIncome(month);
      setYearlyIncome(year);
    } catch {
      setMonthlyIncome(null);
      setYearlyIncome(null);
    } finally {
      setLoadingIncome(false);
    }
  }, [landlordId, authLoading]);

  const loadQuickCounts = useCallback(async () => {
    if (!landlordId) {
      setAppCount(0);
      setMaintenanceOpenCount(0);
      setMaintenanceUnassignedCount(0);
      setUnpaidPaymentCount(0);
      return;
    }
    try {
      const { data: props } = await supabase
        .from("properties")
        .select("property_id")
        .eq("landlord_id", landlordId);
      const propertyIds = (props ?? []).map((p: { property_id: string }) => p.property_id);
      if (propertyIds.length === 0) {
        setAppCount(0);
        setMaintenanceOpenCount(0);
        setMaintenanceUnassignedCount(0);
        setUnpaidPaymentCount(0);
        return;
      }

      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("tenant_id")
        .in("property_id", propertyIds);
      const tenantIds = (tenantsData ?? []).map((t: { tenant_id: string }) => t.tenant_id);

      const [appsRes, maintRes, unpaidRes] = await Promise.all([
        supabase
          .from("applications")
          .select("application_id", { count: "exact", head: true })
          .in("property_id", propertyIds),
        supabase
          .from("maintenance_requests")
          .select("request_id, status, maintenance_worker_id")
          .in("property_id", propertyIds),
        tenantIds.length > 0
          ? supabase
              .from("payments")
              .select("payment_id", { count: "exact", head: true })
              .in("tenant_id", tenantIds)
              .is("date_paid", null)
          : Promise.resolve({ count: 0 }),
      ]);

      const openMaint = (maintRes.data ?? []).filter(
        (r: { status?: string | null }) => (r.status ?? "").toLowerCase() !== "completed"
      ).length;
      const unassignedMaint = (maintRes.data ?? []).filter(
        (r: { status?: string | null; maintenance_worker_id?: string | null }) =>
          (r.status ?? "").toLowerCase() !== "completed" && !r.maintenance_worker_id
      ).length;

      setAppCount(appsRes.count ?? 0);
      setMaintenanceOpenCount(openMaint);
      setMaintenanceUnassignedCount(unassignedMaint);
      setUnpaidPaymentCount(unpaidRes.count ?? 0);
    } catch {
      setAppCount(0);
      setMaintenanceOpenCount(0);
      setMaintenanceUnassignedCount(0);
      setUnpaidPaymentCount(0);
    }
  }, [landlordId]);

  useFocusEffect(
    useCallback(() => {
      loadIncome();
      loadQuickCounts();
    }, [loadIncome, loadQuickCounts])
  );

  useEffect(() => {
    if (!authLoading) {
      loadIncome();
      loadQuickCounts();
    }
  }, [authLoading, loadIncome, loadQuickCounts]);

  const quickGradient = ["#f472b6", "#a855f7"] as const;

  const items: { label: string; route: string; badgeCount?: number }[] = [
    { label: "Properties", route: "/landlord/properties" },
    { label: "Tenants", route: "/landlord/tenants" },
    { label: "Maintenance Workers", route: "/landlord/maintenance-workers" },
    {
      label: "Maintenance Requests",
      route: "/landlord/maintenance-requests",
      badgeCount: maintenanceUnassignedCount,
    },
    { label: "Leases", route: "/landlord/leases", badgeCount: tenantsWithoutLeaseCount },
    { label: "Applications", route: "/landlord/applications", badgeCount: appCount },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 22 }]}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>LANDLORD</Text>
            <TouchableOpacity
              style={styles.heroSettings}
              onPress={() => router.push("/landlord/settings" as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="options-outline" size={22} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>Welcome{name ? `, ${name}` : ""}</Text>
          <Text style={styles.heroTagline}>Properties, tenants, and rent — in one place.</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.incomeSection}>
            <Text style={styles.incomeTitle}>Income (collected)</Text>
            {loadingIncome ? (
              <ActivityIndicator color={colors.primary} style={styles.incomeSpinner} />
            ) : (
              <View style={styles.incomeRow}>
                <View style={styles.incomeTileWrap}>
                  <View style={styles.incomeBlock}>
                    <Image
                      source={INCOME_GROWTH_IMAGE}
                      style={styles.incomeGraphImage}
                      resizeMode="contain"
                    />
                    <LinearGradient
                      colors={[withAlpha(colors.primary, .8), withAlpha(colors.success, .8)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.incomeGradientOverlay}
                    />
                    <Text style={styles.incomeLabel}>This month</Text>
                    <Text style={styles.incomeValue}>
                      ${(monthlyIncome ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
                <View style={styles.incomeTileWrap}>
                  <View style={styles.incomeBlock}>
                    <Image
                      source={INCOME_GROWTH_IMAGE}
                      style={styles.incomeGraphImage}
                      resizeMode="contain"
                    />
                    <LinearGradient
                      colors={[withAlpha(colors.primary, .8), withAlpha(colors.success, .8)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.incomeGradientOverlay}
                    />
                    <Text style={styles.incomeLabel}>This year</Text>
                    <Text style={styles.incomeValue}>
                      ${(yearlyIncome ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            <Text style={styles.incomeHint}>Based on recorded rent and late fees from all tenants.</Text>
          </View>

          <Text style={styles.sectionLabel}>Quick access</Text>

          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={styles.quickTileWrap}
              onPress={() => router.push("/landlord/applications" as any)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Applications, ${appCount} pending`}
            >
              <View style={styles.quickTileShell}>
                <LinearGradient
                  colors={[...quickGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickTile}
                >
                  <Ionicons name="document-text-outline" size={28} color="#ffffff" />
                </LinearGradient>
                <View style={styles.quickBadge}>
                  <Text style={styles.quickBadgeText}>{appCount > 99 ? "99+" : appCount}</Text>
                </View>
              </View>
              <Text style={styles.quickCaption}>Applications</Text>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTileWrap}
            onPress={() => router.push("/landlord/maintenance-requests" as any)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Maintenance requests, ${maintenanceOpenCount} open`}
          >
            <View style={styles.quickTileShell}>
              <LinearGradient
                colors={[...quickGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickTile}
              >
              <Ionicons name="construct-outline" size={28} color="#ffffff" />
              </LinearGradient>
              <View style={styles.quickBadge}>
                <Text style={styles.quickBadgeText}>
                  {maintenanceOpenCount > 99 ? "99+" : maintenanceOpenCount}
                </Text>
              </View>
            </View>
            <Text style={styles.quickCaption}>Maintenance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTileWrap}
            onPress={() => router.push("/landlord/payments" as any)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Payments, ${unpaidPaymentCount} unpaid`}
          >
            <View style={styles.quickTileShell}>
              <LinearGradient
                colors={[...quickGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickTile}
              >
              <Ionicons name="wallet-outline" size={28} color="#ffffff" />
              </LinearGradient>
              <View style={styles.quickBadge}>
                <Text style={styles.quickBadgeText}>
                  {unpaidPaymentCount > 99 ? "99+" : unpaidPaymentCount}
                </Text>
              </View>
            </View>
            <Text style={styles.quickCaption}>Payments</Text>
          </TouchableOpacity>
        </View>

          <Text style={styles.sectionLabel}>More</Text>

          <View style={styles.cardList}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.card}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.88}
              >
                <View style={styles.cardAccent} />
                {item.badgeCount && item.badgeCount > 0 ? (
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>
                      {item.badgeCount > 99 ? "99+" : item.badgeCount}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.cardBody}>
                  <View style={styles.cardTextCol}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{item.label}</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      View and manage {item.label.toLowerCase()}.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function elevationStyle(colors: AppThemeColors) {
  return Platform.select({
    ios: {
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
    android: {
      elevation: 6,
    },
    default: {},
  });
}

function createStyles(colors: AppThemeColors) {
  const cardLift = elevationStyle(colors);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    scroll: {
      paddingBottom: 36,
    },
    content: {
      paddingHorizontal: 20,
    },
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 0,
      paddingTop: 22,
      paddingBottom: 22,
      paddingHorizontal: 20,
      marginBottom: 20,
      position: "relative",
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryPressed,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: { elevation: 8 },
        default: {},
      }),
    },
    heroLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
      color: colors.onPrimary,
      opacity: 0.85,
      marginBottom: 0,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    heroSettings: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.onPrimary,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    heroTagline: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.onPrimary,
      opacity: 0.92,
      lineHeight: 22,
    },
    incomeSection: {
      marginBottom: 22,
    },
    incomeTitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "700",
      marginBottom: 14,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    incomeSpinner: {
      paddingVertical: 8,
    },
    incomeRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 12,
    },
    incomeTileWrap: {
      flex: 1,
      borderRadius: 5,
      aspectRatio: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.01)", // helps shadows render consistently
      ...Platform.select({
        ios: {
          shadowColor: "rgba(0, 0, 0, 0.96)",
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
        },
        android: { elevation: 2 },
        default: {},
      }),
      overflow: "visible",
    },
    incomeBlock: {
      flex: 1,
      borderRadius: 5,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 12,
      overflow: "hidden",
      position: "relative",
    },
    incomeGraphImage: {
      position: "absolute",
      left: 0,
      top: 12,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      opacity: 1,
      zIndex: 1,
      transform: [],
    },
    incomeLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.onPrimary,
      opacity: 0.92,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      textAlign: "center",
      textShadowColor: "rgba(0,0,0,0.55)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
      zIndex: 2,
    },
    incomeValue: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.onPrimary,
      letterSpacing: -0.5,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
      textAlign: "center",
      zIndex: 2,
    },
    incomeHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 14,
      lineHeight: 16,
    },
    incomeGradientOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      opacity: 1,
      zIndex: 1,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    quickAccessRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 22,
    },
    quickTileWrap: {
      flex: 1,
      alignItems: "center",
      minWidth: 0,
    },
    quickTileShell: {
      width: "100%",
      position: "relative",
      overflow: "visible",
    },
    quickTile: {
      width: "100%",
      height: 76,
      borderRadius: 5,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    quickBadge: {
      position: "absolute",
      top: -8,
      right: -8,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "rgba(0,0,0,0.35)",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.22,
          shadowRadius: 4,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    quickBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#7c3aed",
    },
    quickCaption: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center",
    },
    cardList: {
      gap: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      overflow: "visible",
      borderWidth: 1,
      borderColor: colors.borderStrong,
      ...cardLift,
    },
    cardAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.primary,
    },
    cardBody: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingRight: 14,
      paddingLeft: 20,
    },
    cardTextCol: {
      flex: 1,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    cardBadge: {
      position: "absolute",
      top: -8,
      right: -8,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "rgba(0,0,0,0.35)",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.22,
          shadowRadius: 4,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    cardBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#7c3aed",
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    alertIcon: {
      fontSize: 16,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
