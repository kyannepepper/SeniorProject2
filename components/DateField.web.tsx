import { useTheme } from "@/contexts/ThemeContext";
import type { DateFieldProps } from "@/components/DateField.types";
import { formatLocalYMD, parseLocalYMD } from "@/lib/dateLocal";
import { createElement } from "react";
import { StyleSheet, View } from "react-native";

export type { DateFieldProps };

export function DateField({
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
  fieldStyle,
}: DateFieldProps) {
  const { colors } = useTheme();
  const flat = StyleSheet.flatten(fieldStyle) as Record<string, unknown>;
  const fontSize = (flat.fontSize as number) ?? 16;

  return (
    <View style={fieldStyle}>
      {createElement("input", {
        type: "date",
        "aria-label": placeholder,
        value: value ? formatLocalYMD(value) : "",
        min: minimumDate ? formatLocalYMD(minimumDate) : undefined,
        max: maximumDate ? formatLocalYMD(maximumDate) : undefined,
        onChange: (e: { currentTarget: { value: string } }) => {
          const v = e.currentTarget.value;
          if (!v) return;
          const d = parseLocalYMD(v);
          if (!Number.isNaN(d.getTime())) onChange(d);
        },
        style: {
          width: "100%",
          border: "none",
          outline: "none",
          margin: 0,
          padding: 0,
          fontSize,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: colors.text,
          backgroundColor: "transparent",
          boxSizing: "border-box",
        },
      })}
    </View>
  );
}
