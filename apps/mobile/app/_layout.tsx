import "react-native-gesture-handler";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { AppProvider } from "../src/providers/AppProvider";
import { Toaster } from "sonner-native";

export default function Layout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#f6f7fa",
        }}
      >
        <ActivityIndicator color="#ff6600" />
      </View>
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ErrorBoundary>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="scanner"
              options={{
                presentation: "modal",
                gestureEnabled: true,
                gestureDirection: "vertical",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                presentation: "card",
                gestureEnabled: true,
                gestureDirection: "horizontal",
                animation: "slide_from_right",
              }}
            />
          </Stack>
          <Toaster position="top-center" richColors theme="light" />
        </ErrorBoundary>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
