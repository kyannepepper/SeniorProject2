import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="landlord" options={{ headerShown: false }} />
        <Stack.Screen name="tenant" options={{ headerShown: false }} />
        <Stack.Screen name="maintenance" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
