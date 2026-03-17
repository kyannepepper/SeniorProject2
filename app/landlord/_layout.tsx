import { Stack } from "expo-router";

export default function LandlordLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f8fafc",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Landlord Dashboard" }} />
      <Stack.Screen name="properties" options={{ title: "Properties" }} />
      <Stack.Screen name="add-property" options={{ title: "Add property" }} />
      <Stack.Screen name="edit-property" options={{ title: "Edit property" }} />
      <Stack.Screen name="tenants" options={{ title: "Tenants" }} />
      <Stack.Screen
        name="maintenance-workers"
        options={{ title: "Maintenance Workers" }}
      />
      <Stack.Screen
        name="maintenance-requests"
        options={{ title: "Maintenance Requests" }}
      />
      <Stack.Screen
        name="maintenance-request-detail"
        options={{ title: "Request Details" }}
      />
      <Stack.Screen name="leases" options={{ title: "Leases" }} />
      <Stack.Screen name="lease-detail" options={{ title: "Lease Details" }} />
      <Stack.Screen name="add-lease" options={{ title: "Create lease" }} />
      <Stack.Screen name="applications" options={{ title: "Applications" }} />
      <Stack.Screen name="application-detail" options={{ title: "Application" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

