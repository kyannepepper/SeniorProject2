import type { StyleProp, TextStyle, ViewStyle } from "react-native";

export type DateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder: string;
  /** When `value` is null, native pickers use this as the initial wheel date. */
  initialPickerValue?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  fieldStyle: StyleProp<ViewStyle>;
  placeholderTextStyle: StyleProp<TextStyle>;
  valueTextStyle: StyleProp<TextStyle>;
};
