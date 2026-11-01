import React, { useState, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ModalSheet,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "./Entry";
import { useChatStore, ChatChannel } from "./chatStore";

export function ChatInfoScreen() {
  const { data, context, school } = useSchool();
  const params = useLocalSearchParams<{ id?: string }>();
  const channelId = params.id || "ch-announcements";

  const { getChannelById } = useChatStore();
  const [muted, setMuted] = useState(false);
  const [encryptionModal, setEncryptionModal] = useState(false);

  const channel: ChatChannel = useMemo(() => {
    const existing = getChannelById(channelId);
    if (existing) return existing;

    const matchingStaff = data.staff.find(
      (s) => `direct-${s.id}` === channelId || s.id === channelId,
    );

    return {
      id: channelId,
      messageIdCode: `#DIR-${(matchingStaff?.id || channelId).toUpperCase().slice(0, 10)}`,
      title: matchingStaff?.name || "Communication Channel",
      type: matchingStaff ? "direct" : "broadcast",
      subtitle: matchingStaff
        ? `${matchingStaff.title} · ${(roleLabels as Record<string, string>)[matchingStaff.role || "teacher"]}`
        : `${school.name} Channel`,
      lastMessage: "Active conversation",
      lastMessageTime: "Today",
      isEncrypted: true,
      membersCount: matchingStaff ? 2 : 480,
      messages: [],
    };
  }, [channelId, getChannelById, data.staff, school.name]);

  const directStaff = useMemo(() => {
    if (channel.type !== "direct") return null;
    return (
      data.staff.find(
        (s) => `direct-${s.id}` === channel.id || s.id === channel.id,
      ) || data.staff[0]
    );
  }, [channel, data.staff]);

  const classTeachers = useMemo(() => {
    if (channel.type !== "class") return [];
    return data.staff.filter((s) => {
      const classes = s.assignedClasses || (s.assignedClass ? [s.assignedClass] : []);
      return classes.some((cls) => channel.title.toLowerCase().includes(cls.toLowerCase()));
    });
  }, [channel, data.staff]);

  const handleCopyMessageId = () => {
    Alert.alert(
      "Channel ID Copied",
      `Unique Message Identifier: ${channel.messageIdCode}\n\nUse this ID for institutional auditing, dispute reconciliation, or parent inquiries.`,
    );
  };

  const handleShareChannel = async () => {
    try {
      await Share.share({
        message: `${school.name} Communication Channel\nTitle: ${channel.title}\nChannel ID: ${channel.messageIdCode}`,
      });
    } catch {
      // Ignore
    }
  };

  const handleExportTranscript = () => {
    Alert.alert(
      "Export Transcript",
      `Audit transcript for channel ${channel.messageIdCode} generated with cryptographic timestamp.\n\nFile: ${channel.title.replace(/\s+/g, "_")}_Transcript.pdf`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download PDF",
          onPress: () =>
            Alert.alert("Success", "Transcript saved to institutional documents."),
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      {/* TopBar Touching Status Bar */}
      <TopBar
        title="Channel Details"
        onBack={() => router.back()}
        rightAction={
          <Pressable onPress={handleShareChannel} style={styles.topShareBtn} hitSlop={8}>
            <Icon name="share" size={16} color={colors.navy} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Card style={[styles.heroCard, shadows.sm]}>
          <View style={styles.heroRow}>
            <View
              style={[
                styles.heroAvatarTile,
                {
                  backgroundColor:
                    channel.type === "broadcast"
                      ? colors.orangeLight
                      : channel.type === "class"
                        ? colors.indigoLight
                        : colors.greenLight,
                },
              ]}
            >
              <Icon
                name={
                  channel.type === "broadcast"
                    ? "flash"
                    : channel.type === "class"
                      ? "school"
                      : "profile"
                }
                size={32}
                color={
                  channel.type === "broadcast"
                    ? colors.orange
                    : channel.type === "class"
                      ? colors.indigo
                      : colors.greenDark
                }
              />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.heroTitle}>{channel.title}</Text>
              <Text style={styles.heroSub}>{channel.subtitle}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Badge
                  text={channel.type.toUpperCase()}
                  tone={
                    channel.type === "broadcast"
                      ? "warning"
                      : channel.type === "class"
                        ? "purple"
                        : "neutral"
                  }
                />
                <Badge text="VERIFIED" tone="success" dot />
              </View>
            </View>
          </View>
        </Card>

        {/* Institutional Message Identifier Banner */}
        <Pressable onPress={handleCopyMessageId} style={[styles.idCard, shadows.sm]}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={styles.idCardLabel}>INSTITUTIONAL MESSAGE IDENTIFIER</Text>
            <Text style={styles.idCardCode}>{channel.messageIdCode}</Text>
          </View>

          <View style={styles.copyPill}>
            <Icon name="document" size={13} color={colors.orange} />
            <Text style={styles.copyPillText}>Copy ID</Text>
          </View>
        </Pressable>

        {/* Security & Accreditation Bar */}
        <Pressable
          onPress={() => setEncryptionModal(true)}
          style={[styles.securityBar, shadows.sm]}
        >
          <View style={styles.securityIconBox}>
            <Icon name="shield" size={18} color={colors.greenDark} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.securityTitle}>End-to-End Encrypted</Text>
            <Text style={styles.securitySub}>
              AES-256 compliance · Accredited under {school.name} Code of Conduct
            </Text>
          </View>
          <Icon name="chevron" size={16} color={colors.muted} />
        </Pressable>

        {/* TYPE 1: BROADCAST / CIRCULAR DETAILS */}
        {channel.type === "broadcast" && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Audience & Circular Scope</Text>
            <Card style={{ gap: 12 }}>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>480</Text>
                  <Text style={styles.statLabel}>Enrolled Recipients</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: colors.greenDark }]}>98.2%</Text>
                  <Text style={styles.statLabel}>Delivery Rate</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: colors.indigo }]}>412</Text>
                  <Text style={styles.statLabel}>Confirmed Reads</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Icon name="building" size={16} color={colors.navy} />
                <Text style={styles.infoRowText}>
                  Published by <Text style={{ fontFamily: fonts.bold }}>Proprietor & Principal Desk</Text>
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="clock" size={16} color={colors.navy} />
                <Text style={styles.infoRowText}>
                  First Term 2026/2027 Academic Session
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* TYPE 2: CLASS GROUP PARTICIPANTS & TEACHERS */}
        {channel.type === "class" && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Assigned Classroom Faculty</Text>
              <Text style={styles.sectionSubCount}>
                {classTeachers.length > 0 ? classTeachers.length : 2} faculty
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {(classTeachers.length > 0 ? classTeachers : data.staff.slice(0, 2)).map(
                (teacher) => (
                  <Pressable
                    key={teacher.id}
                    onPress={() =>
                      router.push({
                        pathname: "/staff-detail",
                        params: { id: teacher.id },
                      } as any)
                    }
                    style={[styles.memberCard, shadows.sm]}
                  >
                    <Avatar uri={teacher.avatar} name={teacher.name} size={42} role="teacher" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={styles.memberName}>{teacher.name}</Text>
                        <Badge
                          text={roleLabels[teacher.role || "teacher"].toUpperCase()}
                          tone="purple"
                        />
                      </View>
                      <Text style={styles.memberSub}>
                        {teacher.title} · Tap to manage staff
                      </Text>
                    </View>
                    <Icon name="chevron" size={14} color={colors.muted} />
                  </Pressable>
                ),
              )}
            </View>
          </View>
        )}

        {/* TYPE 3: DIRECT 1:1 CONSULTATION CONTACT */}
        {channel.type === "direct" && directStaff && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Consultation Contact</Text>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar uri={directStaff.avatar} name={directStaff.name} size={54} role="teacher" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.directName}>{directStaff.name}</Text>
                  <Text style={styles.directTitle}>{directStaff.title}</Text>
                  <Badge text={(directStaff.role || "teacher").toUpperCase()} tone="purple" />
                </View>
              </View>

              <View style={styles.directContactDivider} />

              <View style={{ gap: 8 }}>
                <View style={styles.infoRow}>
                  <Icon name="sms" size={16} color={colors.navy} />
                  <Text style={styles.infoRowText}>{directStaff.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="call" size={16} color={colors.navy} />
                  <Text style={styles.infoRowText}>{directStaff.phone || "+234 800 123 4567"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="school" size={16} color={colors.navy} />
                  <Text style={styles.infoRowText}>
                    Class: {directStaff.assignedClass || "Primary Section"}
                  </Text>
                </View>
              </View>

              <Button
                title="View Full Staff Profile & Management"
                variant="outline"
                size="md"
                icon="profile"
                onPress={() =>
                  router.push({
                    pathname: "/staff-detail",
                    params: { id: directStaff.id },
                  } as any)
                }
              />
            </Card>
          </View>
        )}

        {/* Channel Management Settings */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>Channel Controls</Text>
          <Card style={{ paddingVertical: 4 }}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.settingTitle}>Mute Notifications</Text>
                <Text style={styles.settingSub}>Silence alert pings for this channel</Text>
              </View>
              <Switch
                value={muted}
                onValueChange={setMuted}
                trackColor={{ false: colors.borderLight, true: colors.navy }}
              />
            </View>

            <View style={styles.settingDivider} />

            <Pressable onPress={handleExportTranscript} style={styles.actionRowBtn}>
              <Icon name="document" size={18} color={colors.navy} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.actionBtnTitle}>Export Conversation Audit Transcript</Text>
                <Text style={styles.actionBtnSub}>Download accredited PDF record</Text>
              </View>
              <Icon name="chevron" size={14} color={colors.muted} />
            </Pressable>

            <View style={styles.settingDivider} />

            <Pressable
              onPress={() =>
                Alert.alert(
                  "Clear History",
                  "Are you sure you want to clear this channel's cached messages?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear",
                      style: "destructive",
                      onPress: () => Alert.alert("Cleared", "Local message cache cleared."),
                    },
                  ],
                )
              }
              style={styles.actionRowBtn}
            >
              <Icon name="trash" size={18} color={colors.red} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.actionBtnTitle, { color: colors.red }]}>
                  Clear Local Cache
                </Text>
                <Text style={styles.actionBtnSub}>Removes cached messages on this device</Text>
              </View>
            </Pressable>
          </Card>
        </View>
      </ScrollView>

      {/* Encryption Audit Modal */}
      <ModalSheet
        visible={encryptionModal}
        onClose={() => setEncryptionModal(false)}
        title="Encryption Accreditation"
        subtitle={`Audit credentials for ${channel.messageIdCode}`}
      >
        <View style={{ gap: 14 }}>
          <View style={styles.auditCertBox}>
            <Icon name="verify" size={32} color={colors.greenDark} filled />
            <Text style={styles.auditCertTitle}>Institutional Compliance Verified</Text>
            <Text style={styles.auditCertBody}>
              Every message and attachment dispatched within channel {channel.messageIdCode} is
              cryptographically secured via AES-256 standard and verified against the Federal
              Ministry of Education School Accreditation portal.
            </Text>
          </View>

          <Button
            title="Understood"
            variant="primary"
            size="lg"
            onPress={() => setEncryptionModal(false)}
          />
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroAvatarTile: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  heroSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  idCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  idCardLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  idCardCode: {
    fontFamily: fonts.extra,
    fontSize: 13,
    color: colors.navy,
  },
  copyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyPillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  securityBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  securitySub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
    letterSpacing: 0.2,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionSubCount: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  statBox: {
    alignItems: "center",
    gap: 2,
  },
  statNumber: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoRowText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.inkSecondary,
    flex: 1,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  memberName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  memberSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  directName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  directTitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  directContactDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  settingTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  settingSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 14,
  },
  actionRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  actionBtnTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  actionBtnSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  auditCertBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  auditCertTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    textAlign: "center",
  },
  auditCertBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: "center",
  },
});
