import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Badge, Button, Card, Screen } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { useSchool } from "../../../providers/AppProvider";
import { pickAndUploadImage } from "../../../services/cloudinary";

const PRIMARY_COLOR_SWATCHES = [
  "#14213d",
  "#0f172a",
  "#065f46",
  "#1e3a8a",
  "#3730a3",
  "#581c87",
  "#881337",
  "#7c2d12",
  "#18181b",
];

const SECONDARY_COLOR_SWATCHES = [
  "#ff6600",
  "#d97706",
  "#ca8a04",
  "#059669",
  "#0284c7",
  "#e11d48",
  "#9333ea",
  "#4f46e5",
  "#10b981",
];

export function EditSchoolScreen() {
  const insets = useSafeAreaInsets();
  const { school, context, services, act, busy, refresh } = useSchool();

  const [logo, setLogo] = useState(school.logo || "");
  const [primaryColor, setPrimaryColor] = useState(school.primaryColor || "#14213d");
  const [secondaryColor, setSecondaryColor] = useState(school.secondaryColor || "#ff6600");
  const [motto, setMotto] = useState(school.motto || "Excellence, Wisdom & Innovation");
  const [address, setAddress] = useState(school.address || "Kosobo area oyo");
  const [phone, setPhone] = useState(school.phone || "+234 803 123 4567");
  const [email, setEmail] = useState(school.email || "info@binarytech.ng");
  const [term, setTerm] = useState(school.term || "First Term · 2026/27");
  const [openTime, setOpenTime] = useState(school.openTime || "07:30");
  const [closeTime, setCloseTime] = useState(school.closeTime || "15:30");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Real Cloudinary Logo Upload
  const handleUploadLogo = async () => {
    setUploadingLogo(true);
    try {
      const url = await pickAndUploadImage({ aspect: [1, 1], allowsEditing: true });
      if (url) {
        setLogo(url);
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    try {
      await act(async () => {
        await services.updateSchool(context, {
          logo: logo.trim() || undefined,
          primaryColor: primaryColor.trim(),
          secondaryColor: secondaryColor.trim(),
          motto: motto.trim(),
          address: address.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          term: term.trim(),
          openTime: openTime.trim(),
          closeTime: closeTime.trim(),
        });
      }, "School details and brand colors saved!");

      refresh();
      router.back();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save school details.");
    }
  };

  return (
    <Screen
      title="Edit School & Theme"
      subtitle="Branding, Theme Colors & Campus Parameters"
      scrollable={false}
      back={() => (router.canGoBack() ? router.back() : router.replace("/(workspace)/more" as any))}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Locked Accredited Name */}
          <Card style={styles.lockedSchoolCard}>
            <View style={styles.lockedHeaderRow}>
              <View style={styles.lockIconBox}>
                <Icon name="shield" size={16} color={colors.navy} filled />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedLabel}>OFFICIAL ACCREDITED SCHOOL NAME</Text>
                <Text style={styles.lockedSchoolName}>{school.name}</Text>
              </View>
              <Badge text="LOCKED" tone="info" />
            </View>
            <Text style={styles.lockedNotice}>
              Accredited institutional name is registered with the Ministry of Education and cannot be modified.
            </Text>
          </Card>

          {/* School Crest / Logo with Cloudinary Upload */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionHeader}>INSTITUTIONAL CREST / LOGO</Text>
            <Text style={styles.sectionDesc}>
              This official logo appears prominently on payment receipts, student digital passes, and report cards.
            </Text>

            <View style={styles.logoRow}>
              {/* High visibility clear logo frame */}
              <View style={styles.logoPreviewBox}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.logoImage} resizeMode="contain" />
                ) : (
                  <Icon name="school" size={36} color={colors.navy} />
                )}
              </View>

              <View style={styles.logoActionCol}>
                <Button
                  title={uploadingLogo ? "Uploading..." : "Upload School Logo"}
                  variant="primary"
                  size="sm"
                  loading={uploadingLogo}
                  onPress={handleUploadLogo}
                />
                {logo ? (
                  <Pressable onPress={() => setLogo("")} style={styles.removeLogoBtn}>
                    <Text style={styles.removeLogoText}>Remove Logo</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Card>

          {/* Custom Theme Color Settings */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionHeader}>SCHOOL BRAND THEME COLORS</Text>
            <Text style={styles.sectionDesc}>
              Set custom primary and secondary colors for your campus workspace and official receipts.
            </Text>

            {/* Primary Color Picker */}
            <View style={styles.fieldWrap}>
              <View style={styles.colorLabelRow}>
                <Text style={styles.fieldLabel}>Primary Color (Headers & Foundations)</Text>
                <View style={[styles.colorPreviewDot, { backgroundColor: primaryColor }]} />
              </View>
              <View style={styles.paletteRow}>
                {PRIMARY_COLOR_SWATCHES.map((hex) => {
                  const isSelected = primaryColor.toLowerCase() === hex.toLowerCase();
                  return (
                    <Pressable
                      key={hex}
                      accessibilityRole="button"
                      onPress={() => setPrimaryColor(hex)}
                      style={[
                        styles.paletteSwatch,
                        { backgroundColor: hex },
                        isSelected && styles.paletteSwatchActive,
                      ]}
                    >
                      {isSelected && <Icon name="check" size={12} color="#ffffff" />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.hexInputRow}>
                <Text style={styles.hexPrefix}>HEX</Text>
                <TextInput
                  style={styles.hexInput}
                  value={primaryColor}
                  onChangeText={setPrimaryColor}
                  placeholder="#14213d"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Secondary Color Picker */}
            <View style={styles.fieldWrap}>
              <View style={styles.colorLabelRow}>
                <Text style={styles.fieldLabel}>Secondary Color (Accents & Highlights)</Text>
                <View style={[styles.colorPreviewDot, { backgroundColor: secondaryColor }]} />
              </View>
              <View style={styles.paletteRow}>
                {SECONDARY_COLOR_SWATCHES.map((hex) => {
                  const isSelected = secondaryColor.toLowerCase() === hex.toLowerCase();
                  return (
                    <Pressable
                      key={hex}
                      accessibilityRole="button"
                      onPress={() => setSecondaryColor(hex)}
                      style={[
                        styles.paletteSwatch,
                        { backgroundColor: hex },
                        isSelected && styles.paletteSwatchActive,
                      ]}
                    >
                      {isSelected && <Icon name="check" size={12} color="#ffffff" />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.hexInputRow}>
                <Text style={styles.hexPrefix}>HEX</Text>
                <TextInput
                  style={styles.hexInput}
                  value={secondaryColor}
                  onChangeText={setSecondaryColor}
                  placeholder="#ff6600"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Live Theme Preview Box */}
            <View style={[styles.themePreviewBox, { borderColor: primaryColor }]}>
              <View style={[styles.previewHeader, { backgroundColor: primaryColor }]}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.previewLogo} resizeMode="contain" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewHeaderText}>{school.name}</Text>
                  <Text style={styles.previewHeaderSub}>OFFICIAL RECEIPT HEADER PREVIEW</Text>
                </View>
              </View>
              <View style={styles.previewBody}>
                <Text style={styles.previewBodyText}>Tuition Fee Cleared · ₦2,500</Text>
                <View style={[styles.previewBadge, { backgroundColor: secondaryColor }]}>
                  <Text style={styles.previewBadgeText}>CONFIRMED</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Campus Details */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionHeader}>INSTITUTIONAL DETAILS</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>School Motto / Slogan</Text>
              <TextInput
                style={styles.textInput}
                value={motto}
                onChangeText={setMotto}
                placeholder="e.g. Excellence, Wisdom & Innovation"
                placeholderTextColor={colors.slate400}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Campus Physical Address</Text>
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Kosobo area oyo"
                placeholderTextColor={colors.slate400}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Official Inquiries Phone</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+234 803 123 4567"
                placeholderTextColor={colors.slate400}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Official Campus Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="info@binarytech.ng"
                placeholderTextColor={colors.slate400}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Current Academic Term / Session</Text>
              <TextInput
                style={styles.textInput}
                value={term}
                onChangeText={setTerm}
                placeholder="First Term · 2026/27"
                placeholderTextColor={colors.slate400}
              />
            </View>

            <View style={styles.hoursRow}>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Gate Open Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={openTime}
                  onChangeText={setOpenTime}
                  placeholder="07:30"
                  placeholderTextColor={colors.slate400}
                />
              </View>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Gate Dismissal</Text>
                <TextInput
                  style={styles.textInput}
                  value={closeTime}
                  onChangeText={setCloseTime}
                  placeholder="15:30"
                  placeholderTextColor={colors.slate400}
                />
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Pinned Bottom Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title="Save School Profile & Theme"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={busy}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  lockedSchoolCard: {
    padding: spacing.md,
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  lockedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lockIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: "rgba(20, 33, 61, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  lockedSchoolName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  lockedNotice: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.slate500,
  },
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.slate500,
  },
  sectionDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.slate600,
    marginTop: -4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logoPreviewBox: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoActionCol: {
    flex: 1,
    gap: 8,
  },
  removeLogoBtn: {
    paddingVertical: 2,
  },
  removeLogoText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.red,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate700,
  },
  colorLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorPreviewDot: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  paletteRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    paddingVertical: 2,
  },
  paletteSwatch: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  paletteSwatchActive: {
    borderColor: colors.navy,
    transform: [{ scale: 1.1 }],
  },
  hexInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    gap: 8,
  },
  hexPrefix: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate400,
  },
  hexInput: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  themePreviewBox: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    overflow: "hidden",
    marginTop: 4,
  },
  previewHeader: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  previewHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  previewHeaderSub: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.5,
  },
  previewBody: {
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBodyText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  previewBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#ffffff",
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  hoursRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
