import React, { useState, useMemo } from "react";
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
import { router } from "expo-router";
import { toast } from "sonner-native";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
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

export function MessagesScreen() {
  const { data, context, school, act } = useSchool();
  const { channels, createChannel } = useChatStore();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "broadcast" | "class" | "direct">("all");
  const [createModal, setCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"broadcast" | "class" | "direct">("broadcast");

  // Create Flow State
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newInitialMsg, setNewInitialMsg] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>(data.classes[0]?.id || "");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(data.staff[0]?.id || "");

  const isOwner = context.role === "owner" || context.role === "admin";

  // Dynamically populate 1:1 chats with staff members
  const staffDirectChats = useMemo<ChatChannel[]>(() => {
    return data.staff
      .filter((s) => s.userId !== context.userId)
      .map((s) => ({
        id: `direct-${s.id}`,
        messageIdCode: `#DIR-${s.id.toUpperCase().slice(0, 8)}`,
        title: s.name,
        type: "direct" as const,
        subtitle: `${s.title} · ${roleLabels[s.role || "teacher"]}`,
        avatar: s.avatar,
        badge: (s.role || "staff").toUpperCase(),
        lastMessage: "Tap to begin private 1-on-1 staff consultation…",
        lastMessageTime: "Active",
        unreadCount: 0,
        messages: [
          {
            id: `msg-${s.id}`,
            senderId: s.userId,
            senderName: s.name,
            senderRole: s.role,
            text: `Hello! I am ${s.name}, ${s.title}. How can I assist you with classroom or administrative matters today?`,
            timestamp: "Today",
          },
        ],
      }));
  }, [data.staff, context.userId]);

  const allChannels = useMemo(() => {
    // Merge store channels and direct staff channels without duplicate ids
    const storeIds = new Set(channels.map((c) => c.id));
    const extraDirect = staffDirectChats.filter((d) => !storeIds.has(d.id));
    return [...channels, ...extraDirect];
  }, [channels, staffDirectChats]);

  const filteredChannels = useMemo(() => {
    return allChannels.filter((ch) => {
      const matchSearch =
        search.trim() === "" ||
        (ch.title + ch.subtitle + ch.lastMessage + ch.messageIdCode)
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchTab = activeTab === "all" || ch.type === activeTab;
      return matchSearch && matchTab;
    });
  }, [allChannels, search, activeTab]);

  const handleOpenChat = (channel: ChatChannel) => {
    router.push({
      pathname: "/chat-detail" as any,
      params: {
        id: channel.id,
        title: channel.title,
        type: channel.type,
      },
    });
  };

  const handleCreateNewChannel = () => {
    if (createType === "broadcast") {
      if (!newTitle.trim()) {
        toast.error("Please provide a title for the announcement.");
        return;
      }

      const created = createChannel({
        id: `ch-ann-${Date.now()}`,
        messageIdCode: `#CH-CIRCULAR-${Date.now().toString().slice(-4)}`,
        title: newTitle.trim(),
        type: "broadcast",
        subtitle: `${school.name} Campus Circular · Whole School`,
        badge: "Official",
        lastMessage: newInitialMsg.trim() || newTitle.trim(),
        lastMessageTime: "Just now",
        isEncrypted: true,
        membersCount: 480,
        initialMessage: newInitialMsg.trim() || `Official Announcement: ${newTitle.trim()}`,
      });

      setCreateModal(false);
      resetCreateForm();
      handleOpenChat(created);
    } else if (createType === "class") {
      const selectedClass = data.classes.find((c) => c.id === selectedClassId) || data.classes[0];
      const classTitle = newTitle.trim() || `${selectedClass?.name || "Classroom"} Group`;

      const created = createChannel({
        id: `ch-cls-${selectedClass?.id || Date.now()}`,
        messageIdCode: `#CH-${(selectedClass?.name || "CLASS").toUpperCase().replace(/\s+/g, "-")}`,
        title: `${classTitle} · Parents & Faculty`,
        type: "class",
        subtitle: `${selectedClass?.studentCount || 30} students · ${selectedClass?.name}`,
        badge: selectedClass?.name.slice(0, 5).toUpperCase(),
        lastMessage: newInitialMsg.trim() || "Classroom communication channel established.",
        lastMessageTime: "Just now",
        isEncrypted: true,
        membersCount: selectedClass?.studentCount || 30,
        initialMessage: newInitialMsg.trim() || `Welcome to ${selectedClass?.name} official classroom communication forum.`,
      });

      setCreateModal(false);
      resetCreateForm();
      handleOpenChat(created);
    } else {
      const staffMember = data.staff.find((s) => s.id === selectedStaffId) || data.staff[0];
      if (!staffMember) return;

      const created = createChannel({
        id: `direct-${staffMember.id}`,
        messageIdCode: `#DIR-${staffMember.id.toUpperCase().slice(0, 8)}`,
        title: staffMember.name,
        type: "direct",
        subtitle: `${staffMember.title} · ${roleLabels[staffMember.role || "teacher"]}`,
        badge: (staffMember.role || "staff").toUpperCase(),
        lastMessage: newInitialMsg.trim() || "Consultation started.",
        lastMessageTime: "Just now",
        isEncrypted: true,
        membersCount: 2,
        initialMessage: newInitialMsg.trim() || `Direct consultation opened with ${staffMember.name}.`,
      });

      setCreateModal(false);
      resetCreateForm();
      handleOpenChat(created);
    }
  };

  const resetCreateForm = () => {
    setNewTitle("");
    setNewSubtitle("");
    setNewInitialMsg("");
  };

  return (
    <View style={styles.root}>
      {/* Clean Reusable TopBar with Proprietor Action */}
      <TopBar
        title="Connect & Messages"
        back={false}
        rightAction={
          <Pressable
            onPress={() => setCreateModal(true)}
            style={styles.newChatTopBtn}
            hitSlop={8}
          >
            <Icon name="add" size={15} color="#ffffff" filled />
            <Text style={styles.newChatTopBtnText}>+ New</Text>
          </Pressable>
        }
      />

      <View style={styles.contentWrap}>
        {/* Search Bar */}
        <View style={[styles.searchBox, shadows.sm]}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations, message ID & staff…"
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

        {/* Quick Staff Direct Message Row */}
        <View style={styles.staffQuickSection}>
          <View style={styles.staffQuickHeader}>
            <Text style={styles.staffQuickTitle}>Direct Staff Consultations</Text>
            <Text style={styles.staffQuickSub}>{data.staff.length} available</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.staffQuickScroll}
          >
            {data.staff.slice(0, 8).map((st) => (
              <Pressable
                key={st.id}
                onPress={() =>
                  handleOpenChat({
                    id: `direct-${st.id}`,
                    messageIdCode: `#DIR-${st.id.toUpperCase().slice(0, 8)}`,
                    title: st.name,
                    type: "direct",
                    subtitle: `${st.title} · ${roleLabels[st.role || "teacher"]}`,
                    lastMessage: "Consultation ready",
                    lastMessageTime: "Active",
                    messages: [],
                  })
                }
                style={styles.staffQuickChip}
              >
                <View style={styles.staffAvatarWrap}>
                  <Text style={styles.staffAvatarInitial}>{st.name.charAt(0)}</Text>
                  <View style={styles.staffOnlineBadge} />
                </View>
                <Text style={styles.staffQuickName} numberOfLines={1}>
                  {st.name.split(" ")[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Channel Categories Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollContainer}
          contentContainerStyle={styles.categoryScroll}
        >
          {[
            { key: "all", label: "All Chats" },
            { key: "broadcast", label: "Announcements" },
            { key: "class", label: "Class Groups" },
            { key: "direct", label: "Direct 1:1" },
          ].map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => setActiveTab(cat.key as any)}
              style={[
                styles.categoryChip,
                activeTab === cat.key && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeTab === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Channels Roster */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130, gap: 10 }}
        >
          {filteredChannels.length === 0 ? (
            <Empty
              title="No conversations found"
              detail="Try a different search term or start a new message flow."
              icon="sms"
            />
          ) : (
            filteredChannels.map((ch) => (
              <Pressable
                key={ch.id}
                onPress={() => handleOpenChat(ch)}
                style={[styles.channelCard, shadows.sm]}
              >
                <View
                  style={[
                    styles.channelAvatarTile,
                    {
                      backgroundColor:
                        ch.type === "broadcast"
                          ? colors.orangeLight
                          : ch.type === "class"
                            ? colors.indigoLight
                            : colors.greenLight,
                    },
                  ]}
                >
                  <Icon
                    name={
                      ch.type === "broadcast"
                        ? "flash"
                        : ch.type === "class"
                          ? "school"
                          : "profile"
                    }
                    size={22}
                    color={
                      ch.type === "broadcast"
                        ? colors.orange
                        : ch.type === "class"
                          ? colors.indigo
                          : colors.greenDark
                    }
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.channelHeaderRow}>
                    <Text style={styles.channelTitle} numberOfLines={1}>
                      {ch.title}
                    </Text>
                    <Text style={styles.channelTimeText}>{ch.lastMessageTime}</Text>
                  </View>

                  <Text style={styles.channelLastMsg} numberOfLines={1}>
                    {ch.lastMessage}
                  </Text>

                  <View style={styles.channelMetaRow}>
                    <Text style={styles.channelSubtitle} numberOfLines={1}>
                      {ch.subtitle}
                    </Text>
                    <Text style={styles.channelIdTag} numberOfLines={1}>
                      {ch.messageIdCode}
                    </Text>
                  </View>
                </View>

                {ch.unreadCount ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{ch.unreadCount}</Text>
                  </View>
                ) : (
                  <Icon name="chevron" size={16} color={colors.faint} />
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Modal: Proprietor Create Flow */}
      <ModalSheet
        visible={createModal}
        onClose={() => setCreateModal(false)}
        title="Start New Communication"
        subtitle="Broadcast notices, create classroom forums, or reach out 1-on-1."
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ gap: 14 }}
        >
          {/* Communication Type Selector */}
          <View style={{ gap: 8 }}>
            <Txt tone="label">Communication Format</Txt>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { key: "broadcast", label: "Announcement", icon: "flash" },
                { key: "class", label: "Class Group", icon: "school" },
                { key: "direct", label: "Direct 1:1", icon: "profile" },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setCreateType(item.key as any)}
                  style={[
                    styles.createTypeChip,
                    createType === item.key && styles.createTypeChipActive,
                  ]}
                >
                  <Icon
                    name={item.icon as any}
                    size={14}
                    color={createType === item.key ? "#ffffff" : colors.navy}
                  />
                  <Text
                    style={[
                      styles.createTypeChipText,
                      createType === item.key && styles.createTypeChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Conditional Form Fields */}
          {createType === "broadcast" && (
            <View style={{ gap: 12 }}>
              <Field
                label="Circular Title *"
                placeholder="e.g. First Term Mid-Term Assessment Schedule"
                value={newTitle}
                onChangeText={setNewTitle}
                icon="document"
              />

              <Field
                label="Circular Body / Notice Details *"
                placeholder="Type the official message for parents, students, and staff…"
                value={newInitialMsg}
                onChangeText={setNewInitialMsg}
                multiline
              />
            </View>
          )}

          {createType === "class" && (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Txt tone="label">Select Classroom *</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {data.classes.map((cls) => (
                    <Pressable
                      key={cls.id}
                      onPress={() => {
                        setSelectedClassId(cls.id);
                        setNewTitle(`${cls.name} Parents & Faculty`);
                      }}
                      style={[
                        styles.classPickChip,
                        selectedClassId === cls.id && styles.classPickChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.classPickChipText,
                          selectedClassId === cls.id && styles.classPickChipTextActive,
                        ]}
                      >
                        {cls.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Field
                label="Group Name"
                placeholder="e.g. Primary 1 Gold Parents & Faculty"
                value={newTitle}
                onChangeText={setNewTitle}
                icon="people"
              />

              <Field
                label="Introductory Welcome Message"
                placeholder="Welcome pupils and guardians to the term forum…"
                value={newInitialMsg}
                onChangeText={setNewInitialMsg}
                multiline
              />
            </View>
          )}

          {createType === "direct" && (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Txt tone="label">Select Staff Member *</Txt>
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 8 }}>
                    {data.staff.map((st) => (
                      <Pressable
                        key={st.id}
                        onPress={() => setSelectedStaffId(st.id)}
                        style={[
                          styles.staffSelectRow,
                          selectedStaffId === st.id && styles.staffSelectRowActive,
                        ]}
                      >
                        <View style={styles.staffSelectAvatar}>
                          <Text style={styles.staffSelectInitial}>{st.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.staffSelectName}>{st.name}</Text>
                          <Text style={styles.staffSelectRole}>{st.title} · {roleLabels[st.role || "teacher"]}</Text>
                        </View>
                        {selectedStaffId === st.id && (
                          <Icon name="check" size={16} color={colors.navy} filled />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <Field
                label="Initial Message"
                placeholder="Hello, I would like to consult with you on…"
                value={newInitialMsg}
                onChangeText={setNewInitialMsg}
                multiline
              />
            </View>
          )}

          <Button
            title="Launch Conversation Channel"
            size="lg"
            variant="primary"
            icon="sms"
            onPress={handleCreateNewChannel}
          />
        </KeyboardAvoidingView>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  newChatTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  newChatTopBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
    height: "100%",
  },
  staffQuickSection: {
    gap: 8,
  },
  staffQuickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  staffQuickTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  staffQuickSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  staffQuickScroll: {
    gap: 10,
  },
  staffQuickChip: {
    alignItems: "center",
    gap: 4,
    width: 58,
  },
  staffAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  staffAvatarInitial: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#ffffff",
  },
  staffOnlineBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.greenDark,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  staffQuickName: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.navy,
    textAlign: "center",
  },
  categoryScrollContainer: {
    flexGrow: 0,
    height: 42,
  },
  categoryScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  categoryChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  channelAvatarTile: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  channelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  channelTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    flex: 1,
    marginRight: 6,
  },
  channelTimeText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.faint,
  },
  channelLastMsg: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  channelMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  channelSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.faint,
    flex: 1,
  },
  channelIdTag: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.orange,
  },
  unreadBadge: {
    backgroundColor: colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#ffffff",
  },
  createTypeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  createTypeChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  createTypeChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  createTypeChipTextActive: {
    color: "#ffffff",
  },
  classPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  classPickChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  classPickChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  classPickChipTextActive: {
    color: "#ffffff",
  },
  staffSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  staffSelectRowActive: {
    borderColor: colors.navy,
    backgroundColor: "#f8fafc",
  },
  staffSelectAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  staffSelectInitial: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  staffSelectName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  staffSelectRole: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
});
