import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { TenantPaymentHistoryRow } from "@/components/TenantPaymentHistoryRow";
import type { PaidPaymentRow } from "@/lib/paymentHistoryUtils";

export default function LandlordTenantPaymentHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const { landlordId } = useAuth();
  const [rows, setRows] = useState<PaidPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenantOk, setTenantOk] = useState(false);

  const load = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!tenantId || !landlordId) {
        setRows([]);
        setTenantOk(false);
        setLoading(false);
        return;
      }
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data: tenantRow, error: tenantError } = await supabase
          .from("tenants")
          .select("tenant_id, properties!inner(landlord_id)")
          .eq("tenant_id", tenantId)
          .eq("properties.landlord_id", landlordId)
          .maybeSingle();

        if (tenantError || !tenantRow) {
          setTenantOk(false);
          setRows([]);
          return;
        }
        setTenantOk(true);

        const { data, error } = await supabase
          .from("payments")
          .select("payment_id, amount_due, late_fee, date_due, date_paid")
          .eq("tenant_id", tenantId)
          .not("date_paid", "is", null)
          .order("date_paid", { ascending: false });
        if (error) throw error;
        setRows((data as PaidPaymentRow[]) ?? []);
      } catch (e) {
        console.warn("Landlord tenant payment history", e);
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantId, landlordId]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!tenantId || !landlordId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Missing tenant or landlord context.</Text>
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

  if (!tenantOk) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Tenant not found or access denied.</Text>
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
      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No completed payments yet.</Text>
      ) : (
        rows.map((p, i) => (
          <TenantPaymentHistoryRow key={p.payment_id} payment={p} isLast={i === rows.length - 1} />
        ))
      )}
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
      padding: 24,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}
