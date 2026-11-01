import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ListItem,
  ModalSheet,
  Section,
  colors,
  fonts,
  radii,
  shadows,
  spacing,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "./Entry";
import { DigitalIdSheet } from "../components/DigitalIdSheet";
import { pickAndUploadImage } from "../services/cloudinary";

export function More({ showBack = false }: { showBack?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const app = useSchool();
  const { context, data, services, school, offline, busy, refresh } = app;

  const [digitalIdOpen, setDigitalIdOpen] = useState(false);
  const [schoolsModal, setSchoolsModal] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const catalog = services.catalog();
  const currentMembership = data.memberships.find(
    (m) => m.userId === context.userId,
  );
  const staff = data.staff.find((s) => s.userId === context.userId);
  const isOwner = context.role === "owner" || context.role === "admin";

  const brandPrimary = school.primaryColor || colors.navy;
  const brandSecondary = school.secondaryColor || colors.orange;

  // Real Cloudinary Upload for Cover Photo
  const handleUploadCover = async () => {
    setUploadingCover(true);
    try {
      const url = await pickAndUploadImage({ aspect: [16, 9] });
      if (url) {
        await app.act(
          () => services.updateSchool(context, { coverPhoto: url }),
          "Campus cover photo updated!",
        );
        refresh();
      }
    } finally {
      setUploadingCover(false);
    }
  };

  // Real Cloudinary Upload for Profile Avatar
  const handleUploadAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadImage({ aspect: [1, 1] });
      if (url) {
        await app.act(
          () => services.updateProfile(context, { avatar: url }),
          "Profile photo updated!",
        );
        refresh();
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-bleed Cover Banner Touching and Covering Status Bar */}
        <View style={[styles.coverContainer, { height: 210 + insets.top, paddingTop: insets.top }]}>
          <Image
            source={{
              uri:
                school.coverPhoto ||
                "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />

          {/* Top Floating Controls on Banner */}
          <View style={[styles.coverHeaderRow, { paddingTop: insets.top + spacing.xs }]}>
            {showBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={styles.floatingBackBtn}
                hitSlop={8}
              >
                <Icon name="back" size={16} color="#ffffff" />
              </Pressable>
            ) : (
              <View style={styles.accreditedPill}>
                <Icon name="shield" size={12} color="#ffffff" filled />
                <Text style={styles.accreditedText}>Accredited Campus</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload cover photo banner"
              onPress={handleUploadCover}
              disabled={uploadingCover}
              style={styles.uploadCoverBtn}
            >
              {uploadingCover ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="camera" size={12} color="#ffffff" filled />
                  <Text style={styles.uploadCoverText}>Edit Cover</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Profile Details Card Overlapping Cover */}
        <View style={styles.heroWrapper}>
          <Card style={[styles.profileHeroCard, shadows.sm]}>
            <View style={styles.profileHeroRow}>
              {/* Overlapping Avatar with Cloudinary Upload */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload avatar photo"
                onPress={handleUploadAvatar}
                disabled={uploadingAvatar}
                style={styles.avatarWrapper}
              >
                <Avatar
                  uri={currentMembership?.avatar}
                  name={currentMembership?.name || "User"}
                  size={76}
                  role={context.role}
                />
                <View style={[styles.avatarCameraBadge, { backgroundColor: brandSecondary }]}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Icon name="camera" size={12} color="#ffffff" filled />
                  )}
                </View>
              </Pressable>

              <View style={styles.profileInfoCol}>
                <Text style={styles.profileFullName} numberOfLines={1}>
                  {currentMembership?.name || "Campus Member"}
                </Text>

                <View style={styles.schoolNameRow}>
                  {school.logo ? (
                    <Image source={{ uri: school.logo }} style={styles.schoolMiniLogo} resizeMode="contain" />
                  ) : (
                    <Icon name="school" size={13} color={colors.slate500} />
                  )}
                  <Text style={styles.schoolNameText} numberOfLines={1}>
                    {school.name}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <Badge text={roleLabels[context.role]} tone="purple" />
                  {staff?.rank ? <Badge text={staff.rank} tone="warning" /> : null}
                  <Badge text="VERIFIED ID" tone="success" dot />
                </View>
              </View>
            </View>

            {/* Quick Profile & School Edit Actions */}
            <View style={styles.actionButtonsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit profile details"
                onPress={() => router.push("/edit-profile" as any)}
                style={styles.actionBtnOutline}
              >
                <Icon name="edit" size={14} color={brandPrimary} />
                <Text style={[styles.actionBtnText, { color: brandPrimary }]}>Edit Profile</Text>
              </Pressable>

              {isOwner && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit school & theme"
                  onPress={() => router.push("/edit-school" as any)}
                  style={[styles.actionBtnFilled, { backgroundColor: brandPrimary }]}
                >
                  <Icon name="school" size={14} color="#ffffff" />
                  <Text style={styles.actionBtnFilledText}>Edit School & Theme</Text>
                </Pressable>
              )}
            </View>
          </Card>
        </View>

        {/* Main Content Sections */}
        <View style={styles.contentWrap}>
          {/* Digital School Identity Pass (Clean card, no border left) */}
          <Pressable
            onPress={() => setDigitalIdOpen(true)}
            style={[styles.digitalIdCard, shadows.sm]}
          >
            <View style={styles.digitalIdLeft}>
              <View style={[styles.digitalIdIconBox, { backgroundColor: `${brandSecondary}18` }]}>
                <Icon name="verify" size={22} color={brandSecondary} filled />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.digitalIdTitle}>Digital School Identity Card</Text>
                <Text style={styles.digitalIdSubtitle}>
                  Permanent QR pass · Tap to open for gate security & credential scan
                </Text>
              </View>
            </View>
            <View style={styles.digitalIdArrow}>
              <Icon name="chevron" size={16} color={brandSecondary} />
            </View>
          </Pressable>

          {/* School Governance & Treasury Management (Proprietor / Admin) */}
          {isOwner && (
            <View style={styles.sectionWrap}>
              <Section
                title="Treasury & Campus Governance"
                subtitle="NUBAN collections, payout settlement & directories"
              />

              <Card style={styles.cleanListCard}>
                <ListItem
                  title="School NUBAN (Tuition Collection)"
                  subtitle="Dedicated Paystack virtual account where parents wire fees"
                  icon="card"
                  badge="Collection"
                  badgeTone="success"
                  onPress={() => router.push("/dedicated-account" as any)}
                />
                <ListItem
                  title="Configure Settlement Bank"
                  subtitle="Proprietor personal/business account for treasury withdrawals"
                  icon="verify"
                  badge="Withdrawal"
                  badgeTone="warning"
                  onPress={() => router.push("/settlement-settings" as any)}
                />
                <ListItem
                  title="Parents & Guardians Directory"
                  subtitle="Dossiers, linked pupils, fee status & direct phone/chat"
                  icon="people"
                  badge="Directory"
                  badgeTone="purple"
                  onPress={() => router.push("/parents" as any)}
                />
                <ListItem
                  title="Academic Classrooms & Arms"
                  subtitle="Grade levels, arms, capacity & fee schedules"
                  icon="school"
                  badge="Classrooms"
                  badgeTone="neutral"
                  onPress={() => router.push("/classes" as any)}
                />
                <ListItem
                  title="Invite New Faculty Staff"
                  subtitle="Step-by-step staff invitation & role assignment"
                  icon="userAdd"
                  badge="Onboarding"
                  badgeTone="warning"
                  onPress={() => router.push("/invite-staff" as any)}
                />
                <ListItem
                  title="Faculty Staff & Directory"
                  subtitle="Staff cards, class allocations & task delegation"
                  icon="people"
                  badge="Directory"
                  badgeTone="neutral"
                  onPress={() => router.push("/directory")}
                />
                <ListItem
                  title="Campus Operating Hours & Shifts"
                  subtitle="Grade-specific arrival, assembly & dismissal schedules"
                  icon="clock"
                  badge="Hours"
                  badgeTone="neutral"
                  onPress={() => router.push("/operating-hours" as any)}
                />
                <ListItem
                  title="Universal Scan & Clock-In Hub"
                  subtitle="Biometric clock-in/out & QR pass verification"
                  icon="camera"
                  badge="Scanner"
                  badgeTone="neutral"
                  onPress={() => router.push("/scan-utility" as any)}
                />
                <ListItem
                  title="Official Academic Calendar & Sync"
                  subtitle="MOE circular upload, term milestones & calendar sync"
                  icon="calendar"
                  badge="Official"
                  badgeTone="success"
                  onPress={() => router.push("/academic-calendar" as any)}
                />
                <ListItem
                  title="Staff Payroll Administration"
                  subtitle="Salary schedule, deductions, allowances & payslips"
                  icon="wallet"
                  badge="Payroll"
                  badgeTone="neutral"
                  onPress={() => router.push("/payroll" as any)}
                />
              </Card>
            </View>
          )}

          {/* Teacher Desk & Classrooms */}
          {context.role === "teacher" && (
            <View style={styles.sectionWrap}>
              <Section
                title="Teacher Desk & Classrooms"
                subtitle="Lesson curriculum, class attendance & leaves"
              />

              <Card style={styles.cleanListCard}>
                <ListItem
                  title="My Assigned Classrooms"
                  subtitle={staff?.assignedClasses?.join(", ") || staff?.assignedClass || "View assigned students & roster"}
                  icon="school"
                  onPress={() => router.push("/classes" as any)}
                />
                <ListItem
                  title="Structured Lesson Notes"
                  subtitle="Weekly syllabus & pedagogical preparation"
                  icon="book"
                  onPress={() => router.push("/lessons")}
                />
                <ListItem
                  title="Request Time Off / Leave"
                  subtitle="Annual, medical & bereavement requests"
                  icon="calendar"
                  onPress={() => router.push("/leave")}
                />
              </Card>
            </View>
          )}

          {/* Campus & Delegation */}
          <View style={styles.sectionWrap}>
            <Section
              title="Campus & Session"
              subtitle="Switch institutional workspace and active persona"
            />

            <Card style={styles.cleanListCard}>
              <ListItem
                title={school.name}
                subtitle="Tap to switch campus workspace"
                icon="school"
                badge="Switch"
                badgeTone="neutral"
                onPress={() => setSchoolsModal(true)}
              />
              <ListItem
                title="Switch Active Persona"
                subtitle={`Delegated Role: ${roleLabels[context.role]}`}
                icon="profile"
                badge="Persona"
                badgeTone="neutral"
                onPress={() => router.push("/account")}
              />
              <ListItem
                title="Notifications & Alerts"
                subtitle="Fee reminders, broadcast notices & activity"
                icon="sms"
                onPress={() => router.push("/notifications" as any)}
              />
            </Card>
          </View>

          {/* System & Session Controls */}
          <View style={styles.sectionWrap}>
            <Section
              title="System & Diagnostics"
              subtitle="Local cache & application session"
            />

            <Card style={styles.cleanListCard}>
              <ListItem
                title="Diagnostics & Sandbox Tools"
                subtitle="Offline simulation, local cache & data reset"
                icon="settings"
                onPress={() => setAdvanced(!advanced)}
              />

              {advanced && (
                <View style={{ gap: 10, padding: spacing.md, backgroundColor: colors.surfaceSubtle }}>
                  <Button
                    variant="outline"
                    size="sm"
                    title={offline ? "Offline Simulation: ACTIVE" : "Offline Simulation: INACTIVE"}
                    onPress={() => void app.act(() => app.update({ offline: !offline }), "")}
                  />
                  <Button
                    title="Sync Pending Local Records"
                    variant="primary"
                    size="sm"
                    disabled={busy || offline}
                    onPress={() =>
                      void app.act(
                        () => services.sync(context, offline, false),
                        "Local records synced successfully.",
                      )
                    }
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    title="Reset Sample Database"
                    onPress={() => setConfirmReset(true)}
                  />
                </View>
              )}

              <ListItem
                title="Sign Out"
                subtitle="Safely exit your campus workspace"
                icon="logout"
                onPress={() => setConfirmSignOut(true)}
              />
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Digital ID Pass Sheet */}
      <DigitalIdSheet
        visible={digitalIdOpen}
        onClose={() => setDigitalIdOpen(false)}
      />

      {/* Switch School Modal */}
      <ModalSheet
        visible={schoolsModal}
        onClose={() => setSchoolsModal(false)}
        title="Switch Campus"
        subtitle="Select an accredited school from your affiliations."
      >
        <View style={{ gap: 10 }}>
          {catalog.schools.map((s) => (
            <Card
              key={s.id}
              style={[
                styles.campusCard,
                s.id === school.id && styles.campusCardActive,
              ]}
              onPress={() => {
                void app.update({ context: { ...context, schoolId: s.id } });
                setSchoolsModal(false);
              }}
            >
              <View style={styles.campusCardRow}>
                <View style={[styles.campusIconBox, { backgroundColor: `${brandPrimary}15` }]}>
                  <Icon name="school" size={20} color={brandPrimary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.campusCardName}>{s.name}</Text>
                  <Text style={styles.campusCardAddress}>{s.address}</Text>
                </View>
                {s.id === school.id && <Badge text="ACTIVE" tone="success" dot />}
              </View>
            </Card>
          ))}
        </View>
      </ModalSheet>

      {/* Sign Out Confirmation Modal */}
      <ModalSheet
        visible={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign Out"
        subtitle="Are you sure you want to exit your campus session?"
      >
        <View style={{ gap: 12 }}>
          <Text style={styles.confirmText}>
            You will need your institutional credentials to log back into {school.name}.
          </Text>
          <Button
            title="Sign Out"
            variant="danger"
            onPress={() => {
              setConfirmSignOut(false);
              router.replace("/account" as any);
            }}
          />
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setConfirmSignOut(false)}
          />
        </View>
      </ModalSheet>

      {/* Reset Confirmation Modal */}
      <ModalSheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset Local Sandbox Database"
        subtitle="This action reverts all records to initial seed data."
      >
        <View style={{ gap: 12 }}>
          <Text style={styles.confirmText}>
            All local modifications, new students, classes, and transactions will be reset.
          </Text>
          <Button
            title="Confirm Reset Database"
            variant="danger"
            onPress={async () => {
              setConfirmReset(false);
              await app.act(() => services.resetDatabase(), "Database reset to defaults.");
            }}
          />
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setConfirmReset(false)}
          />
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    gap: 0,
  },
  coverContainer: {
    height: 180,
    width: "100%",
    position: "relative",
    justifyContent: "space-between",
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 17, 32, 0.4)",
  },
  coverHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  floatingBackBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  accreditedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  accreditedText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#ffffff",
  },
  uploadCoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  uploadCoverText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  heroWrapper: {
    paddingHorizontal: spacing.md,
    marginTop: -40,
  },
  profileHeroCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfoCol: {
    flex: 1,
    gap: 4,
  },
  profileFullName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  schoolNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  schoolMiniLogo: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  schoolNameText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate600,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.white,
  },
  actionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  actionBtnFilled: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  actionBtnFilledText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  contentWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  digitalIdCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  digitalIdLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  digitalIdIconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  digitalIdTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  digitalIdSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.slate500,
  },
  digitalIdArrow: {
    paddingLeft: spacing.xs,
  },
  sectionWrap: {
    gap: 8,
  },
  cleanListCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  campusCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  campusCardActive: {
    borderColor: colors.greenDark,
    backgroundColor: colors.greenLight,
  },
  campusCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  campusIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  campusCardName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  campusCardAddress: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  confirmText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate600,
  },
});
