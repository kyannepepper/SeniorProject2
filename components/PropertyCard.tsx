import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import type { ReactNode } from "react";

export type PropertyCardProps = {
  name: string;
  address: string;
  rentAmount: number | null;
  occupied: boolean;
  imageUrl: string | null;
  onPress?: () => void;
  footer?: ReactNode;
};

export function PropertyCard({
  name,
  address,
  rentAmount,
  occupied,
  imageUrl,
  onPress,
  footer,
}: PropertyCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImagePlaceholderText}>No photo</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardAddress} numberOfLines={1}>
          {address}
        </Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardRent}>
            ${rentAmount != null ? Number(rentAmount).toFixed(0) : "—"}/mo
          </Text>
          <Text style={[styles.badge, occupied && styles.badgeOccupied]}>
            {occupied ? "Occupied" : "Available"}
          </Text>
        </View>
        {footer}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#1e293b",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImagePlaceholderText: {
    color: "#64748b",
    fontSize: 14,
  },
  cardBody: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRent: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a5b4fc",
  },
  badge: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  badgeOccupied: {
    color: "#f59e0b",
  },
});

