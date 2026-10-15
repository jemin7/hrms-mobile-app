import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "../../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { useTheme } from "../../theme/ThemeProvider";

type FocusedField = "username" | "password" | null;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const passwordInputRef = useRef<NativeTextInput>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleLogin() {
    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);

    try {
      await signIn(username.trim(), password);
      // The root navigation guard redirects authenticated users to the app.
    } catch (loginError) {
      if (loginError instanceof ApiError) {
        setError(loginError.message);
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons
                name="people-outline"
                size={25}
                color={colors.primary}
              />
            </View>
            <View>
              <Text style={styles.brandName}>HRMS</Text>
              <Text style={styles.brandCaption}>EMPLOYEE PORTAL</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroAccent} />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your workday, attendance, leave, and more.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign in to your account</Text>
            <Text style={styles.formSubtitle}>
              Enter your employee credentials to continue.
            </Text>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "username" && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={
                    focusedField === "username"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <TextInput
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Username or employee ID"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  importantForAutofill="yes"
                  style={styles.input}
                  editable={!isSubmitting}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  accessibilityLabel="Username or employee ID"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "password" && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={
                    focusedField === "password"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  importantForAutofill="yes"
                  style={styles.input}
                  editable={!isSubmitting}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  accessibilityState={{ selected: showPassword }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              style={({ pressed }) => [
                styles.forgotButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.loginButton,
                !canSubmit && styles.loginButtonDisabled,
                pressed && canSubmit && styles.loginButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text style={styles.loginButtonText}>Signing in…</Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.loginButtonText,
                      !canSubmit && styles.loginButtonTextDisabled,
                    ]}
                  >
                    Sign In
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={!canSubmit ? colors.textMuted : colors.white}
                  />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={colors.textMuted}
            />
            <Text style={styles.footerText}>
              Secure access to your employee workspace
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: {
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
  danger: string;
  dangerBackground: string;
  white: string;
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 24,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    brandMark: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    brandName: {
      fontSize: 17,
      lineHeight: 21,
      fontWeight: "900",
      letterSpacing: 0.7,
      color: colors.textPrimary,
    },
    brandCaption: {
      marginTop: 2,
      fontSize: 9,
      letterSpacing: 1.5,
      fontWeight: "800",
      color: colors.textMuted,
    },
    hero: {
      marginTop: 42,
      marginBottom: 25,
    },
    heroAccent: {
      width: 37,
      height: 5,
      borderRadius: 3,
      marginBottom: 17,
      backgroundColor: colors.primary,
    },
    title: {
      fontSize: 32,
      lineHeight: 39,
      fontWeight: "900",
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    subtitle: {
      maxWidth: 330,
      marginTop: 9,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary,
    },
    formCard: {
      padding: 19,
      borderRadius: 23,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    formSubtitle: {
      marginTop: 5,
      marginBottom: 7,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      marginTop: 14,
      padding: 12,
      borderRadius: 13,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: colors.danger,
    },
    fieldGroup: {
      marginTop: 17,
    },
    label: {
      marginBottom: 8,
      fontSize: 13,
      fontWeight: "800",
      color: colors.textSecondary,
    },
    inputContainer: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputContainerFocused: {
      borderColor: colors.primary,
    },
    input: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
      paddingVertical: 0,
      fontSize: 15,
      color: colors.textPrimary,
    },
    eyeButton: {
      width: 36,
      height: 40,
      marginLeft: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    forgotButton: {
      alignSelf: "flex-end",
      marginTop: 12,
      paddingVertical: 5,
      paddingHorizontal: 2,
    },
    forgotText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primary,
    },
    loginButton: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      marginTop: 22,
      borderRadius: 15,
      backgroundColor: colors.primary,
    },
    loginButtonDisabled: {
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loginButtonPressed: {
      opacity: 0.84,
      transform: [{ scale: 0.99 }],
    },
    loginButtonText: {
      fontSize: 15,
      fontWeight: "900",
      color: colors.white,
    },
    loginButtonTextDisabled: {
      color: colors.textMuted,
    },
    pressed: {
      opacity: 0.74,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 24,
      paddingHorizontal: 8,
    },
    footerText: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}
