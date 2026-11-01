import { router, Href } from "expo-router";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "../components/Icon";
import { Glass } from "../components/Glass";
import {
  Button,
  Card,
  ListItem,
  Screen,
  Section,
  colors,
  fonts,
  Badge,
  shadows,
} from "../components/ui";
import { can, Role } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { FullscreenScannerModal } from "./FullscreenScannerModal";

export interface WorkItem {
  permission: string;
  category: "Academic & Students" | "Billing & Finance" | "People & Attendance" | "Administration";
  title: string;
  subtitle: string;
  icon: IconName;
  href: Href;
  badge?: string;
  badgeTone?: "neutral" | "warning" | "success" | "purple";
  tintColor: string;
}

export const workItems: WorkItem[] = [
  {
    permission: "children",
    category: "Academic & Students",
    title: "My Children & Classes",
    subtitle: "Student profiles, grade rosters & term fees",
    icon: "people",
    href: "/fees",
    tintColor: "#4f46e5",
  },
  {
    permission: "students",
    category: "Academic & Students",
    title: "Students & Class Rosters",
    subtitle: "Classes, CSV bulk import & enrollment",
    icon: "school",
    href: "/fees",
    badge: "CSV Import",
    badgeTone: "purple",
    tintColor: "#0284c7",
  },
  {
    permission: "lessons",
    category: "Academic & Students",
    title: "Lesson Plans & Curriculum",
    subtitle: "Structured syllabus & teaching preparation",
    icon: "book",
    href: "/lessons",
    tintColor: "#8b5cf6",
  },
  {
    permission: "classes",
    category: "Academic & Students",
    title: "Classrooms & Arms",
    subtitle: "Manage grade levels, arms, capacity & term fees",
    icon: "school",
    href: "/classes",
    badge: "Arms & Fees",
    badgeTone: "purple",
    tintColor: "#4f46e5",
  },
  {
    permission: "profile",
    category: "Academic & Students",
    title: "Official Academic Calendar",
    subtitle: "Term schedules, breaks, examinations & events",
    icon: "calendar",
    href: "/calendar",
    badge: "Calendar",
    badgeTone: "warning",
    tintColor: "#ea580c",
  },
  {
    permission: "payments",
    category: "Billing & Finance",
    title: "Payment History & Receipts",
    subtitle: "Instant bank transfers, card receipts & QR verify",
    icon: "receipt",
    href: "/receipts",
    badge: "QR Receipts",
    badgeTone: "success",
    tintColor: "#10b981",
  },
  {
    permission: "fees",
    category: "Billing & Finance",
    title: "Class Fee Configurations",
    subtitle: "Tuition, uniforms, bus & development levies",
    icon: "wallet",
    href: "/fees",
    tintColor: "#ea580c",
  },
  {
    permission: "finance",
    category: "Billing & Finance",
    title: "Financial Ledger & Treasury",
    subtitle: "Bank transfer settlements & fee collection",
    icon: "chart",
    href: "/finance",
    badge: "Treasury",
    badgeTone: "success",
    tintColor: "#0284c7",
  },
  {
    permission: "directory",
    category: "People & Attendance",
    title: "Parents & Guardians Directory",
    subtitle: "Family profiles, linked wards & direct contact",
    icon: "people",
    href: "/parents",
    badge: "Directory",
    badgeTone: "purple",
    tintColor: "#7c3aed",
  },
  {
    permission: "attendance",
    category: "People & Attendance",
    title: "Biometric Attendance & Clock",
    subtitle: "Facial camera verification & campus geofence",
    icon: "camera",
    href: "/attendance",
    badge: "Face ID",
    badgeTone: "neutral",
    tintColor: "#ea580c",
  },
  {
    permission: "directory",
    category: "People & Attendance",
    title: "Staff Management & Invites",
    subtitle: "Team directory, roles & class assignments",
    icon: "userAdd",
    href: "/directory",
    badge: "Roles & Rules",
    badgeTone: "purple",
    tintColor: "#4f46e5",
  },
  {
    permission: "leave",
    category: "People & Attendance",
    title: "Leave Requests & Time Off",
    subtitle: "Annual, medical & emergency requests",
    icon: "calendar",
    href: "/leave",
    tintColor: "#64748b",
  },
  {
    permission: "approvals",
    category: "People & Attendance",
    title: "Executive Approvals",
    subtitle: "Pending leave & staff submissions",
    icon: "verify",
    href: "/approvals",
    badge: "Management",
    badgeTone: "warning",
    tintColor: "#ea580c",
  },
  {
    permission: "payroll",
    category: "Administration",
    title: "Automated & Manual Payroll",
    subtitle: "Salary structures, rule-based disburse & payslips",
    icon: "wallet",
    href: "/payroll",
    badge: "Auto Disburse",
    badgeTone: "success",
    tintColor: "#059669",
  },
];

