import { StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

/** Compact row: toggle dark mode (default is light). */
export function ThemeToggleRow() {
  const { mode, setMode, colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text }]}>Dark mode</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Default is light. Turn on for dark appearance.
        </Text>
      </View>
      <Switch
        value={mode === "dark"}
        onValueChange={(v) => setMode(v ? "dark" : "light")}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 5,
    borderWidth: 1,
    gap: 12,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
  },
});
