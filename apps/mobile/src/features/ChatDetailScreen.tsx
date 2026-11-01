import React, { useState, useMemo, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "./Entry";
import { useChatStore, ChatChannel, ChatMessage, ChatAttachment } from "./chatStore";

export function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { data, context, school } = useSchool();
  const params = useLocalSearchParams<{ id?: string; title?: string; type?: string }>();
  const channelId = params.id || "ch-announcements";

  const { channels, getChannelById, sendMessage } = useChatStore();
  const scrollViewRef = useRef<any>(null);

  // Fallback to params or direct lookup
  const channel: ChatChannel = useMemo(() => {
    const existing = getChannelById(channelId);
    if (existing) return existing;

    // Create on-the-fly channel from params if opening a direct staff chat
    const matchingStaff = data.staff.find((s) => `direct-${s.id}` === channelId || s.id === channelId);
    return {
      id: channelId,
      messageIdCode: `#DIR-${(matchingStaff?.id || channelId).toUpperCase().slice(0, 10)}`,
      title: params.title || matchingStaff?.name || "Direct Message",
      type: (params.type as any) || (matchingStaff ? "direct" : "broadcast"),
      subtitle: matchingStaff
        ? `${matchingStaff.title} · ${(roleLabels as Record<string, string>)[matchingStaff.role || "teacher"]}`
        : `${school.name} Channel`,
      lastMessage: "Conversation opened",
      lastMessageTime: "Active",
      isEncrypted: true,
      membersCount: 2,
      messages: [
        {
          id: "init-1",
          senderId: matchingStaff?.userId || "staff-desk",
          senderName: matchingStaff?.name || "Institutional Desk",
          senderRole: matchingStaff?.role || "teacher",
          text: `Hello! I am ${matchingStaff?.name || "available"}, ${matchingStaff?.title || "Staff"}. How can I assist you with classroom or administrative matters today?`,
          timestamp: "Today",
        },
      ],
    };
  }, [channelId, getChannelById, params.title, params.type, data.staff, school.name]);

  const [inputText, setInputText] = useState("");
  const [infoModal, setInfoModal] = useState(false);
  const [attachModal, setAttachModal] = useState(false);
  const [muted, setMuted] = useState(false);

  const isOwner = context.role === "owner" || context.role === "admin";

  const handleSend = (overrideText?: string, attachment?: ChatAttachment) => {
    const textToSend = overrideText || inputText.trim();
    if (!textToSend && !attachment) return;

    sendMessage(channel.id, {
      senderId: context.userId,
      senderName: context.userId.replace("demo-", ""),
      senderRole: context.role,
      text: textToSend,
      isMe: true,
      attachment,
    });

    setInputText("");
    setAttachModal(false);

    // Auto scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleQuickAction = (actionTitle: string, template: string) => {
    handleSend(template);
  };

  const handleSimulateCall = () => {
    Alert.alert(
      "Direct Call",
      `Dial ${channel.title} at ${(school as any).phone || "+234 800 000 0000"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call Now", onPress: () => Alert.alert("Connecting", "Calling via institution line…") },
      ],
    );
  };

  const handleCopyMessageId = () => {
    Alert.alert(
      "Channel ID Copied",
      `Unique Message Identifier: ${channel.messageIdCode}\n\nUse this ID for institutional auditing, dispute reconciliation, or parent inquiries.`,
    );
  };

  const handleOpenInfo = () => {
    router.push({
      pathname: "/chat-info",
      params: { id: channel.id },
    } as any);
  };

  return (
    <View style={styles.root}>
      {/* Top Bar Touching Status Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.topBarContent}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Icon name="back" size={20} color={colors.navy} />
          </Pressable>

          {/* Channel Info & Avatar */}
          <Pressable
            onPress={handleOpenInfo}
            style={styles.headerInfoBtn}
            hitSlop={6}
          >
            <View
              style={[
                styles.headerAvatar,
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
                size={18}
                color={
                  channel.type === "broadcast"
                    ? colors.orange
                    : channel.type === "class"
                      ? colors.indigo
                      : colors.greenDark
                }
              />
            </View>

            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {channel.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSub} numberOfLines={1}>
                  {channel.subtitle}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Header Action Buttons */}
          <View style={styles.headerActions}>
            <Pressable onPress={handleSimulateCall} style={styles.headerIconBtn} hitSlop={8}>
              <Icon name="call" size={18} color={colors.navy} />
            </Pressable>

            <Pressable onPress={handleOpenInfo} style={styles.headerIconBtn} hitSlop={8}>
              <Icon name="info" size={18} color={colors.navy} />
            </Pressable>
          </View>
        </View>

        {/* Message ID / Audit Verification Sub-Header */}
        <Pressable onPress={handleCopyMessageId} style={styles.messageIdBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="shield" size={13} color={colors.navy} />
            <Text style={styles.messageIdText}>
              Channel ID: <Text style={styles.messageIdBold}>{channel.messageIdCode}</Text>
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.copyIdHint}>Copy ID</Text>
            <Icon name="arrow" size={11} color={colors.muted} />
          </View>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={{ flex: 1 }}
      >
        {/* Message Stream */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageStream}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Institutional Compliance Notice */}
          <View style={styles.complianceCard}>
            <Icon name="lock" size={14} color={colors.muted} />
            <Text style={styles.complianceText}>
              All communications on {channel.messageIdCode} are encrypted and recorded under {school.name} Academic Code of Conduct.
            </Text>
          </View>

          {/* Date Separator */}
          <View style={styles.dateSeparatorRow}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>Today</Text>
            <View style={styles.dateSeparatorLine} />
          </View>

          {channel.messages.map((msg) => {
            const isMe = msg.isMe || msg.senderId === context.userId;

            return (
              <View
                key={msg.id}
                style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}
              >
                {!isMe && (
                  <View style={styles.senderAvatarBox}>
                    <Text style={styles.senderAvatarInitial}>
                      {msg.senderName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
                  {!isMe && (
                    <View style={styles.senderHeaderRow}>
                      <Text style={styles.senderNameText} numberOfLines={1}>
                        {msg.senderName}
                      </Text>
                      {msg.senderRole && (
                        <Badge
                          text={(roleLabels as Record<string, string>)[msg.senderRole] || msg.senderRole.toUpperCase()}
                          tone={
                            msg.senderRole === "owner" || msg.senderRole === "admin"
                              ? "warning"
                              : msg.senderRole === "teacher"
                                ? "purple"
                                : "neutral"
                          }
                        />
                      )}
                    </View>
                  )}

                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                    {msg.text}
                  </Text>

                  {/* Attachment Preview Card */}
                  {msg.attachment && (
                    <View
                      style={[
                        styles.attachmentBox,
                        isMe ? styles.attachmentBoxMe : styles.attachmentBoxOther,
                      ]}
                    >
                      <View style={styles.attachmentIconTile}>
                        <Icon
                          name={msg.attachment.type === "pdf" ? "document" : "receipt"}
                          size={18}
                          color={isMe ? "#ffffff" : colors.orange}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text
                          style={[
                            styles.attachmentName,
                            isMe && { color: "#ffffff" },
                          ]}
                          numberOfLines={1}
                        >
                          {msg.attachment.name}
                        </Text>
                        <Text
                          style={[
                            styles.attachmentSize,
                            isMe && { color: "rgba(255,255,255,0.7)" },
                          ]}
                        >
                          {msg.attachment.size} · Tap to inspect
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.bubbleFooterRow}>
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                      {msg.timestamp}
                    </Text>
                    {isMe && (
                      <View style={{ flexDirection: "row", marginLeft: 4 }}>
                        <Icon name="check" size={11} color={colors.blue} filled />
                        <View style={{ marginLeft: -6 }}>
                          <Icon name="check" size={11} color={colors.blue} filled />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {[
            { label: "📢 Send Notice", template: "Official Notice: Please check the latest term schedule update." },
            { label: "📄 Share Guidelines", template: "Attached are the continuous assessment & homework guidelines." },
            { label: "💰 Fee Payment Receipt", template: "Your tuition fee payment receipt STF-2026 has been approved." },
            { label: "📅 Schedule Meeting", template: "Kindly schedule an academic check-in with the proprietor desk." },
          ].map((chip, idx) => (
            <Pressable
              key={idx}
              onPress={() => handleQuickAction(chip.label, chip.template)}
              style={styles.quickActionChip}
              hitSlop={4}
            >
              <Text style={styles.quickActionChipText}>{chip.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Message Composer Bar */}
        <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={() => setAttachModal(true)} style={styles.attachBtn} hitSlop={8}>
            <Icon name="attach" size={20} color={colors.navy} />
          </Pressable>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${channel.title}…`}
            placeholderTextColor="#94a3b8"
            multiline
            style={styles.composerInput}
          />

          <Pressable
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            style={[
              styles.sendBtn,
              inputText.trim() ? styles.sendBtnActive : styles.sendBtnDisabled,
            ]}
            hitSlop={8}
          >
            <Icon
              name="send"
              size={18}
              color={inputText.trim() ? "#ffffff" : "#94a3b8"}
              filled={!!inputText.trim()}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Bottom Sheet */}
      <ModalSheet
        visible={attachModal}
        onClose={() => setAttachModal(false)}
        title="Share Institutional Asset"
        subtitle={`Attach official documents or receipts to ${channel.messageIdCode}`}
      >
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() =>
              handleSend(
                "Attached is the First Term Examination Timetable PDF for all students.",
                { name: "Exam_Timetable_Term_1.pdf", type: "pdf", size: "1.2 MB" },
              )
            }
            style={styles.attachOptionCard}
          >
            <View style={[styles.attachOptionIcon, { backgroundColor: colors.orangeLight }]}>
              <Icon name="document" size={20} color={colors.orange} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.attachOptionTitle}>Official Examination Timetable</Text>
              <Text style={styles.attachOptionSub}>PDF Document · 1.2 MB · Academic Schedule</Text>
            </View>
            <Icon name="chevron" size={16} color={colors.muted} />
          </Pressable>

          <Pressable
            onPress={() =>
              handleSend(
                "Attached is the official payment clearance receipt STF-2026.",
                { name: "Fee_Receipt_Oct2026.png", type: "receipt", size: "340 KB" },
              )
            }
            style={styles.attachOptionCard}
          >
            <View style={[styles.attachOptionIcon, { backgroundColor: colors.greenLight }]}>
              <Icon name="receipt" size={20} color={colors.greenDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.attachOptionTitle}>Fee Clearance & Payment Receipt</Text>
              <Text style={styles.attachOptionSub}>Verified by Bursary Desk · 340 KB</Text>
            </View>
            <Icon name="chevron" size={16} color={colors.muted} />
          </Pressable>

          <Pressable
            onPress={() =>
              handleSend(
                "Weekly classroom homework and practice syllabus has been shared.",
                { name: "Homework_Week4_Syllabus.pdf", type: "pdf", size: "580 KB" },
              )
            }
            style={styles.attachOptionCard}
          >
            <View style={[styles.attachOptionIcon, { backgroundColor: colors.purpleLight }]}>
              <Icon name="book" size={20} color={colors.purple} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.attachOptionTitle}>Lesson Plan & Homework Syllabus</Text>
              <Text style={styles.attachOptionSub}>Weekly curriculum materials for parents</Text>
            </View>
            <Icon name="chevron" size={16} color={colors.muted} />
          </Pressable>
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
  topBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  topBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.greenDark,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  messageIdBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  messageIdText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  messageIdBold: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  copyIdHint: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  messageStream: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  complianceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  complianceText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  dateSeparatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dateSeparatorText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.faint,
    textTransform: "uppercase",
  },
  msgRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  msgRowOther: {
    justifyContent: "flex-start",
  },
  msgRowMe: {
    justifyContent: "flex-end",
  },
  senderAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  senderAvatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  bubbleWrap: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 6,
  },
  bubbleWrapOther: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bubbleWrapMe: {
    backgroundColor: colors.navy,
    borderBottomRightRadius: 4,
  },
  senderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  senderNameText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
    lineHeight: 18,
  },
  bubbleTextMe: {
    color: "#ffffff",
  },
  attachmentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  attachmentBoxOther: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  attachmentBoxMe: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  attachmentIconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  attachmentSize: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  bubbleFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 2,
  },
  bubbleTime: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  bubbleTimeMe: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  quickActionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickActionChipText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 10,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: colors.orange,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
  },
  attachOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  attachOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  attachOptionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  attachOptionSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  infoHeroCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoHeroAvatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoHeroTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  infoHeroSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  idInspectorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: 16,
    marginTop: 10,
  },
  idInspectorCode: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  copyIdBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  copyIdBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  infoDetailsList: {
    marginTop: 12,
    gap: 10,
  },
  infoDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoDetailLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  infoDetailVal: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
