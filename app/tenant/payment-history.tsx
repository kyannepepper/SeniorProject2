import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { TenantPaymentHistoryRow } from "@/components/TenantPaymentHistoryRow";
import type { PaidPaymentRow } from "@/lib/paymentHistoryUtils";

export default function TenantPaymentHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tenantId } = useAuth();
  const [rows, setRows] = useState<PaidPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (options?: { skipFullScreenLoading?: boolean }) => {
      if (!tenantId) {
        setRows([]);
        setLoading(false);
        return;
      }
      if (!options?.skipFullScreenLoading) setLoading(true);
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("payment_id, amount_due, late_fee, date_due, date_paid")
          .eq("tenant_id", tenantId)
          .not("date_paid", "is", null)
          .order("date_paid", { ascending: false });
        if (error) throw error;
        setRows((data as PaidPaymentRow[]) ?? []);
      } catch (e) {
        console.warn("Payment history load failed", e);
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantId]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!tenantId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Sign in as a tenant to see payment history.</Text>
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
