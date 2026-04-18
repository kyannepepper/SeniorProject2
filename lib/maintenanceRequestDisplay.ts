import type { AppThemeColors } from "@/lib/theme";

export type MaintenanceCardBadgeVariant = "completed" | "assigned" | "pending" | "cancelled";

/** Card badge: completed / cancelled from status; otherwise assigned if a worker is linked, else pending. */
export function getMaintenanceCardBadge(
  status: string | null,
  maintenance_worker_id: string | null
): { label: string; variant: MaintenanceCardBadgeVariant } {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") {
    return { label: "COMPLETED", variant: "completed" };
  }
  if (s === "cancelled") {
    return { label: "CANCELLED", variant: "cancelled" };
  }
  if (maintenance_worker_id) {
    return { label: "ASSIGNED", variant: "assigned" };
  }
  return { label: "PENDING", variant: "pending" };
}

export function urgencySeverityColor(colors: AppThemeColors, urgency: string | null): string {
  const u = (urgency ?? "").toLowerCase();
  if (u === "high") return colors.danger;
  if (u === "low") return colors.success;
  if (u === "medium") return "#ca8a04";
  return colors.textMuted;
}

export function formatUrgencyLabel(urgency: string | null): string {
  if (!urgency) return "";
  const u = String(urgency).toLowerCase();
  if (u === "low") return "Low";
  if (u === "medium") return "Medium";
  if (u === "high") return "High";
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}
