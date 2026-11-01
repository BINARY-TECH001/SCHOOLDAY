import { useEffect, useState, ReactNode } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
export function Glass({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    if (Platform.OS === "web") {
      const preference = window.matchMedia(
        "(prefers-reduced-transparency: reduce)",
      );
      const update = () => setReduce(preference.matches);
      update();
      preference.addEventListener("change", update);
      return () => preference.removeEventListener("change", update);
    }
    if (Platform.OS !== "ios") return;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduce,
    );
    return () => subscription.remove();
  }, []);
  const base = [
    { borderWidth: 1, borderColor: "#ffffff", overflow: "hidden" as const },
    style,
  ];
  if (reduce || Platform.OS === "android")
    return (
      <View style={[base, { backgroundColor: "#fafbff" }]}>{children}</View>
    );
  if (
    Platform.OS === "ios" &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable()
  )
    return (
      <GlassView glassEffectStyle="regular" colorScheme="light" style={base}>
        {children}
      </GlassView>
    );
  return (
    <BlurView
      tint="light"
      intensity={65}
      style={[base, { backgroundColor: "rgba(255,255,255,0.82)" }]}
    >
      {children}
    </BlurView>
  );
}
