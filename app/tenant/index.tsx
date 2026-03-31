import { TenantPaymentHistoryRow } from "@/components/TenantPaymentHistoryRow";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { isPaymentLateStatus, type PaidPaymentRow } from "@/lib/paymentHistoryUtils";
import { supabase } from "@/lib/supabase";
import type { AppThemeColors } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Payment = {
  payment_id: string;
  amount_due: number;
  late_fee: number;
  date_due: string;
  date_paid: string | null;
};

type LandlordPaymentPrefs = {
  methodKey: string | null;
  details: string | null;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  venmo: "Venmo",
  cash_app: "Cash App",
  zelle: "Zelle",
  other: "Other",
};

export default function TenantDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, tenantId } = useAuth();
  const email = session?.user?.email ?? "";
  const [tenantName, setTenantName] = useState("");
  const [hasProperty, setHasProperty] = useState<boolean | null>(null);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [landlordPaymentPrefs, setLandlordPaymentPrefs] = useState<LandlordPaymentPrefs | null>(null);
  const [paymentHistoryPreview, setPaymentHistoryPreview] = useState<PaidPaymentRow[]>([]);
  const [hasMorePaymentHistory, setHasMorePaymentHistory] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const justPaidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset the success state when the due payment changes / refreshes.
    setJustPaid(false);
  }, [currentPayment?.payment_id]);

  useEffect(() => {
    return () => {
      if (justPaidTimer.current) clearTimeout(justPaidTimer.current);
    };
  }, []);

  useEffect(() => {
    async function loadTenantName() {
      if (!session?.user) {
        setTenantName("");
        return;
      }
      try {
        const userId = session.user.id;
        const { data, error } = await supabase
          .from("users")
          .select("name")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) {
          console.warn("Error loading tenant name", error);
          setTenantName("");
          return;
        }
        setTenantName((data?.name as string | null) ?? "");
      } catch (e) {
        console.warn("Error loading tenant name", e);
        setTenantName("");
      }
    }
    loadTenantName();
  }, [session?.user]);

  useEffect(() => {
    async function loadTenantProperty() {
      if (!session?.user) {
        setHasProperty(false);
        return;
      }
      try {
        const userId = session.user.id;
        const { data, error } = await supabase
          .from("tenants")
          .select("property_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) {
          console.warn("Error checking tenant property", error);
          setHasProperty(false);
          return;
        }
        setHasProperty(!!data?.property_id);
      } catch (e) {
        console.warn("Error checking tenant property", e);
        setHasProperty(false);
      }
    }
    loadTenantProperty();
  }, [session?.user]);

  const loadPayment = useCallback(async () => {
    if (!tenantId) {
      setCurrentPayment(null);
      setLandlordPaymentPrefs(null);
      setPaymentHistoryPreview([]);
      setHasMorePaymentHistory(false);
      return;
    }
    setLoadingPayment(true);
    try {
      const [paymentRes, tenantRes, historyRes] = await Promise.all([
        supabase
          .from("payments")
          .select("payment_id, amount_due, late_fee, date_due, date_paid")
          .eq("tenant_id", tenantId)
          .is("date_paid", null)
          .order("date_due", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from("tenants").select("property_id").eq("tenant_id", tenantId).maybeSingle(),
        supabase
          .from("payments")
          .select("payment_id, amount_due, late_fee, date_due, date_paid")
          .eq("tenant_id", tenantId)
          .not("date_paid", "is", null)
          .order("date_paid", { ascending: false })
          .limit(4),
      ]);

      if (paymentRes.error) throw paymentRes.error;
      setCurrentPayment((paymentRes.data as any) ?? null);

      if (!historyRes.error && historyRes.data) {
        const list = historyRes.data as PaidPaymentRow[];
        setHasMorePaymentHistory(list.length > 3);
        setPaymentHistoryPreview(list.slice(0, 3));
      } else {
        if (historyRes.error) console.warn("Payment history preview", historyRes.error);
        setPaymentHistoryPreview([]);
        setHasMorePaymentHistory(false);
      }

      const propertyId = tenantRes.data?.property_id as string | undefined;
      if (!propertyId || tenantRes.error) {
        setLandlordPaymentPrefs({ methodKey: null, details: null });
      } else {
        const { data: prop, error: propError } = await supabase
          .from("properties")
          .select("landlord_id")
          .eq("property_id", propertyId)
          .maybeSingle();
        if (propError || !prop?.landlord_id) {
          setLandlordPaymentPrefs({ methodKey: null, details: null });
        } else {
          const { data: landlord, error: landlordError } = await supabase
            .from("landlords")
            .select("preferred_payment_method, preferred_payment_details")
            .eq("landlord_id", prop.landlord_id)
            .maybeSingle();
          if (landlordError) {
            console.warn("Landlord payment prefs", landlordError);
            setLandlordPaymentPrefs({ methodKey: null, details: null });
          } else {
            setLandlordPaymentPrefs({
              methodKey: (landlord?.preferred_payment_method as string | null) ?? null,
              details: (landlord?.preferred_payment_details as string | null) ?? null,
            });
          }
        }
      }
    } catch {
      setCurrentPayment(null);
      setLandlordPaymentPrefs({ methodKey: null, details: null });
      setPaymentHistoryPreview([]);
      setHasMorePaymentHistory(false);
    } finally {
      setLoadingPayment(false);
    }
  }, [tenantId]);

  // Refetch when this screen gains focus (e.g. after signing lease on Property & Lease — stack keeps index mounted)
  useFocusEffect(
    useCallback(() => {
      loadPayment();
    }, [loadPayment])
  );

  async function handlePayRent() {
    if (!tenantId) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.rpc("pay_rent_and_create_next_payment");
      if (error) {
        const msg = [error.message, (error as { details?: string }).details].filter(Boolean).join("\n");
        throw new Error(msg || "Could not process payment.");
      }
      const payload = data as { ok?: boolean; error?: string } | null;
      if (!payload?.ok) {
        throw new Error(payRentRpcMessage(payload?.error));
      }
      setJustPaid(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore haptics failures
      }
      if (justPaidTimer.current) clearTimeout(justPaidTimer.current);
      justPaidTimer.current = setTimeout(async () => {
        setJustPaid(false);
        await loadPayment();
      }, 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not process payment.";
      Alert.alert("Error", msg);
    } finally {
      setPaying(false);
    }
  }

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
        },
        android: { elevation: 6 },
        default: {},
      }),
    [colors.text]
  );

  if (!session || hasProperty === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentPaymentLate = currentPayment ? isPaymentLateStatus(currentPayment) : false;
  const currentPaymentHasLateFee = currentPayment
    ? Number(currentPayment.late_fee) > 0
    : false;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 22 }]}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>TENANT</Text>
          <TouchableOpacity
            style={styles.heroSettings}
            onPress={() => router.push("/tenant/settings" as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="options-outline" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>
          Welcome{tenantName ? `, ${tenantName}` : email ? `, ${email}` : ""}
        </Text>
        <Text style={styles.heroTagline}>Rent, lease, and maintenance — stay on top of your unit.</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Quick actions</Text>

      {hasProperty && (
        <>
          <View style={[styles.paymentCard, cardShadow]}>
            <Text style={styles.paymentTitle}>Rent</Text>
            {loadingPayment ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                {currentPayment ? (
                  <>
                    <Text
                      style={[
                        styles.paymentAmount,
                        (currentPaymentLate || currentPaymentHasLateFee) && { color: colors.danger },
                      ]}
                    >
                      $
                      {(
                        Number(currentPayment.amount_due) + Number(currentPayment.late_fee || 0)
                      ).toFixed(0)}{" "}
                      total due in{" "}
                      <Text
                        style={{
                          color:
                            daysUntil(currentPayment.date_due) < 5 ? colors.danger : colors.success,
                        }}
                      >
                        {daysUntil(currentPayment.date_due)}
                      </Text>{" "}
                      days
                    </Text>
                    <Text
                      style={[styles.paymentMeta, currentPaymentLate && { color: colors.danger }]}
                    >
                      Due {formatDate(currentPayment.date_due)}
                    </Text>
                    <View style={styles.paymentDivider} />
                    {Number(currentPayment.late_fee) > 0 ? (
                      <Text style={[styles.paymentMeta, { color: colors.danger }]}>
                        Rent ${Number(currentPayment.amount_due).toFixed(0)} + late fee $
                        {Number(currentPayment.late_fee).toFixed(0)}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.paymentMeta}>No payment due right now.</Text>
                )}

                <Text style={styles.howToPayTitle}>How to pay</Text>
                {landlordPaymentPrefs &&
                (landlordPaymentPrefs.methodKey ||
                  (landlordPaymentPrefs.details && landlordPaymentPrefs.details.trim())) ? (
                  <>
                    {landlordPaymentPrefs.methodKey ? (
                      <Text style={styles.howToPayMethod}>
                        {PAYMENT_METHOD_LABELS[landlordPaymentPrefs.methodKey] ??
                          landlordPaymentPrefs.methodKey}
                      </Text>
                    ) : null}
                    {landlordPaymentPrefs.details?.trim() ? (
                      <Text style={styles.howToPayDetails}>
                        {landlordPaymentPrefs.details.trim()}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.paymentMeta}>
                    Your landlord has not added payment instructions yet. Ask them how they would
                    like rent paid.
                  </Text>
                )}
              </>
            )}
          </View>

          {!loadingPayment && currentPayment ? (
            <View style={styles.payOutside}>
              <Text style={styles.payActionLabel}>I paid my rent</Text>
              <View style={styles.payCircleShadow}>
                <TouchableOpacity
                  style={[
                    styles.payCircleShell,
                    justPaid && styles.payCircleSuccess,
                    paying && styles.payCircleDisabled,
                  ]}
                  onPress={handlePayRent}
                  disabled={paying || justPaid}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={justPaid ? "Payment recorded" : "I paid my rent"}
                >
                  {!justPaid ? (
                    <LinearGradient
                      colors={[colors.primary, colors.success]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  {paying ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : justPaid ? (
                    <Ionicons name="checkmark" size={44} color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.payCircleText}>$</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      )}

      {hasProperty && !loadingPayment && (
        <View style={[styles.historyCard, cardShadow]}>
          <Text style={styles.historyTitle}>Payment history</Text>
          {paymentHistoryPreview.length === 0 ? (
            <Text style={styles.paymentMeta}>No completed payments yet.</Text>
          ) : (
            <>
              {paymentHistoryPreview.map((p, i) => (
                <TenantPaymentHistoryRow
                  key={p.payment_id}
                  payment={p}
                  isLast={i === paymentHistoryPreview.length - 1 && !hasMorePaymentHistory}
                />
              ))}
              {hasMorePaymentHistory ? (
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  onPress={() => router.push("/tenant/payment-history" as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.seeMoreText}>See more</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      )}

      <View style={styles.menu}>
        {!hasProperty && (
          <>
            <TouchableOpacity
              style={[styles.menuCard, cardShadow]}
              onPress={() => router.push("/tenant/apply" as any)}
              activeOpacity={0.88}
            >
              <View style={styles.menuCardAccent} />
              <View style={styles.menuCardRow}>
                <View style={styles.menuCardText}>
                  <Text style={styles.menuTitle}>Fill Out Application</Text>
                  <Text style={styles.menuSubtitle}>Start a new rental application.</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.primary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCard, cardShadow]}
              onPress={() => router.push("/tenant/applications" as any)}
              activeOpacity={0.88}
            >
              <View style={styles.menuCardAccent} />
              <View style={styles.menuCardRow}>
                <View style={styles.menuCardText}>
                  <Text style={styles.menuTitle}>View Applications</Text>
                  <Text style={styles.menuSubtitle}>See applications you've submitted.</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[
            hasProperty ? styles.menuCard : styles.menuCardDisabled,
            hasProperty && cardShadow,
          ]}
          activeOpacity={hasProperty ? 0.88 : 1}
          onPress={
            hasProperty ? () => router.push("/tenant/property-info" as any) : undefined
          }
        >
          {hasProperty ? <View style={styles.menuCardAccent} /> : null}
          <View style={styles.menuCardRow}>
            <View style={styles.menuCardText}>
              <Text style={styles.menuTitle}>View Property & Lease Info</Text>
              <Text style={styles.menuSubtitle}>
                See details about the property you are renting and your lease.
              </Text>
            </View>
            {hasProperty ? (
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            hasProperty ? styles.menuCard : styles.menuCardDisabled,
            hasProperty && cardShadow,
          ]}
          activeOpacity={hasProperty ? 0.88 : 1}
          onPress={
            hasProperty
              ? () => router.push("/tenant/maintenance-requests" as any)
              : undefined
          }
        >
          {hasProperty ? <View style={styles.menuCardAccent} /> : null}
          <View style={styles.menuCardRow}>
            <View style={styles.menuCardText}>
              <Text style={styles.menuTitle}>Maintenance Requests</Text>
              <Text style={styles.menuSubtitle}>
                View and submit maintenance issues for your unit.
              </Text>
            </View>
            {hasProperty ? (
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            )}
          </View>
        </TouchableOpacity>

      </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    scrollContent: {
      paddingBottom: 40,
      alignItems: "stretch",
      width: "100%",
    },
    content: {
      paddingHorizontal: 24,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      padding: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 0,
      paddingTop: 22,
      paddingBottom: 22,
      paddingHorizontal: 20,
      marginBottom: 18,
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
      fontSize: 24,
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
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    paymentCard: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderTopWidth: 4,
      borderTopColor: colors.primary,
      marginTop: 4,
      marginBottom: 14,
    },
    paymentTitle: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
      marginBottom: 6,
    },
    paymentAmount: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    paymentMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    paymentDivider: {
      height: 1,
      width: "100%",
      backgroundColor: colors.primary,
      marginTop: 8,
      marginBottom: 8,
      opacity: 0.9,
      borderRadius: 999,
    },
    howToPayTitle: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
    },
    howToPayMethod: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 4,
    },
    howToPayDetails: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    historyCard: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      marginTop: 4,
      marginBottom: 12,
    },
    historyTitle: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
      marginBottom: 8,
    },
    seeMoreButton: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 6,
      alignItems: "flex-start",
    },
    seeMoreText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "600",
    },
    payOutside: {
      marginTop: 14,
      marginBottom: 14,
      alignItems: "center",
    },
    payActionLabel: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 12,
    },
    payCircleShadow: {
      shadowColor: "rgba(0,0,0,0.5)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 8,
    },
    payCircleShell: {
      width: 118,
      height: 118,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    payCircleSuccess: {
      backgroundColor: colors.success,
    },
    payCircleDisabled: {
      opacity: 0.7,
    },
    payCircleText: {
      color: colors.onPrimary,
      fontSize: 52,
      fontWeight: "800",
      lineHeight: 58,
    },
    menu: {
      width: "100%",
      marginTop: 4,
      gap: 12,
    },
    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      overflow: "hidden",
    },
    menuCardAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.primary,
    },
    menuCardRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingRight: 14,
      paddingLeft: 20,
    },
    menuCardText: {
      flex: 1,
    },
    menuCardDisabled: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      opacity: 0.55,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    menuSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function daysUntil(iso: string) {
  try {
    const due = new Date(iso);
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const diff = Math.ceil((end - start) / msPerDay);
    return Math.max(0, diff);
  } catch {
    return 0;
  }
}

function payRentRpcMessage(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "You must be logged in to record a payment.";
    case "tenant_not_linked":
      return "Your tenant profile isn’t linked. Try signing out and back in.";
    case "no_lease":
      return "No lease is linked to your account yet.";
    case "no_rent_amount":
      return "Your lease doesn’t have a rent amount. Ask your landlord to set rent on the lease.";
    case "no_unpaid_payment":
      return "There’s no unpaid rent payment to mark right now.";
    default:
      return code ? `Payment couldn’t be recorded (${code}).` : "Could not process payment.";
  }
}
