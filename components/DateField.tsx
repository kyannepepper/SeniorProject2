import { useTheme } from "@/contexts/ThemeContext";
import { formatLocaleLongDate } from "@/lib/dateLocal";
import type { DateFieldProps } from "@/components/DateField.types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";

export type { DateFieldProps };

export function DateField({
  value,
  onChange,
  placeholder,
  initialPickerValue,
  minimumDate,
  maximumDate,
  fieldStyle,
  placeholderTextStyle,
  valueTextStyle,
}: DateFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const pickerValue = value ?? initialPickerValue ?? new Date();

  return (
    <>
      <TouchableOpacity
        style={fieldStyle}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? valueTextStyle : placeholderTextStyle}>
          {value ? formatLocaleLongDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_, selectedDate) => {
            if (Platform.OS === "android") setOpen(false);
            if (selectedDate != null) onChange(selectedDate);
          }}
        />
      )}
      {Platform.OS === "ios" && open && (
        <TouchableOpacity
          style={styles.datePickerDone}
          onPress={() => setOpen(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.datePickerDoneText, { color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  datePickerDone: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
