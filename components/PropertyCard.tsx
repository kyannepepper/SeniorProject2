import { useTheme } from "@/contexts/ThemeContext";
import type { AppThemeColors } from "@/lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  address: _address,
  rentAmount,
  occupied: _occupied,
  imageUrl,
  onPress,
  footer,
}: PropertyCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rentLabel =
    rentAmount != null ? `$${Number(rentAmount).toFixed(0)}/mo` : "—";

  return (
    <TouchableOpacity
      style={styles.cardShadow}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.card}>
        <View style={styles.media}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardImagePlaceholderText}>No photo</Text>
            </View>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.88)"]}
            locations={[0.25, 1]}
            style={styles.gradient}
            pointerEvents="none"
          />
          <View style={styles.overlayText} pointerEvents="none">
            <Text style={styles.cardName} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.cardRent}>{rentLabel}</Text>
          </View>
        </View>
        {footer}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    cardShadow: {
      marginBottom: 12,
      borderRadius: 30,
      backgroundColor: colors.surface,
      shadowColor: "rgba(0, 0, 0, 0.84)",
      shadowOffset: { width: 2, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 3,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 30,
      overflow: "hidden",
    },
    media: {
      width: "100%",
      height: 300,
      position: "relative",
      
    },
    cardImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
      backgroundColor: colors.border,
    },
    cardImagePlaceholder: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bgSecondary,
      justifyContent: "center",
      alignItems: "center",
    },
    cardImagePlaceholderText: {
      color: colors.placeholder,
      fontSize: 14,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    overlayText: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 28,
    },
    cardName: {
      fontSize: 19,
      fontWeight: "700",
      color: "#ffffff",
      marginBottom: 4,
      textShadowColor: "rgba(0,0,0,0.45)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    cardRent: {
      fontSize: 16,
      fontWeight: "600",
      color: "rgba(255,255,255,0.92)",
    },
  });
}
