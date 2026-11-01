import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Avatar, Badge, Button, Card, Field } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { personTitles, PersonTitle } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { school, context, data, services, act, busy, refresh } = useSchool();

  const isOwner = context.role === "owner" || context.role === "admin";

  const currentMembership = data.memberships.find(
    (m) => m.schoolId === context.schoolId && m.userId === context.userId,
  );
  const currentStaff = data.staff.find(
    (s) => s.schoolId === context.schoolId && s.userId === context.userId,
  );

  // Profile Form State
  const [titlePrefix, setTitlePrefix] = useState<PersonTitle>(
    (currentStaff?.titlePrefix as PersonTitle) || "Mr.",
  );
  const [firstName, setFirstName] = useState(
    currentStaff?.firstName ||
      currentMembership?.name.split(" ")[0] ||
      "",
  );
  const [middleName, setMiddleName] = useState(currentStaff?.middleName || "");
  const [lastName, setLastName] = useState(
    currentStaff?.lastName ||
      currentMembership?.name.split(" ").slice(1).join(" ") ||
      "",
  );
  const [phone, setPhone] = useState(currentStaff?.phone || "+234 803 123 4567");
  const [email, setEmail] = useState(currentStaff?.email || `${context.userId}@schoolday.ng`);

  // School Form State (Proprietor only)
  const [motto, setMotto] = useState(school.motto || "Excellence, Wisdom & Innovation");
  const [address, setAddress] = useState(school.address || "Main Campus Drive");
  const [term, setTerm] = useState(school.term || "First term · 2026/27");
  const [openTime, setOpenTime] = useState(school.openTime || "07:30");
  const [closeTime, setCloseTime] = useState(school.closeTime || "15:30");

  useEffect(() => {
    if (visible) {
      if (currentStaff) {
        if (currentStaff.titlePrefix) setTitlePrefix(currentStaff.titlePrefix as PersonTitle);
        if (currentStaff.firstName) setFirstName(currentStaff.firstName);
        if (currentStaff.middleName) setMiddleName(currentStaff.middleName);
        if (currentStaff.lastName) setLastName(currentStaff.lastName);
        if (currentStaff.phone) setPhone(currentStaff.phone);
        if (currentStaff.email) setEmail(currentStaff.email);
      }
      setMotto(school.motto || "Excellence, Wisdom & Innovation");
      setAddress(school.address || "Main Campus Drive");
      setTerm(school.term || "First term · 2026/27");
      setOpenTime(school.openTime || "07:30");
      setCloseTime(school.closeTime || "15:30");
    }
  }, [visible, school, currentStaff]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error("First Name Required", {
        description: "Please enter your legal first name.",
      });
      return;
    }

    try {
      await act(async () => {
        // 1. Update Profile
        await services.updateProfile(context, {
          titlePrefix,
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });

        // 2. If Proprietor, update school details (strictly excluding school name)
        if (isOwner) {
          await services.updateSchool(context, {
            motto: motto.trim(),
            address: address.trim(),
            term: term.trim(),
            openTime: openTime.trim(),
            closeTime: closeTime.trim(),
          });
        }
      }, "Profile & school details saved successfully!");

      refresh();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile details.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: "90%" }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sheetTitle}>Edit Profile & Settings</Text>
              <Text style={styles.sheetSubtitle}>
                Manage your identity and institutional parameters
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={18} color={colors.slate500} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Personal Details Section */}
            <View style={styles.sectionHeader}>
              <Icon name="profile" size={15} color={colors.orange} />
              <Text style={styles.sectionHeaderText}>PERSONAL PROFILE DETAILS</Text>
            </View>

            {/* Title Selector */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Title Prefix</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.titlesRow}
              >
                {personTitles.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTitlePrefix(t)}
                    style={[
                      styles.titleChip,
                      titlePrefix === t && styles.titleChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.titleChipText,
                        titlePrefix === t && styles.titleChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Name Fields */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Field
                  label="First Name *"
                  placeholder="e.g. Al-Mubarak"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Middle Name"
                  placeholder="e.g. Sani"
                  value={middleName}
                  onChangeText={setMiddleName}
                />
              </View>
            </View>

            <Field
              label="Last Name / Surname"
              placeholder="e.g. Danjuma"
              value={lastName}
              onChangeText={setLastName}
            />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Phone Number"
                  placeholder="+234 803 000 0000"
                  value={phone}
                  onChangeText={setPhone}
                  icon="phone"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Email Address"
                  placeholder="user@school.ng"
                  value={email}
                  onChangeText={setEmail}
                  icon="sms"
                />
              </View>
            </View>

            {/* Proprietor School Settings */}
            {isOwner && (
              <View style={styles.schoolSectionWrap}>
                <View style={styles.sectionHeader}>
                  <Icon name="school" size={15} color={colors.navy} />
                  <Text style={styles.sectionHeaderText}>SCHOOL INSTITUTIONAL INFORMATION</Text>
                </View>

                {/* READ-ONLY LOCKED SCHOOL NAME */}
                <View style={styles.lockedSchoolCard}>
                  <View style={styles.lockedTop}>
                    <View style={styles.lockedBadge}>
                      <Icon name="lock" size={13} color={colors.slate600} />
                      <Text style={styles.lockedBadgeText}>IMMUTABLE / ACCREDITED</Text>
                    </View>
                    <Badge text="LOCKED" tone="neutral" />
                  </View>
                  <Text style={styles.lockedSchoolName}>{school.name}</Text>
                  <Text style={styles.lockedHint}>
                    Official accredited institutional name registered with State Ministry of Education and cannot be modified.
                  </Text>
                </View>

                <Field
                  label="School Motto / Tagline"
                  placeholder="e.g. Excellence, Wisdom & Innovation"
                  value={motto}
                  onChangeText={setMotto}
                  icon="verify"
                />

                <Field
                  label="Campus Physical Address"
                  placeholder="e.g. Km 12 Airport Road, Abuja"
                  value={address}
                  onChangeText={setAddress}
                  icon="location"
                />

                <Field
                  label="Academic Session & Term"
                  placeholder="e.g. First term · 2026/27"
                  value={term}
                  onChangeText={setTerm}
                  icon="calendar"
                />

                <View style={styles.rowTwo}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Opening Time"
                      placeholder="07:30"
                      value={openTime}
                      onChangeText={setOpenTime}
                      icon="clock"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Dismissal Time"
                      placeholder="15:30"
                      value={closeTime}
                      onChangeText={setCloseTime}
                      icon="clock"
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action */}
          <View style={styles.sheetFooter}>
            <Button
              title="Save Changes"
              variant="primary"
              size="lg"
              loading={busy}
              disabled={busy || !firstName.trim()}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  modalScrim: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  sectionHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate500,
    letterSpacing: 0.8,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  titlesRow: {
    gap: 8,
  },
  titleChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleChipActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  titleChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  titleChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  rowTwo: {
    flexDirection: "row",
    gap: 12,
  },
  schoolSectionWrap: {
    gap: spacing.md,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
  },
  lockedSchoolCard: {
    backgroundColor: colors.slate100,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lockedBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate600,
    letterSpacing: 0.5,
  },
  lockedSchoolName: {
    fontFamily: fonts.extra,
    fontSize: 17,
    color: colors.navy,
  },
  lockedHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  sheetFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
});
