import React, { useState } from "react";
import {
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
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Avatar, Badge, Button, Card, Screen } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { personTitles, PersonTitle, formatFullName } from "../../../domain/model";
import { useSchool } from "../../../providers/AppProvider";
import { roleLabels } from "../../Entry";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
];

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { school, context, data, services, act, busy, refresh } = useSchool();

  const currentMembership = data.memberships.find(
    (m) => m.schoolId === context.schoolId && m.userId === context.userId,
  );
  const currentStaff = data.staff.find(
    (s) => s.schoolId === context.schoolId && s.userId === context.userId,
  );

  // Form states
  const [avatarUrl, setAvatarUrl] = useState(currentMembership?.avatar || AVATAR_PRESETS[0]);
  const [titlePrefix, setTitlePrefix] = useState<PersonTitle>(
    (currentStaff?.titlePrefix as PersonTitle) || "Dr.",
  );
  const [firstName, setFirstName] = useState(
    currentStaff?.firstName ||
      currentMembership?.name.split(" ")[0] ||
      "Mubarak",
  );
  const [middleName, setMiddleName] = useState(currentStaff?.middleName || "");
  const [lastName, setLastName] = useState(
    currentStaff?.lastName ||
      currentMembership?.name.split(" ").slice(1).join(" ") ||
      "Abdulrafiu",
  );
  const [phone, setPhone] = useState(currentStaff?.phone || "+234 905 934 3602");
  const [email, setEmail] = useState(currentStaff?.email || "mubarak@binarytech.ng");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const previewFullName = formatFullName({
    title: titlePrefix,
    firstName: firstName.trim(),
    middleName: middleName.trim(),
    lastName: lastName.trim(),
  });

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error("First Name Required", {
        description: "Please enter your official first name.",
      });
      return;
    }

    try {
      await act(async () => {
        await services.updateProfile(context, {
          titlePrefix,
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          name: previewFullName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          avatar: avatarUrl,
        });
      }, "Profile updated successfully!");

      refresh();
      router.back();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save profile changes.");
    }
  };

  return (
    <Screen
      title="Edit Profile"
      subtitle="Personal Details & Identity"
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
          {/* Avatar Hero Block */}
          <Card style={styles.avatarCard}>
            <View style={styles.avatarRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose profile photo"
                onPress={() => setShowAvatarPicker(!showAvatarPicker)}
                style={styles.avatarWrapper}
              >
                <Avatar
                  uri={avatarUrl}
                  name={previewFullName || "User"}
                  size={72}
                  role={context.role}
                />
                <View style={styles.cameraIconBadge}>
                  <Icon name="camera" size={13} color="#ffffff" filled />
                </View>
              </Pressable>

              <View style={styles.avatarMetaCol}>
                <Text style={styles.previewNameText} numberOfLines={1}>
                  {previewFullName || "Your Name"}
                </Text>
                <Text style={styles.previewRoleText}>
                  {roleLabels[context.role] || "Member"} · {school.name}
                </Text>
                <Pressable
                  onPress={() => setShowAvatarPicker(!showAvatarPicker)}
                  style={styles.changePhotoBtn}
                >
                  <Text style={styles.changePhotoBtnText}>
                    {showAvatarPicker ? "Close Presets" : "Change Photo"}
                  </Text>
                  <Icon name="chevron" size={12} color={colors.orange} />
                </Pressable>
              </View>
            </View>

            {/* Expandable Avatar Presets */}
            {showAvatarPicker && (
              <View style={styles.presetsWrapper}>
                <Text style={styles.presetsLabel}>SELECT PHOTO PRESET</Text>
                <View style={styles.presetsRow}>
                  {AVATAR_PRESETS.map((url, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        setAvatarUrl(url);
                        setShowAvatarPicker(false);
                      }}
                      style={[
                        styles.presetItem,
                        avatarUrl === url && styles.presetItemActive,
                      ]}
                    >
                      <Avatar uri={url} name={`Preset ${idx}`} size={44} />
                      {avatarUrl === url && (
                        <View style={styles.presetCheckmark}>
                          <Icon name="check" size={10} color="#ffffff" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </Card>

          {/* Form Fields Card */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionHeader}>LEGAL IDENTITY DETAILS</Text>

            {/* Title Selector */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Honorific Title Prefix</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.titleScroll}
              >
                {personTitles.map((t) => {
                  const isSelected = titlePrefix === t;
                  return (
                    <Pressable
                      key={t}
                      accessibilityRole="button"
                      onPress={() => setTitlePrefix(t)}
                      style={[styles.titlePill, isSelected && styles.titlePillActive]}
                    >
                      <Text
                        style={[
                          styles.titlePillText,
                          isSelected && styles.titlePillTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* First Name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>First Name *</Text>
              <TextInput
                style={styles.textInput}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g. Mubarak"
                placeholderTextColor={colors.slate400}
                autoCorrect={false}
              />
            </View>

            {/* Middle Name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Middle Name (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={middleName}
                onChangeText={setMiddleName}
                placeholder="e.g. Ade"
                placeholderTextColor={colors.slate400}
                autoCorrect={false}
              />
            </View>

            {/* Last Name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Last Name / Surname *</Text>
              <TextInput
                style={styles.textInput}
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g. Abdulrafiu"
                placeholderTextColor={colors.slate400}
                autoCorrect={false}
              />
            </View>
          </Card>

          {/* Contact Information Card */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionHeader}>OFFICIAL CONTACT INFORMATION</Text>

            {/* Phone */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Mobile Phone Number</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="phone" size={16} color={colors.slate500} />
                <TextInput
                  style={styles.textInputFrameless}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+234 905 934 3602"
                  placeholderTextColor={colors.slate400}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Official Email Address</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="email" size={16} color={colors.slate500} />
                <TextInput
                  style={styles.textInputFrameless}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="mubarak@binarytech.ng"
                  placeholderTextColor={colors.slate400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Pinned Bottom Action Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title="Save Profile Changes"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={!firstName.trim() || busy}
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
  avatarCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarWrapper: {
    position: "relative",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.orange,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarMetaCol: {
    flex: 1,
    gap: 4,
  },
  previewNameText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  previewRoleText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate500,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  changePhotoBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  presetsWrapper: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  presetsLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  presetItem: {
    position: "relative",
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: "transparent",
  },
  presetItemActive: {
    borderColor: colors.orange,
  },
  presetCheckmark: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.orange,
    width: 16,
    height: 16,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
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
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate700,
  },
  titleScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  titlePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titlePillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  titlePillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  titlePillTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
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
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: 8,
  },
  textInputFrameless: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
