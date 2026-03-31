import { useTheme } from "@/contexts/ThemeContext";
import { createContrastScreenStyles } from "@/lib/contrastScreenStyles";
import type { AppThemeColors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const base = useMemo(() => createContrastScreenStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed.";
      Alert.alert("Login Error", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={base.screen}
    >
      <View style={styles.content}>
        <View style={styles.formBlock}>
          <View style={styles.logoRow}>
            <BrandLogo size={100} />
          </View>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandRent}>RENT </Text>
            <Text style={styles.brandSquirrel}>SQUIRREL</Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    content: {
      flex: 1,
      padding: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    formBlock: {
      width: "100%",
      maxWidth: 420,
      alignItems: "center",
    },
    logoRow: {
      alignItems: "center",
      marginBottom: 16,
    },
    brandTitle: {
      fontSize: 36,
      fontWeight: "800",
      marginBottom: 20,
      textAlign: "center",
      letterSpacing: -0.8,
    },
    brandRent: {
      color: colors.text,
    },
    brandSquirrel: {
      color: colors.primary,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 5,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      marginBottom: 14,
      alignSelf: "stretch",
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 6,
      alignSelf: "stretch",
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    backButton: {
      marginTop: 20,
      alignItems: "center",
    },
    backButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
  });
}
