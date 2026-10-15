import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "../../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { forgotPassword, verifyForgotPassword } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";

const RESET_TOKEN_KEY = "hrms_reset_token";

type Step = "request" | "verify";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [step, setStep] = useState<Step>("request");
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleBack = () => {
    if (step === "verify") {
      setError("");
      setStep("request");
      return;
    }

    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/login");
  };

  async function handleRequestReset() {
    const identifier = emailOrMobile.trim();
    if (!identifier) {
      setError("Enter your email or mobile number.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await forgotPassword(identifier);
      await SecureStore.setItemAsync(RESET_TOKEN_KEY, response.resetToken);
      setMaskedEmail(response.maskedEmail ?? "");
      setStep("verify");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to request password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const resetToken = await SecureStore.getItemAsync(RESET_TOKEN_KEY);
      if (!resetToken) {
        throw new Error("Your reset session has expired. Please start again.");
      }

      await verifyForgotPassword({
        resetToken,
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      await SecureStore.deleteItemAsync(RESET_TOKEN_KEY);
      router.replace("/(auth)/login");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to reset your password.",
      );
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
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              step === "verify"
                ? "Back to email or mobile entry"
                : "Go back to login"
            }
          >
            <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.illustration}>
            <View style={styles.illustrationInner}>
              <Ionicons
                name={
                  step === "request"
                    ? "shield-checkmark-outline"
                    : "lock-closed-outline"
                }
                size={34}
                color={colors.primary}
              />
            </View>
          </View>

          <Text style={styles.eyebrow}>
            {step === "request" ? "ACCOUNT RECOVERY" : "SECURE YOUR ACCOUNT"}
          </Text>
          <Text style={styles.title}>
            {step === "request" ? "Forgot password?" : "Create a new password"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "request"
              ? "No worries. Enter your registered email or mobile number and we’ll help you get back in."
              : maskedEmail
                ? `Enter the 6-digit code sent to ${maskedEmail}, then choose a new password.`
                : "Enter the 6-digit code you received, then choose a new password."}
          </Text>

          {step === "verify" && (
            <View style={styles.stepIndicator}>
              <View style={styles.stepLineActive} />
              <View style={styles.stepLineActive} />
              <Text style={styles.stepText}>Step 2 of 2</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={() => setError("")}
                hitSlop={8}
                accessibilityLabel="Dismiss error"
              >
                <Ionicons name="close" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}

          {step === "request" ? (
            <View style={styles.form}>
              <Text style={styles.label}>Email or mobile number</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  value={emailOrMobile}
                  onChangeText={(value) => {
                    setEmailOrMobile(value);
                    if (error) setError("");
                  }}
                  placeholder="name@example.com or mobile"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  returnKeyType="done"
                  onSubmitEditing={handleRequestReset}
                  style={styles.input}
                  editable={!isSubmitting}
                  accessibilityLabel="Email or mobile number"
                />
              </View>

              <Pressable
                onPress={handleRequestReset}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSubmitting && styles.primaryButtonDisabled,
                  pressed && !isSubmitting && styles.primaryButtonPressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      Send reset code
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={colors.white}
                    />
                  </>
                )}
              </Pressable>
              <Text style={styles.helperText}>
                Use the contact details registered with your account.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                value={otp}
                onChangeText={(value) => {
                  setOtp(value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                returnKeyType="next"
                style={styles.otpInput}
                editable={!isSubmitting}
                accessibilityLabel="6-digit verification code"
              />

              <Text style={styles.label}>New password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    if (error) setError("");
                  }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  style={styles.input}
                  editable={!isSubmitting}
                  accessibilityLabel="New password"
                />
                <Pressable
                  onPress={() => setShowNewPassword((value) => !value)}
                  hitSlop={8}
                  accessibilityLabel={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm new password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (error) setError("");
                  }}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  style={styles.input}
                  editable={!isSubmitting}
                  accessibilityLabel="Confirm new password"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  hitSlop={8}
                  accessibilityLabel={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.passwordHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color={colors.textSecondary}
                />
                <Text style={styles.passwordHintText}>
                  Use at least 8 characters for your new password.
                </Text>
              </View>

              <Pressable
                onPress={handleResetPassword}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSubmitting && styles.primaryButtonDisabled,
                  pressed && !isSubmitting && styles.primaryButtonPressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Reset password</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={colors.white}
                    />
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setError("");
                  setStep("request");
                }}
                disabled={isSubmitting}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Use a different email or mobile
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.footerText}>
              Your account security matters to us.
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
  primaryLight?: string;
  danger: string;
  dangerBackground: string;
  white: string;
}) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 28,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 28,
    },
    pressed: { opacity: 0.75 },
    illustration: {
      width: 76,
      height: 76,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight ?? colors.surfaceSecondary,
      marginBottom: 24,
    },
    illustrationInner: { alignItems: "center", justifyContent: "center" },
    eyebrow: {
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 1.5,
      fontWeight: "800",
      marginBottom: 9,
    },
    title: {
      fontSize: 29,
      lineHeight: 36,
      fontWeight: "800",
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary,
    },
    stepIndicator: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      gap: 6,
    },
    stepLineActive: {
      height: 4,
      width: 28,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    stepText: {
      marginLeft: 5,
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginTop: 22,
      padding: 13,
      borderRadius: 14,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    errorText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.danger },
    form: { marginTop: 28 },
    label: {
      marginBottom: 9,
      marginTop: 17,
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    inputContainer: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 15,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      fontSize: 15,
      color: colors.textPrimary,
    },
    otpInput: {
      minHeight: 60,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 23,
      letterSpacing: 8,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    primaryButton: {
      minHeight: 56,
      marginTop: 25,
      paddingHorizontal: 18,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
    primaryButtonText: { fontSize: 15, fontWeight: "800", color: colors.white },
    helperText: {
      marginTop: 13,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: "center",
    },
    passwordHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 13,
    },
    passwordHintText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    secondaryButton: {
      alignItems: "center",
      paddingVertical: 16,
      marginTop: 3,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "700",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 34,
    },
    footerText: { color: colors.textMuted, fontSize: 12 },
  });
}
