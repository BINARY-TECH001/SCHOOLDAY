import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  ModalSheet,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon, IconName } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { Notice } from "../domain/model";
import { useSchool } from "../providers/AppProvider";

export function Notifications() {
  const { data, context, services, act, busy } = useSchool();
  const [filterCategory, setFilterCategory] = useState<
    "all" | "unread" | "fees" | "attendance" | "leave" | "lessons" | "home"
  >("all");
  const [broadcastModal, setBroadcastModal] = useState(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<
    "home" | "fees" | "attendance" | "lessons"
  >("home");

  const isOwner = context.role === "owner" || context.role === "admin";

  const allNotices = data.notices.slice().reverse();
  const filteredNotices = allNotices.filter((n) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "unread") return !n.read;
    return n.target === filterCategory;
  });

  const unreadCount = data.notices.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const unread = data.notices.filter((n) => !n.read);
    for (const n of unread) {
      await services.markRead(context, n.id);
    }
    void act(async () => {}, "All notifications marked as read.");
  };

  const handlePressNotice = async (n: Notice) => {
    if (!n.read) {
      await services.markRead(context, n.id);
      void act(async () => {}, "");
    }
    if (n.target === "fees") {
      router.push("/fees" as any);
    } else if (n.target === "attendance") {
      router.push("/attendance" as any);
    } else if (n.target === "leave") {
      router.push("/leave" as any);
    } else if (n.target === "lessons") {
      router.push("/lessons" as any);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      alert("Please enter title and content.");
      return;
    }
    await act(
      () =>
        services.postNotice(context, {
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          target: broadcastTarget,
        }),
      "School broadcast circular dispatched to community!",
    );
    setBroadcastTitle("");
    setBroadcastBody("");
    setBroadcastModal(false);
  };

  const getTargetIcon = (target: Notice["target"]): IconName => {
    switch (target) {
      case "fees":
        return "wallet";
      case "attendance":
        return "camera";
      case "lessons":
        return "book";
      case "leave":
        return "calendar";
      case "home":
      default:
        return "notification";
    }
  };

  const getTargetMeta = (
    target: Notice["target"],
  ): { label: string; tone: "warning" | "success" | "info" | "neutral" | "purple"; color: string } => {
    switch (target) {
      case "fees":
        return { label: "TUITION", tone: "warning", color: "#f59e0b" };
      case "attendance":
        return { label: "ATTENDANCE", tone: "info", color: "#0284c7" };
      case "lessons":
        return { label: "ACADEMICS", tone: "purple", color: "#8b5cf6" };
      case "leave":
        return { label: "LEAVE", tone: "neutral", color: "#64748b" };
      case "home":
      default:
        return { label: "CIRCULAR", tone: "success", color: "#ea580c" };
    }
  };

  return (
    <View style={styles.root}>
      {/* Sleek TopBar Touching Status Bar */}
      <TopBar
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
            : "All caught up"
        }
        onBack={() => router.back()}
        rightAction={
          <View style={styles.topActionsRow}>
            {unreadCount > 0 && (
              <Pressable
                onPress={handleMarkAllRead}
                style={styles.markReadBtn}
                hitSlop={8}
              >
                <Icon name="check" size={13} color={colors.orange} filled />
                <Text style={styles.markReadBtnText}>Mark read</Text>
              </Pressable>
            )}
            {isOwner && (
              <Pressable
                onPress={() => setBroadcastModal(true)}
                style={styles.newNoticeBtn}
                hitSlop={8}
              >
                <Icon name="add" size={14} color="#ffffff" />
                <Text style={styles.newNoticeBtnText}>Notice</Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Filter Chips Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: "all" as const, label: "All" },
            { key: "unread" as const, label: `Unread (${unreadCount})` },
            { key: "home" as const, label: "Circulars" },
            { key: "fees" as const, label: "Tuition" },
            { key: "attendance" as const, label: "Attendance" },
            { key: "lessons" as const, label: "Academics" },
          ].map((chip) => {
            const active = filterCategory === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilterCategory(chip.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotices.length === 0 ? (
          <Empty
            title="No notifications here"
            detail="Official school circulars, fee updates, and attendance logs will appear here."
            icon="notification"
          />
        ) : (
          <View style={{ gap: 10 }}>
            {filteredNotices.map((n) => {
              const meta = getTargetMeta(n.target);
              return (
                <Pressable
                  key={n.id}
                  onPress={() => handlePressNotice(n)}
                  style={({ pressed }) => [
                    styles.noticeCard,
                    shadows.sm,
                    !n.read && styles.noticeCardUnread,
                    pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconTitleRow}>
                      <View
                        style={[
                          styles.targetIconWrap,
                          { backgroundColor: meta.color + "16" },
                        ]}
                      >
                        <Icon
                          name={getTargetIcon(n.target)}
                          size={15}
                          color={meta.color}
                          filled
                        />
                      </View>
                      <Badge text={meta.label} tone={meta.tone} />
                    </View>

                    <View style={styles.timeWrap}>
                      <Text style={styles.timeText}>
                        {new Date(n.at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                      {!n.read && <View style={styles.unreadDot} />}
                    </View>
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={styles.noticeTitle} numberOfLines={2}>
                      {n.title}
                    </Text>
                    <Text style={styles.noticeBody} numberOfLines={3}>
                      {n.body}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.tapToOpenText}>
                      Tap to view activity & details
                    </Text>
                    <Icon name="chevron" size={14} color={colors.muted} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal: Dispatch Circular */}
      <ModalSheet
        visible={broadcastModal}
        onClose={() => setBroadcastModal(false)}
        title="Post School Circular"
        subtitle="Broadcast an official notification to faculty, students, and parents."
      >
        <Field
          label="Headline / Title *"
          placeholder="e.g. Mid-Term Break Schedule Announcement"
          value={broadcastTitle}
          onChangeText={setBroadcastTitle}
          icon="notification"
        />

        <Field
          label="Circular Announcement Body *"
          placeholder="Write the full circular notice here..."
          value={broadcastBody}
          onChangeText={setBroadcastBody}
          multiline
        />

        <View style={{ gap: 6 }}>
          <Text style={styles.targetLabel}>TARGET CATEGORY</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { key: "home" as const, label: "General" },
              { key: "fees" as const, label: "Tuition" },
              { key: "attendance" as const, label: "Attendance" },
              { key: "lessons" as const, label: "Academics" },
            ].map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setBroadcastTarget(t.key)}
                style={[
                  styles.targetChip,
                  broadcastTarget === t.key && styles.targetChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.targetChipText,
                    broadcastTarget === t.key && styles.targetChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          title="Dispatch Circular Announcement"
          variant="primary"
          size="lg"
          icon="send"
          loading={busy}
          disabled={busy || !broadcastTitle.trim() || !broadcastBody.trim()}
          onPress={handleSendBroadcast}
        />
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  markReadBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  newNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newNoticeBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  filterBarContainer: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  filterChipTextActive: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  noticeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  noticeCardUnread: {
    borderColor: "#fdba74",
    backgroundColor: "#fffbf5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  targetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.orange,
  },
  noticeTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    lineHeight: 20,
  },
  noticeBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
  },
  tapToOpenText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  targetLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  targetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
  },
  targetChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  targetChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.muted,
  },
  targetChipTextActive: {
    color: colors.orange,
    fontFamily: fonts.bold,
  },
});
