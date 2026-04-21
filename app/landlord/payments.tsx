import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { TenantPaymentHistoryRow } from "@/components/TenantPaymentHistoryRow";
import { isPaymentLateStatus, type PaidPaymentRow } from "@/lib/paymentHistoryUtils";

type PaymentRow = {
  payment_id: string;
  tenant_id: string;
  amount_due: number;
  late_fee: number;
  date_due: string;
  date_paid: string | null;
  tenant_name: string;
};

function formatDue(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function LandlordPaymentsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { landlordId } = useAuth();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const markPaymentsHubViewed = useCallback(async () => {
    if (!landlordId) return;
    const { error } = await supabase
      .from("landlords")
      .update({ last_viewed_payments_at: new Date().toISOString() })
      .eq("landlord_id", landlordId);
    if (error) console.warn("markPaymentsHubViewed", error);
  }, [landlordId]);

  const load = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!landlordId) {
        setRows([]);
        setLoading(false);
        return;
      }
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("property_id")
          .eq("landlord_id", landlordId);
        if (propError) throw propError;
        const propertyIds = (properties ?? []).map((p: { property_id: string }) => p.property_id);
        if (propertyIds.length === 0) {
          setRows([]);
          return;
        }

        const { data: tenantRows, error: tenantError } = await supabase
          .from("tenants")
          .select("tenant_id, user_id")
          .in("property_id", propertyIds);
        if (tenantError) throw tenantError;
        const tenantIds = (tenantRows ?? []).map((t: { tenant_id: string }) => t.tenant_id);
        if (tenantIds.length === 0) {
          setRows([]);
          return;
        }

        const userIds = [
          ...new Set(
            (tenantRows ?? [])
              .map((t: { user_id?: string }) => t.user_id)
              .filter(Boolean) as string[]
          ),
        ];
        let userNames: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase.from("users").select("user_id, name").in("user_id", userIds);
          userNames = Object.fromEntries(
            (users ?? []).map((u: { user_id: string; name: string }) => [u.user_id, u.name ?? "Tenant"])
          );
        }
        const tenantNameById = Object.fromEntries(
          (tenantRows ?? []).map((t: { tenant_id: string; user_id?: string }) => [
            t.tenant_id,
            userNames[t.user_id ?? ""] ?? "Tenant",
          ])
        );

        const { data: payRows, error: payError } = await supabase
          .from("payments")
          .select("payment_id, tenant_id, amount_due, late_fee, date_due, date_paid")
          .in("tenant_id", tenantIds)
          .order("date_due", { ascending: false });
        if (payError) throw payError;

        const list: PaymentRow[] = (payRows ?? []).map((p: Record<string, unknown>) => ({
          payment_id: p.payment_id as string,
          tenant_id: p.tenant_id as string,
          amount_due: Number(p.amount_due),
          late_fee: Number(p.late_fee ?? 0),
          date_due: p.date_due as string,
          date_paid: (p.date_paid as string | null) ?? null,
          tenant_name: tenantNameById[p.tenant_id as string] ?? "Tenant",
        }));
        setRows(list);
      } catch (e) {
        console.warn("Landlord payments", e);
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [landlordId]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      void markPaymentsHubViewed();
    }, [load, markPaymentsHubViewed])
  );

  const unpaid = useMemo(() => rows.filter((r) => !r.date_paid), [rows]);
  const paid = useMemo(() => rows.filter((r) => r.date_paid), [rows]);

  if (!landlordId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Sign in as a landlord to view payments.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load({ skipFullScreenLoading: true });
          }}
          tintColor={colors.primary}
        />
      }
    >
      {unpaid.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due or unpaid</Text>
          {unpaid.map((p) => {
            const row = {
              payment_id: p.payment_id,
              amount_due: p.amount_due,
              late_fee: p.late_fee,
              date_due: p.date_due,
              date_paid: p.date_paid,
            };
            const showLate =
              isPaymentLateStatus(row) || Number(p.late_fee) > 0;
            return (
              <TouchableOpacity
                key={p.payment_id}
                style={styles.unpaidCard}
                onPress={() => router.push(`/landlord/tenants/${p.tenant_id}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.unpaidCardTop}>
                  <Text style={styles.tenantName}>{p.tenant_name}</Text>
                  {showLate ? <Text style={styles.latePill}>Late</Text> : null}
                </View>
                <Text style={styles.amount}>
                  ${(p.amount_due + p.late_fee).toFixed(0)} due {formatDue(p.date_due)}
                </Text>
                <Text style={styles.hint}>Tap to open tenant</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment history</Text>
        {paid.length === 0 && unpaid.length === 0 ? (
          <Text style={styles.emptyText}>No payment records yet.</Text>
        ) : paid.length === 0 ? (
          <Text style={styles.emptyText}>No completed payments yet.</Text>
        ) : (
          paid.map((p, i) => (
            <TouchableOpacity
              key={p.payment_id}
              onPress={() => router.push(`/landlord/tenants/${p.tenant_id}/payment-history` as any)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.paidTenant}>{p.tenant_name}</Text>
                <TenantPaymentHistoryRow
                  payment={
                    {
                      payment_id: p.payment_id,
                      amount_due: p.amount_due,
                      late_fee: p.late_fee,
                      date_due: p.date_due,
                      date_paid: p.date_paid!,
                    } satisfies PaidPaymentRow
                  }
                  isLast={i === paid.length - 1}
                />
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
      padding: 24,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    unpaidCard: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      ...panelElevation(colors),
    },
    unpaidCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 4,
    },
    tenantName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    latePill: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.danger,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    amount: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
    paidTenant: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 22,
    },
  });
}