export function workspaceLabel(role: Role) {
  return role === "parent"
    ? "Parent Portal"
    : role === "finance"
      ? "Finance Hub"
      : ["teacher", "staff"].includes(role)
        ? "Staff Desk"
        : "Campus Operations";
}

export function WorkspaceTools() {
  const { context } = useSchool();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const availableItems = workItems.filter(
    (item) =>
      can(context.role, item.permission) &&
      (search.trim() === "" ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(search.toLowerCase())),
  );

  const categories = [
    "Academic & Students",
    "Billing & Finance",
    "People & Attendance",
    "Administration",
  ] as const;

  return (
    <Screen
      title={workspaceLabel(context.role)}
      subtitle="Institutional management hub & operational command."
    >
      {/* Modern Search Bar */}
      <View style={[styles.searchBarContainer, shadows.sm]}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search management tools, rosters, finance…"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Icon name="close" size={16} color={colors.muted} filled />
          </Pressable>
        )}
      </View>

      {/* Category Pills Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        <Pressable
          onPress={() => setActiveCategory("all")}
          style={[
            styles.categoryPill,
            activeCategory === "all" && styles.categoryPillActive,
          ]}
        >
          <Text
            style={[
              styles.categoryPillText,
              activeCategory === "all" && styles.categoryPillTextActive,
            ]}
          >
            All Modules
          </Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[
              styles.categoryPill,
              activeCategory === cat && styles.categoryPillActive,
            ]}
          >
            <Text
              style={[
                styles.categoryPillText,
                activeCategory === cat && styles.categoryPillTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Render Categorized Cards */}
      {categories.map((cat) => {
        if (activeCategory !== "all" && activeCategory !== cat) return null;
        const catItems = availableItems.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;

        return (
          <View key={cat} style={{ gap: 10 }}>
            <Section title={cat} />
            <Card style={styles.cleanWorkCard}>
              {catItems.map((item) => (
                <Pressable
                  key={item.title}
                  onPress={() => router.push(item.href)}
                  style={({ pressed }) => [
                    styles.workRow,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View
                    style={[
                      styles.workIconTile,
                      { backgroundColor: item.tintColor + "14" },
                    ]}
                  >
                    <Icon
                      name={item.icon}
                      size={19}
                      color={item.tintColor}
                      filled
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.workTitle}>{item.title}</Text>
                      {item.badge && (
                        <Badge
                          text={item.badge}
                          tone={item.badgeTone || "neutral"}
                        />
                      )}
                    </View>
                    <Text style={styles.workSub} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Icon name="chevron" size={15} color={colors.faint} />
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

export function QuickActions({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { context, data, services, act, busy, feedback } = useSchool();
  const insets = useSafeAreaInsets();
  const open = data.attendance.some((a) => !a.outAt);
  const isOwner = context.role === "owner" || context.role === "admin";
  const isTeacher = context.role === "teacher";
  const isParent = context.role === "parent";

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close quick actions"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Glass
          style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 14 }}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ gap: 3 }}>
                <Text style={styles.modalTitle}>Quick Action Suite</Text>
                <Text style={styles.modalSub}>Select a tool to launch immediately.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={onClose}
                style={styles.modalCloseIcon}
              >
                <Icon name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>

            {feedback !== "" && (
              <View style={styles.feedbackNotice}>
                <Text style={styles.feedbackNoticeText}>{feedback}</Text>
              </View>
            )}

            {/* Fullscreen Scanner Hub */}
            <Button
              title="Fullscreen Universal Scanner"
              icon="scan"
              variant="primary"
              size="lg"
              onPress={() => go("/scan-utility")}
            />

            {/* Attendance Clock action */}
            {can(context.role, "attendance") && (
              <Button
                title={open ? "Campus Clock Out" : "Biometric Clock-In & Roster"}
                icon="clock"
                variant={open ? "outline" : "secondary"}
                size="lg"
                disabled={busy}
                onPress={() => go("/attendance")}
              />
            )}

            {/* Owner quick shortcuts */}
            {isOwner && (
              <>
                <ListItem
                  title="Invite Staff Member"
                  subtitle="Add teacher or administrator with specific roles"
                  icon="userAdd"
                  badge="Proprietor Tool"
                  badgeTone="warning"
                  onPress={() => go("/directory")}
                />
                <ListItem
                  title="Class Management & CSV Import"
                  subtitle="Bulk upload student roster via CSV or manual"
                  icon="upload"
                  badge="Batch Tool"
                  badgeTone="purple"
                  onPress={() => go("/fees")}
                />
                <ListItem
                  title="Run Automatic Payroll"
                  subtitle="Preview and disburse monthly staff salaries"
                  icon="wallet"
                  badge="Fintech"
                  badgeTone="success"
                  onPress={() => go("/payroll")}
                />
              </>
            )}

            {/* Parent quick shortcuts */}
            {isParent && (
              <>
                <ListItem
                  title="Pay School Fees"
                  subtitle="Virtual accounts, Card or USSD"
                  icon="wallet"
                  badge="Instant Clearance"
                  badgeTone="success"
                  onPress={() => go("/fees")}
                />
                <ListItem
                  title="View Official Receipts"
                  subtitle="Download QR verified payment receipts"
                  icon="receipt"
                  onPress={() => go("/receipts")}
                />
              </>
            )}

            {/* Teacher quick shortcuts */}
            {isTeacher && (
              <>
                <ListItem
                  title="Prepare Lesson Note"
                  subtitle="Create curriculum notes for your class"
                  icon="book"
                  onPress={() => go({ pathname: "/lessons", params: { create: "1" } })}
                />
                <ListItem
                  title="Request Time Off"
                  subtitle="Submit annual or medical leave request"
                  icon="calendar"
                  onPress={() => go({ pathname: "/leave", params: { create: "1" } })}
                />
              </>
            )}

            {can(context.role, "finance") && (
              <ListItem
                title="Review Bank Transfers"
                subtitle="Verify offline bank deposit submissions"
                icon="chart"
                onPress={() => go("/finance")}
              />
            )}
          </ScrollView>
        </Glass>
      </View>
    </Modal>
  );
}

export function FloatingNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (name: string) => void;
}) {
  const { context, data } = useSchool();
  const [actions, setActions] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const unreadCount = data.notices.filter((n) => !n.read).length;

  const tabs: { name: string; title: string; icon: IconName; count?: number }[] = [
    { name: "home", title: "Home", icon: "home" },
    {
      name: "wallet",
      title: "Wallet",
      icon: "wallet",
    },
    { name: "actions", title: "Scan", icon: "scan" },
    {
      name: "messages",
      title: "Connect",
      icon: "sms",
      count: 2,
    },
    { name: "more", title: "Profile", icon: "profile" },
  ];

  const currentMembership = data.memberships.find((m) => m.userId === context.userId);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.navOuter, { bottom: Math.max(insets.bottom, 12) }]}
      >
        <Glass style={styles.navBar}>
          {tabs.map((tab) =>
            tab.name === "actions" ? (
              <Pressable
                key={tab.name}
                accessibilityRole="button"
                accessibilityLabel="Universal QR and Face Scanner"
                onPress={() => setScannerOpen(true)}
                onLongPress={() => setActions(true)}
                style={({ pressed }) => [
                  styles.centerAddBtn,
                  shadows.sm,
                  {
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Icon name="scan" size={24} color="#ffffff" />
              </Pressable>
            ) : (
              <Pressable
                key={tab.name}
                accessibilityRole="tab"
                accessibilityLabel={tab.title}
                accessibilityState={{ selected: active === tab.name }}
                onPress={() => onNavigate(tab.name)}
                style={styles.tabItem}
              >
                <View style={{ position: "relative" }}>
                  {tab.name === "more" && currentMembership?.avatar ? (
                    <Image
                      source={{ uri: currentMembership.avatar }}
                      style={[
                        styles.tabUserAvatar,
                        active === "more" && styles.tabUserAvatarActive,
                      ]}
                    />
                  ) : (
                    <Icon
                      name={tab.icon}
                      size={20}
                      filled={active === tab.name}
                      color={active === tab.name ? colors.orange : colors.muted}
                    />
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <View style={styles.tabBadgeDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    active === tab.name && styles.tabLabelActive,
                  ]}
                >
                  {tab.title}
                </Text>
                {active === tab.name && <View style={styles.tabActiveBar} />}
              </Pressable>
            ),
          )}
        </Glass>
      </View>
      <QuickActions visible={actions} onClose={() => setActions(false)} />
      <FullscreenScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
  },
  categoryScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryPillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
  },
  categoryPillTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  cleanWorkCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    gap: 10,
  },
  workRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  workIconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  workTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  workSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  navOuter: {
    position: "absolute",
    left: 14,
    right: 14,
    alignItems: "center",
  },
  navBar: {
    borderRadius: 24,
    flexDirection: "row",
    height: 68,
    alignItems: "center",
    paddingHorizontal: 8,
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.8)",
  },
  centerAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
    position: "relative",
  },
  tabUserAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  tabUserAvatarActive: {
    borderColor: colors.orange,
    borderWidth: 1.5,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
  },
  tabLabelActive: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  tabActiveBar: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.orange,
    position: "absolute",
    bottom: -1,
  },
  tabBadgeDot: {
    position: "absolute",
    top: -1,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.orange,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
    backgroundColor: "#ffffff",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  modalSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  modalCloseIcon: {
    padding: 4,
  },
  feedbackNotice: {
    backgroundColor: colors.greenLight,
    padding: 10,
    borderRadius: 10,
  },
  feedbackNoticeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.greenText,
  },
});
