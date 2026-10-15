import { forwardRef } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
  type StyleProp,
} from "react-native";

function getInterFontFamily(weight?: TextStyle["fontWeight"]) {
  switch (String(weight ?? "400")) {
    case "500":
      return "Inter_500Medium";
    case "600":
      return "Inter_600SemiBold";
    case "bold":
    case "700":
      return "Inter_700Bold";
    case "800":
      return "Inter_800ExtraBold";
    case "900":
      return "Inter_900Black";
    default:
      return "Inter_400Regular";
  }
}

function withInterFont(style?: StyleProp<TextStyle>): TextStyle {
  const flattened = StyleSheet.flatten(style) ?? {};

  return {
    ...flattened,
    fontFamily: getInterFontFamily(flattened.fontWeight),
    fontWeight: "normal",
  };
}

export const AppText = forwardRef<NativeText, TextProps>(function AppText(
  { style, ...props },
  ref,
) {
  return <NativeText {...props} ref={ref} style={withInterFont(style)} />;
});

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(
  function AppTextInput({ style, ...props }, ref) {
    return (
      <NativeTextInput {...props} ref={ref} style={withInterFont(style)} />
    );
  },
);

AppText.displayName = "AppText";
AppTextInput.displayName = "AppTextInput";
