import { useState, useEffect } from "react";

export interface ChatAttachment {
  name: string;
  type: "pdf" | "image" | "receipt";
  size: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  timestamp: string;
  isMe?: boolean;
  attachment?: ChatAttachment;
}

export interface ChatChannel {
  id: string;
  messageIdCode: string; // Unique institutional channel message identifier
  title: string;
  type: "broadcast" | "class" | "direct";
  subtitle: string;
  avatar?: string;
  badge?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount?: number;
  isEncrypted?: boolean;
  membersCount?: number;
  messages: ChatMessage[];
}

const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: "ch-announcements",
    messageIdCode: "#CH-CAMPUS-CIRCULARS-2026",
    title: "Campus Broadcasts & Circulars",
    type: "broadcast",
    subtitle: "Official Institutional Channel · Whole School",
    lastMessage: "Approved mid-term break runs from Oct 24 through Nov 01.",
    lastMessageTime: "09:30 AM",
    unreadCount: 1,
    badge: "Official",
    isEncrypted: true,
    membersCount: 480,
    messages: [
      {
        id: "m-1",
        senderId: "admin",
        senderName: "School Administration",
        senderRole: "owner",
        text: "Welcome to First Term 2026/2027! Please ensure all lesson plans and fee schedules are uploaded to the academic portal.",
        timestamp: "Yesterday",
      },
      {
        id: "m-2",
        senderId: "admin",
        senderName: "Proprietor Desk",
        senderRole: "owner",
        text: "Approved mid-term break runs from Oct 24 through Nov 01. School gates remain open for administrative and bursary matters.",
        timestamp: "09:30 AM",
        attachment: {
          name: "Academic_Calendar_2026_Term1.pdf",
          type: "pdf",
          size: "1.4 MB",
        },
      },
    ],
  },
  {
    id: "ch-pr1-gold",
    messageIdCode: "#CH-PR1-GOLD-2026",
    title: "Primary 1 Gold · Parents & Faculty",
    type: "class",
    subtitle: "32 members · Primary 1 Section",
    lastMessage: "Kindly submit weekly science project materials by Thursday morning.",
    lastMessageTime: "11:15 AM",
    unreadCount: 2,
    badge: "PR1-G",
    isEncrypted: true,
    membersCount: 32,
    messages: [
      {
        id: "m-3",
        senderId: "teacher-1",
        senderName: "Babatunde Fashola",
        senderRole: "teacher",
        text: "Good morning esteemed parents. Homework packets for week 4 have been sent home with the pupils today.",
        timestamp: "10:45 AM",
      },
      {
        id: "m-4",
        senderId: "teacher-1",
        senderName: "Babatunde Fashola",
        senderRole: "teacher",
        text: "Kindly submit weekly science project materials by Thursday morning.",
        timestamp: "11:15 AM",
        attachment: {
          name: "Science_Project_Guidelines.pdf",
          type: "pdf",
          size: "420 KB",
        },
      },
    ],
  },
  {
    id: "ch-jss2-ruby",
    messageIdCode: "#CH-JSS2-RUBY-2026",
    title: "JSS 2 Staff Room & Subject Teachers",
    type: "class",
    subtitle: "8 subject teachers · JSS 2",
    lastMessage: "Unified examination continuous assessments due on Friday portal.",
    lastMessageTime: "Yesterday",
    badge: "JSS2-R",
    isEncrypted: true,
    membersCount: 8,
    messages: [
      {
        id: "m-5",
        senderId: "teacher-2",
        senderName: "Chioma Okonkwo",
        senderRole: "teacher",
        text: "Unified examination continuous assessments due on Friday portal. Please ensure all student test scores are reconciled.",
        timestamp: "Yesterday",
      },
    ],
  },
  {
    id: "ch-bursary",
    messageIdCode: "#CH-BURSARY-DESK-2026",
    title: "Bursary & Financial Inquiries",
    type: "direct",
    subtitle: "Accounts Desk · Online",
    lastMessage: "Bank transfer verification receipt STF-2026 has been reconciled.",
    lastMessageTime: "08:20 AM",
    badge: "Finance",
    isEncrypted: true,
    membersCount: 2,
    messages: [
      {
        id: "m-6",
        senderId: "finance-1",
        senderName: "Bursar Department",
        senderRole: "finance",
        text: "Bank transfer verification receipt STF-2026 has been reconciled. Official receipt is now ready in payments tab.",
        timestamp: "08:20 AM",
        attachment: {
          name: "Payment_Receipt_STF2026.png",
          type: "receipt",
          size: "280 KB",
        },
      },
    ],
  },
];

let globalChannels: ChatChannel[] = [...INITIAL_CHANNELS];
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

export const chatStore = {
  getChannels(): ChatChannel[] {
    return globalChannels;
  },

  getChannelById(id: string): ChatChannel | undefined {
    return globalChannels.find((c) => c.id === id);
  },

  createChannel(channel: Omit<ChatChannel, "messages"> & { initialMessage?: string }): ChatChannel {
    const newChan: ChatChannel = {
      ...channel,
      messages: channel.initialMessage
        ? [
            {
              id: `msg-${Date.now()}`,
              senderId: "me",
              senderName: "School Administration",
              senderRole: "owner",
              text: channel.initialMessage,
              timestamp: "Just now",
              isMe: true,
            },
          ]
        : [],
    };

    globalChannels = [newChan, ...globalChannels];
    notify();
    return newChan;
  },

  sendMessage(
    channelId: string,
    message: Omit<ChatMessage, "id" | "timestamp"> & { timestamp?: string },
  ): ChatMessage {
    const fullMsg: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: message.timestamp || "Just now",
    };

    globalChannels = globalChannels.map((c) => {
      if (c.id === channelId) {
        return {
          ...c,
          lastMessage: fullMsg.text,
          lastMessageTime: "Just now",
          unreadCount: 0,
          messages: [...c.messages, fullMsg],
        };
      }
      return c;
    });

    notify();
    return fullMsg;
  },

  subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  },
};

export function useChatStore() {
  const [channels, setChannels] = useState<ChatChannel[]>(() => chatStore.getChannels());

  useEffect(() => {
    return chatStore.subscribe(() => {
      setChannels([...chatStore.getChannels()]);
    });
  }, []);

  return {
    channels,
    getChannelById: chatStore.getChannelById,
    createChannel: chatStore.createChannel,
    sendMessage: chatStore.sendMessage,
  };
}
