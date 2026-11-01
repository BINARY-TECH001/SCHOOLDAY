import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Icon } from "../../components/Icon";
import { Badge, Card } from "../../components/ui";

export interface NoticeItem {
  id: string;
  title: string;
  body: string;
  date?: string;
  read?: boolean;
  userId?: string;
}

export interface NoticeboardSectionProps {
  notices: NoticeItem[];
  isOwnerOrAdmin: boolean;
}

export function NoticeboardSection({
  notices,
  isOwnerOrAdmin,
}: NoticeboardSectionProps) {
  const latestNotice = notices.find((n) => !n.userId) || notices[0];
  const hasUnread = notices.some((n) => !n.read);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Official Noticeboard</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/notifications")}
        >
          <Text style={styles.sectionActionText}>View All</Text>
        </Pressable>
      </View>

      {latestNotice ? (
        <Card style={styles.noticeCard}>
          <View style={styles.topRow}>
            <View style={styles.iconBox}>
              <Icon name="notification" size={16} color={colors.orange} filled />
            </View>
            <View style={styles.tagGroup}>
              <Text style={styles.categoryTag}>CIRCULAR BULLETIN</Text>
              <Text style={styles.dateStamp}>
                {latestNotice.date || "Official Announcement"}
              </Text>
            </View>
            {hasUnread && <Badge text="NEW" tone="warning" size="sm" />}
          </View>

          <Text style={styles.noticeTitle} numberOfLines={1}>
            {latestNotice.title}
          </Text>
          <Text style={styles.noticeBody} numberOfLines={2}>
            {latestNotice.body}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read full announcement"
            onPress={() => router.push("/notifications")}
            style={styles.readMoreBtn}
          >
            <Text style={styles.readMoreText}>Read Full Notice</Text>
            <Icon name="arrow" size={13} color={colors.orange} />
          </Pressable>
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Icon name="notification" size={20} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>No Announcements Yet</Text>
          <Text style={styles.emptySubtitle}>
            Official campus notices and parent circulars will be displayed here.
          </Text>
          {isOwnerOrAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post Announcement"
              onPress={() => router.push("/notifications")}
              style={styles.postBtn}
            >
              <Icon name="send" size={13} color={colors.orange} />
              <Text style={styles.postBtnText}>Post First Announcement</Text>
            </Pressable>
          )}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  sectionActionText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.orange,
  },
  noticeCard: {
    padding: spacing.md,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tagGroup: {
    flex: 1,
    gap: 1,
  },
  categoryTag: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.orange,
  },
  dateStamp: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  noticeTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    marginTop: 2,
  },
  noticeBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate600,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 2,
  },
  readMoreText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.orange,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 260,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.orangeLight,
  },
  postBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.orange,
  },
});
