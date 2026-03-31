import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable } from "react-native";

export default function LandlordLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.onPrimary,
      headerTitleStyle: { fontWeight: "600" as const, color: colors.onPrimary },
      headerBackButtonDisplayMode: "minimal" as const,
      headerBackTitleVisible: false,
      headerBackVisible: false,
      headerLeft: ({ canGoBack }: { canGoBack?: boolean }) =>
        canGoBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{ paddingHorizontal: 8, paddingVertical: 4, marginLeft: 0 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.onPrimary} />
          </Pressable>
        ) : null,
    }),
    [colors, router]
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="properties" />
      <Stack.Screen name="add-property" />
      <Stack.Screen name="edit-property" />
      <Stack.Screen name="tenants" />
      <Stack.Screen name="tenants/[tenantId]" options={{ title: "Tenants" }} />
      <Stack.Screen
        name="tenants/[tenantId]/payment-history"
        options={{ title: "Payment History" }}
      />
      <Stack.Screen name="maintenance-workers" />
      <Stack.Screen name="maintenance-requests" />
      <Stack.Screen name="maintenance-request-detail" />
      <Stack.Screen name="leases" />
      <Stack.Screen name="lease-detail" />
      <Stack.Screen name="add-lease" />
      <Stack.Screen name="applications" />
      <Stack.Screen name="application-detail" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

