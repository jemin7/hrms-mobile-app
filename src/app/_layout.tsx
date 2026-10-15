import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";

import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppLayout() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="profile" options={{ headerShown: false }} />

        <Stack.Screen name="tasks" options={{ headerShown: false }} />
        <Stack.Screen
          name="task-details"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: theme === "dark" ? "#0F1115" : "#F7F8FA",
            },
          }}
        />

        <Stack.Screen name="holidays" options={{ headerShown: false }} />

        <Stack.Screen name="notifications" options={{ headerShown: false }} />

        <Stack.Screen name="leave-details" options={{ headerShown: false }} />

        <Stack.Screen
          name="reimbursement-details"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="edit-reimbursement"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="new-leave-request"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="new-reimbursement"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppLayout />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
