import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { panelElevation } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { TenantPaymentHistoryRow } from "@/components/TenantPaymentHistoryRow";
import {
  computeLateFeeTarget,
  isPaymentLateStatus,
  type PaidPaymentRow,
  type PaymentRow,
} from "@/lib/paymentHistoryUtils";

function formatPaymentDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

type TenantDetail = {
  tenant_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  property_name: string | null;
  property_address: string | null;
  lease_signed: boolean | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number | null;
};

export default function TenantDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const { landlordId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [lateFeeInput, setLateFeeInput] = useState("");
  const [savingLateFee, setSavingLateFee] = useState(false);
  const [editingLateFee, setEditingLateFee] = useState(false);

  const lateFeeTarget = useMemo(() => computeLateFeeTarget(allPayments), [allPayments]);

  const lateFeeTargetRow = useMemo(() => {
    if (!lateFeeTarget) return null;
    return allPayments.find((p) => p.payment_id === lateFeeTarget.paymentId) ?? null;
  }, [lateFeeTarget, allPayments]);

  const hasLateFeeSaved = Boolean(
    lateFeeTargetRow && Number(lateFeeTargetRow.late_fee) > 0
  );

  const lateFeeTargetIsLate = Boolean(lateFeeTargetRow && isPaymentLateStatus(lateFeeTargetRow));
  const lateFeeAmountPositive = Boolean(
    lateFeeTargetRow && Number(lateFeeTargetRow.late_fee) > 0
  );

  const paidSorted = useMemo(() => {
    const paid = allPayments.filter((p) => p.date_paid);
    return [...paid].sort(
      (a, b) => new Date(b.date_paid!).getTime() - new Date(a.date_paid!).getTime()
    );
  }, [allPayments]);

  const paymentPreview = paidSorted.slice(0, 3);
  const hasMorePayments = paidSorted.length > 3;

  useEffect(() => {
    if (!lateFeeTarget) {
      setLateFeeInput("");
      return;
    }
    const row = allPayments.find((p) => p.payment_id === lateFeeTarget.paymentId);
    if (row != null) {
      const v = Number(row.late_fee);
      setLateFeeInput(v > 0 ? String(v) : "");
    }
  }, [lateFeeTarget?.paymentId, allPayments]);

  useEffect(() => {
    setEditingLateFee(false);
  }, [lateFeeTarget?.paymentId]);

  useLayoutEffect(() => {
    const t = detail?.user_name?.trim();
    navigation.setOptions({
      title: t && t.length > 0 ? t : "Tenant",
    });
  }, [navigation, detail?.user_name]);

  const loadDetail = useCallback(async () => {
    if (!tenantId || !landlordId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select(
          "tenant_id, user_id, properties!inner(name,address,landlord_id), leases(signed,start_date,end_date,rent_amount), users(name,email,phone)"
        )
        .eq("tenant_id", tenantId)
        .eq("properties.landlord_id", landlordId)
        .single();
      if (error) throw error;

      const row = data as {
        tenant_id: string;
        user_id: string | null;
        users?: { name?: string | null; email?: string | null; phone?: string | null } | null;
        properties?: { name?: string | null; address?: string | null } | null;
        leases?: {
          signed?: boolean | null;
          start_date?: string | null;
          end_date?: string | null;
          rent_amount?: number | null;
        } | null;
      };

      setDetail({
        tenant_id: row.tenant_id,
        user_id: row.user_id ?? null,
        user_name: row.users?.name ?? null,
        user_email: row.users?.email ?? null,
        user_phone: row.users?.phone ?? null,
        property_name: row.properties?.name ?? null,
        property_address: row.properties?.address ?? null,
        lease_signed: row.leases?.signed ?? null,
        lease_start: row.leases?.start_date ?? null,
        lease_end: row.leases?.end_date ?? null,
        rent_amount: row.leases?.rent_amount ?? null,
      });
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, landlordId]);

  const loadPayments = useCallback(async () => {
    if (!tenantId || !landlordId) {
      setAllPayments([]);
      setLoadingPayments(false);
      return;
    }
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("payment_id, amount_due, late_fee, date_due, date_paid")
        .eq("tenant_id", tenantId)
        .order("date_due", { ascending: true });
      if (error) throw error;
      setAllPayments((data as PaymentRow[]) ?? []);
    } catch (e) {
      console.warn("Tenant payments load failed", e);
      setAllPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [tenantId, landlordId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments])
  );

  async function handleSaveLateFee() {
    if (!tenantId || !lateFeeTarget) return;
    const n = Number(lateFeeInput.replace(/[^0-9.]/g, ""));
    if (lateFeeInput.trim() !== "" && (Number.isNaN(n) || n < 0)) {
      Alert.alert("Invalid amount", "Enter a valid late fee (0 or more).");
      return;
    }
    const amount = lateFeeInput.trim() === "" ? 0 : n;
    setSavingLateFee(true);
    try {
      const { data, error } = await supabase.rpc("landlord_set_late_fee", {
        p_tenant_id: tenantId,
        p_payment_id: lateFeeTarget.paymentId,
        p_late_fee: amount,
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; error?: string } | null;
      if (!payload?.ok) {
        throw new Error(payload?.error ?? "Could not save late fee.");
      }
      Alert.alert("Saved", "Late fee updated.");
      setEditingLateFee(false);
      await loadPayments();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save late fee.";
      Alert.alert("Error", msg);
    } finally {
      setSavingLateFee(false);
    }
  }

  if (!landlordId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Tenant not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.name}>{detail.user_name ?? "Unlinked tenant"}</Text>
      <Text style={styles.sectionTitle}>Property</Text>
      <Text style={styles.value}>{detail.property_name ?? "—"}</Text>
      {detail.property_address ? <Text style={styles.muted}>{detail.property_address}</Text> : null}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Lease</Text>
      <Text style={styles.value}>Status: {detail.lease_signed ? "Signed" : "Not signed"}</Text>
      <Text style={styles.muted}>
        Start: {detail.lease_start ?? "—"} End: {detail.lease_end ?? "—"}
      </Text>
      <Text style={styles.muted}>
        Rent: {detail.rent_amount != null ? `$${Number(detail.rent_amount).toFixed(0)}/mo` : "—"}
      </Text>

      <View style={styles.divider} />

      {loadingPayments ? (
        <ActivityIndicator color={colors.primary} style={styles.paymentsSpinner} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Late fee</Text>
          {lateFeeTarget && lateFeeTargetRow ? (
            <View style={styles.lateFeeBox}>
              <Text style={styles.lateFeeHint}>{lateFeeTarget.detail}</Text>

              {hasLateFeeSaved && !editingLateFee ? (
                <>
                  <View style={styles.lateFeeSummary}>
                    <Text style={[styles.summaryLine, lateFeeTargetIsLate && styles.summaryLineWarn]}>
                      Due {formatPaymentDate(lateFeeTargetRow.date_due)}
                      {lateFeeTargetRow.date_paid
                        ? ` · Paid ${formatPaymentDate(lateFeeTargetRow.date_paid)}`
                        : " · Unpaid"}
                    </Text>
                    <Text style={[styles.summaryLine, lateFeeTargetIsLate && styles.summaryLineWarn]}>
                      Rent: ${Number(lateFeeTargetRow.amount_due).toFixed(0)}
                    </Text>
                    <Text
                      style={[styles.summaryLine, lateFeeAmountPositive && styles.summaryLineWarn]}
                    >
                      Late fee: ${Number(lateFeeTargetRow.late_fee).toFixed(0)}
                    </Text>
                    <Text
                      style={[
                        styles.summaryTotal,
                        (lateFeeTargetIsLate || lateFeeAmountPositive) && styles.summaryTotalWarn,
                      ]}
                    >
                      Total for this period: $
                      {(
                        Number(lateFeeTargetRow.amount_due) + Number(lateFeeTargetRow.late_fee)
                      ).toFixed(0)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editLateFeeBtn}
                    onPress={() => setEditingLateFee(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.editLateFeeText}>Edit late fee</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.muted}>
                    {lateFeeTarget.mode === "overdue_unpaid"
                      ? "Apply a late fee to this unpaid period."
                      : "Apply a late fee to the next unpaid period (per your policy)."}
                  </Text>
                  <Text style={styles.inputLabel}>Late fee amount ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={lateFeeInput}
                    onChangeText={setLateFeeInput}
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                  />
                  <View
                    style={[
                      styles.lateFeeActions,
                      hasLateFeeSaved && editingLateFee && styles.lateFeeActionsRow,
                    ]}
                  >
                    {hasLateFeeSaved && editingLateFee ? (
                      <TouchableOpacity
                        style={styles.cancelLateFeeBtn}
                        onPress={() => {
                          setEditingLateFee(false);
                          const v = Number(lateFeeTargetRow.late_fee);
                          setLateFeeInput(v > 0 ? String(v) : "");
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cancelLateFeeText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.saveLateFeeBtn,
                        savingLateFee && styles.saveLateFeeBtnDisabled,
                        hasLateFeeSaved && editingLateFee && styles.saveLateFeeBtnRow,
                      ]}
                      onPress={handleSaveLateFee}
                      disabled={savingLateFee}
                      activeOpacity={0.85}
                    >
                      {savingLateFee ? (
                        <ActivityIndicator color={colors.onPrimary} />
                      ) : (
                        <Text style={styles.saveLateFeeText}>
                          {hasLateFeeSaved && editingLateFee ? "Save changes" : "Save late fee"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : (
            <Text style={styles.muted}>
              No late fee action needed right now (nothing overdue and unpaid, and no recent late
              payment waiting for a fee on the next period).
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Payment history</Text>
          {paymentPreview.length === 0 ? (
            <Text style={styles.muted}>No completed payments yet.</Text>
          ) : (
            <View style={styles.historyBox}>
              {paymentPreview.map((p, i) => (
                <TenantPaymentHistoryRow
                  key={p.payment_id}
                  payment={{ ...p, date_paid: p.date_paid! } as PaidPaymentRow}
                  isLast={i === paymentPreview.length - 1 && !hasMorePayments}
                />
              ))}
              {hasMorePayments ? (
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  onPress={() => router.push(`/landlord/tenants/${tenantId}/payment-history` as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.seeMoreText}>View more</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </>
      )}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Contact</Text>
      <Text style={styles.value}>Email: {detail.user_email ?? "—"}</Text>
      <Text style={styles.value}>Phone: {detail.user_phone ?? "—"}</Text>
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
      padding: 20,
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgSecondary,
      padding: 20,
    },
    name: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
      marginBottom: 6,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    value: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    muted: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 16,
    },
    paymentsSpinner: {
      marginVertical: 12,
    },
    lateFeeBox: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      padding: 14,
      ...panelElevation(colors),
    },
    lateFeeHint: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    lateFeeSummary: {
      marginTop: 4,
      marginBottom: 12,
    },
    summaryLine: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    summaryLineWarn: {
      color: colors.danger,
    },
    summaryTotal: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginTop: 8,
    },
    summaryTotalWarn: {
      color: colors.danger,
    },
    editLateFeeBtn: {
      borderWidth: 1,
      borderColor: colors.accentBorder,
      paddingVertical: 12,
      borderRadius: 5,
      alignItems: "center",
    },
    editLateFeeText: {
      color: colors.accentText,
      fontSize: 15,
      fontWeight: "600",
    },
    lateFeeActions: {
      marginTop: 14,
    },
    lateFeeActionsRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "stretch",
    },
    cancelLateFeeBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.outlineBorder,
      paddingVertical: 14,
      borderRadius: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelLateFeeText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
    inputLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 10,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.text,
      ...panelElevation(colors),
    },
    saveLateFeeBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 14,
    },
    saveLateFeeBtnRow: {
      flex: 1,
      marginTop: 0,
    },
    saveLateFeeBtnDisabled: {
      opacity: 0.7,
    },
    saveLateFeeText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    historyBox: {
      backgroundColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 8,
      ...panelElevation(colors),
    },
    seeMoreButton: {
      marginTop: 8,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.accentBorder,
    },
    seeMoreText: {
      color: colors.accentText,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
