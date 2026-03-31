import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import type { AppThemeColors } from "@/lib/theme";
import { isPaidOnTime, type PaidPaymentRow } from "@/lib/paymentHistoryUtils";
import { useMemo } from "react";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function TenantPaymentHistoryRow({
  payment,
  isLast,
}: {
  payment: PaidPaymentRow;
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onTime = isPaidOnTime(payment.date_due, payment.date_paid);
  const lateFeeAmount = Number(payment.late_fee) > 0;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowTop}>
        <Text style={[styles.amount, !onTime && styles.amountLate]}>
          ${Number(payment.amount_due).toFixed(0)}
        </Text>
        <View style={[styles.badge, onTime ? styles.badgeOk : styles.badgeLate]}>
          <Text style={[styles.badgeText, onTime ? styles.badgeTextOk : styles.badgeTextLate]}>
            {onTime ? "On time" : "Late"}
          </Text>
        </View>
      </View>
      <Text style={[styles.meta, !onTime && styles.metaLate]}>
        Due {formatDate(payment.date_due)} · Paid {formatDate(payment.date_paid)}
      </Text>
      <Text style={[styles.feeLine, lateFeeAmount && styles.feeLineLate]}>
        {lateFeeAmount ? `Late fee: $${Number(payment.late_fee).toFixed(0)}` : "No late fee"}
      </Text>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    row: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    amount: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    amountLate: {
      color: colors.danger,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 5,
    },
    badgeOk: {
      backgroundColor: colors.onTimeBg,
    },
    badgeLate: {
      backgroundColor: colors.lateBg,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
    },
    badgeTextOk: {
      color: colors.onTimeText,
    },
    badgeTextLate: {
      color: colors.lateText,
    },
    meta: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 2,
    },
    metaLate: {
      color: colors.danger,
    },
    feeLine: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    feeLineLate: {
      color: colors.danger,
      fontWeight: "600",
    },
  });
}
