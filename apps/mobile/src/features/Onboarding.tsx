import React, { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, shadows } from "../theme/tokens";
import { Icon, IconName } from "../components/Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface IntroSlide {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: IconName;
  accent: string;
}

const SLIDES: IntroSlide[] = [
  {
    id: "slide-1",
    step: "CAMPUS OS · 01",
    title: "The Modern Command\nCenter for Your School",
    subtitle:
      "Automate class fee collection, biometric attendance, staff roles, and ministry calendar synchronization in one intuitive app.",
    icon: "school",
    accent: "#FF6600",
  },
  {
    id: "slide-2",
    step: "PRESENCE & SAFETY · 02",
    title: "Facial Verification &\nSmart Campus Geofence",
    subtitle:
      "Proprietors define campus opening and closing hours. Staff clock in on campus with camera verification and GPS geofence checks.",
    icon: "camera",
    accent: "#0077B6",
  },
  {
    id: "slide-3",
    step: "SETTLEMENTS · 03",
    title: "Automated Tuition &\nInstant Settled Receipts",
    subtitle:
      "Guardians pay tuition with dedicated Nigerian virtual accounts or cards. Instant authenticated receipts with QR verification.",
    icon: "wallet",
    accent: "#10B981",
  },
];

export function Onboarding({
  onSelectAction,
}: {
  onSelectAction: (action: "login" | "create") => void;
}) {
  const scrollRef = useRef<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    } else {
      onSelectAction("create");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar with Brand & Direct Sign In Link */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandLogo}>
            SHOOLDAY<Text style={{ color: colors.orange }}>.</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onSelectAction("login")}
          activeOpacity={0.7}
          style={styles.signInTopBtn}
        >
          <Text style={styles.signInTopText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Visual Graphic Ring Area */}
            <View style={styles.graphicContainer}>
              <View
                style={[
                  styles.outerGlowRing,
                  {
                    borderColor: slide.accent + "25",
                    backgroundColor: "#FFFFFF",
                  },
                ]}
              >
                <View
                  style={[
                    styles.innerGlowRing,
                    {
                      backgroundColor: slide.accent + "15",
                      borderColor: slide.accent + "35",
                    },
                  ]}
                >
                  <Icon name={slide.icon} size={46} color={slide.accent} filled />
                </View>
              </View>
            </View>

            {/* Text Area with Generous Whitespace */}
            <View style={styles.textContainer}>
              <Text style={[styles.stepLabel, { color: slide.accent }]}>
                {slide.step}
              </Text>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Pinned Navigation Area */}
      <View style={styles.bottomArea}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryButtonText}>
            {activeIndex === SLIDES.length - 1
              ? "Create School Account"
              : "Continue"}
          </Text>
          <Icon name="arrow" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Secondary Sign In Link */}
        <TouchableOpacity
          onPress={() => onSelectAction("login")}
          style={styles.signInLink}
          activeOpacity={0.8}
        >
          <Text style={styles.signInText}>
            Already part of a school?{" "}
            <Text style={styles.signInBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandLogo: {
    fontFamily: fonts.extra,
    fontSize: 22,
    letterSpacing: -0.6,
    color: colors.navy,
  },
  signInTopBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  signInTopText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.navy,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  graphicContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 36,
  },
  outerGlowRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  innerGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
    maxWidth: 340,
  },
  stepLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  slideTitle: {
    fontFamily: fonts.extra,
    fontSize: 28,
    letterSpacing: -0.7,
    color: colors.navy,
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 14,
  },
  slideSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 23,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 16,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.orange,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "#CBD5E1",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.orange,
    gap: 10,
    ...shadows.sm,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  signInLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  signInText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#64748B",
  },
  signInBold: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
});
