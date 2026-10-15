import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  AppText as Text,
  AppTextInput as TextInput,
} from "../../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../auth/AuthProvider";

import {
  getConversationContacts,
  getConversations,
  getConversationThread,
  replyToConversation,
  sendConversationMessage,
  type ConversationContact,
  type ConversationReply,
  type EmployeeMemo,
} from "../../api/conversations";

import { useTheme } from "../../theme/ThemeProvider";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";

const GROUP_PREFIX = "IM_GROUP::";
const COMPANY_PREFIX = "IM_COMPANY::";
function resolveChatAttachmentUrl(path: string): string {
  const value = path.trim();

  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

  if (!apiBase) return "";

  const normalizedPath = value.replace(/^\/?backend(?=\/)/, "");
  const filePath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  return `${apiBase}${filePath}`;
}

function getChatAttachmentName(path: string): string {
  const cleanPath = path.split(/[?#]/)[0] ?? path;
  const name = cleanPath.split("/").pop() || "Attachment";

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function getChatAttachmentMimeType(
  fileName: string,
  responseMimeType?: string | null,
): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };

  return mimeTypes[extension] ?? responseMimeType ?? "*/*";
}

async function openChatAttachment(
  path: string,
  accessToken?: string | null,
): Promise<void> {
  try {
    const url = resolveChatAttachmentUrl(path);

    if (!url) {
      throw new Error(
        "The attachment URL is missing or the API URL is not configured.",
      );
    }

    // Keep web behavior working if the Expo project is run in a browser.
    if (Platform.OS === "web") {
      await Linking.openURL(url);
      return;
    }

    const originalName = getChatAttachmentName(path);
    const safeName =
      originalName.replace(/[<>:"\/\\|?*\u0000-\u001F]/g, "_") || "attachment";

    const cacheDirectory = FileSystem.cacheDirectory;

    if (!cacheDirectory) {
      throw new Error("Temporary file storage is unavailable.");
    }

    const destination = `${cacheDirectory}${Date.now()}-${safeName}`;

    // Download the file to the phone first.
    const download = await FileSystem.downloadAsync(url, destination, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    if (download.status < 200 || download.status >= 300) {
      throw new Error(
        `Download failed: HTTP ${download.status}\n\n` +
          `Requested URL: ${url}\n\n` +
          `Saved path: ${path}`,
      );
    }

    const mimeType = getChatAttachmentMimeType(safeName, download.mimeType);

    if (Platform.OS === "android") {
      // Other Android applications need a content:// URI and read access.
      const contentUri = await FileSystem.getContentUriAsync(download.uri);

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: mimeType,
        flags: 1,
      });

      return;
    }

    // iOS uses the system share sheet as its compatible-app fallback.
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      throw new Error("File sharing is not available on this device.");
    }

    await Sharing.shareAsync(download.uri, {
      mimeType,
      dialogTitle: `Open ${safeName}`,
    });
  } catch (error) {
    Alert.alert(
      "Unable to open attachment",
      error instanceof Error
        ? error.message
        : "Please check your connection and try again.",
    );
  }
}
type ConversationKind = "direct" | "group" | "company";

type ChatConversation = {
  key: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  employeeId: number | null;
  groupId: string | null;
  memberIds: number[];
  messages: EmployeeMemo[];
  unreadCount: number;
  isArchived: boolean;
  readOnly: boolean;
};

type FilterMode = "all" | "unread" | "archived";
type ChatColors = ReturnType<typeof useTheme>["colors"];

function normalizeId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function contactName(contact?: ConversationContact | null) {
  if (!contact) return "";

  return (
    [contact.employeeFirstName, contact.employeeLastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    contact.employeeID ||
    `Employee #${contact.id}`
  );
}

function getRecipients(message: EmployeeMemo): number[] {
  const ids = message.employeeIDs?.length
    ? message.employeeIDs
    : message.employeeID != null
      ? [message.employeeID]
      : [];

  return ids.map(normalizeId).filter((id): id is number => id != null);
}

function parseGroupSubject(subject?: string | null) {
  if (!subject?.startsWith(GROUP_PREFIX)) return null;

  const rest = subject.slice(GROUP_PREFIX.length);
  const separator = rest.indexOf("::");
  if (separator <= 0) return null;

  const id = rest.slice(0, separator).trim();
  const name = rest.slice(separator + 2).trim();

  return id && name ? { id, name } : null;
}

function parseCompanySubject(subject?: string | null) {
  if (!subject?.startsWith(COMPANY_PREFIX)) return null;

  const rest = subject.slice(COMPANY_PREFIX.length);
  const separator = rest.indexOf("::");
  if (separator <= 0) return null;

  const id = rest.slice(0, separator).trim();
  const name = rest.slice(separator + 2).trim();

  return id && name ? { id, name } : null;
}

function isConversationMessage(message: EmployeeMemo) {
  if (message.undoneAt) return false;

  if (
    message.subject?.startsWith(GROUP_PREFIX) ||
    message.subject?.startsWith(COMPANY_PREFIX)
  ) {
    return true;
  }

  return (message.memoType ?? "General").trim().toLowerCase() === "general";
}

function isOutgoing(
  message: EmployeeMemo,
  employeeId: number,
  selfName: string,
) {
  if (message.senderEmployeeId != null) {
    return Number(message.senderEmployeeId) === employeeId;
  }

  return normalizeName(message.issuedBy) === normalizeName(selfName);
}

function messageTime(message?: EmployeeMemo | null) {
  if (!message) return null;

  return message.createdAt || message.issuedDate || null;
}

function messagePreview(message?: EmployeeMemo) {
  if (!message) return "Start a conversation";
  return message.description?.trim() || "Message";
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function storageKey(kind: "read" | "archived", employeeId: number) {
  return `im-${kind}-${employeeId}`;
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { user, accessToken } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();

  const routeParams = useLocalSearchParams<{ messageId?: string }>();
  const notificationMessageId = Array.isArray(routeParams.messageId)
    ? routeParams.messageId[0]
    : routeParams.messageId;
  const styles = createStyles(colors);

  const employeeId = normalizeId(user?.employee?.id);
  const selfName =
    [user?.employee?.firstName, user?.employee?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user?.username ||
    "Employee";

  const roleLabel = (user?.role || "EMPLOYEE").toUpperCase();

  const [messages, setMessages] = useState<EmployeeMemo[]>([]);
  const [threadReplies, setThreadReplies] = useState<
    Record<number, ConversationReply[]>
  >({});
  const [replyToMessageId, setReplyToMessageId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [archivedIds, setArchivedIds] = useState<Set<number>>(new Set());

  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupMembers, setGroupMembers] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!accessToken || !employeeId) {
        setLoading(false);
        setError(
          employeeId
            ? "Please sign in again to load conversations."
            : "This account is not linked to an employee profile.",
        );
        return;
      }

      if (!silent) {
        if (messages.length === 0 && contacts.length === 0) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
      }

      try {
        const [nextMessages, nextContacts] = await Promise.all([
          getConversations(employeeId, accessToken),
          getConversationContacts(accessToken),
        ]);

        setMessages(
          Array.isArray(nextMessages)
            ? nextMessages.filter(isConversationMessage)
            : [],
        );

        setContacts(
          (Array.isArray(nextContacts) ? nextContacts : []).filter(
            (contact) => contact.id !== employeeId,
          ),
        );

        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load conversations. Check your connection and try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, employeeId, messages.length, contacts.length],
  );

  // Refresh messages when Chat is focused, then periodically while it remains open.
  useFocusEffect(
    useCallback(() => {
      void load(true);

      const interval = setInterval(() => {
        void load(true);
      }, 7000);

      return () => clearInterval(interval);
    }, [load]),
  );

  // Restore read and archived preferences for this employee on this device.
  useEffect(() => {
    if (!employeeId) return;

    let cancelled = false;

    Promise.all([
      AsyncStorage.getItem(storageKey("read", employeeId)),
      AsyncStorage.getItem(storageKey("archived", employeeId)),
    ])
      .then(([readValue, archivedValue]) => {
        if (cancelled) return;

        const parseIds = (value: string | null) => {
          try {
            const parsed: unknown = JSON.parse(value ?? "[]");
            return new Set(
              Array.isArray(parsed)
                ? parsed
                    .map(normalizeId)
                    .filter((id): id is number => id != null)
                : [],
            );
          } catch {
            return new Set<number>();
          }
        };

        setReadIds(parseIds(readValue));
        setArchivedIds(parseIds(archivedValue));
      })
      .catch(() => {
        // The chat remains usable if local preference storage fails.
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const conversations = useMemo(() => {
    if (!employeeId) return [] as ChatConversation[];

    const byKey = new Map<string, ChatConversation>();

    const createDirect = (id: number): ChatConversation => {
      const contact = contacts.find((item) => item.id === id);

      return {
        key: `dm:${id}`,
        kind: "direct",
        title: contactName(contact) || `Employee #${id}`,
        subtitle:
          contact?.designation || contact?.departmentName || "Direct message",
        employeeId: id,
        groupId: null,
        memberIds: [id],
        messages: [],
        unreadCount: 0,
        isArchived: false,
        readOnly: false,
      };
    };

    const createGroup = (
      id: string,
      name: string,
      kind: "group" | "company",
    ): ChatConversation => ({
      key: `${kind}:${id}`,
      kind,
      title: name,
      subtitle:
        kind === "company" ? "Company notifications" : "Group conversation",
      employeeId: null,
      groupId: id,
      memberIds: [],
      messages: [],
      unreadCount: 0,
      isArchived: false,
      readOnly: kind === "company",
    });

    // Show contacts even before a first message has been sent.
    contacts.forEach((contact) => {
      if (contact.id !== employeeId) {
        byKey.set(`dm:${contact.id}`, createDirect(contact.id));
      }
    });

    const nameToId = new Map<string, number>();
    contacts.forEach((contact) => {
      const name = normalizeName(contactName(contact));
      if (name) nameToId.set(name, contact.id);
    });

    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(messageTime(a) || 0).getTime() -
        new Date(messageTime(b) || 0).getTime(),
    );

    sortedMessages.forEach((message) => {
      const company = parseCompanySubject(message.subject);
      if (company) {
        const key = `company:${company.id}`;
        const conversation =
          byKey.get(key) ?? createGroup(company.id, company.name, "company");

        conversation.messages.push(message);
        byKey.set(key, conversation);
        return;
      }

      const group = parseGroupSubject(message.subject);
      if (group) {
        const key = `group:${group.id}`;
        const conversation =
          byKey.get(key) ?? createGroup(group.id, group.name, "group");

        conversation.messages.push(message);

        const memberIds = [
          ...getRecipients(message),
          normalizeId(message.senderEmployeeId),
        ].filter((id): id is number => id != null);

        conversation.memberIds = [
          ...new Set([...conversation.memberIds, ...memberIds]),
        ];

        byKey.set(key, conversation);
        return;
      }

      const senderId = normalizeId(message.senderEmployeeId);
      const recipients = getRecipients(message);
      let counterpart: number | null = null;

      if (senderId === employeeId) {
        counterpart = recipients.find((id) => id !== employeeId) ?? null;
      } else if (senderId != null) {
        counterpart = senderId;
      } else if (recipients.includes(employeeId)) {
        counterpart = recipients.find((id) => id !== employeeId) ?? null;

        if (counterpart == null) {
          counterpart = nameToId.get(normalizeName(message.issuedBy)) ?? null;
        }
      } else {
        const primaryId = normalizeId(message.employeeID);
        if (primaryId !== employeeId) counterpart = primaryId;
      }

      if (!counterpart || counterpart === employeeId) return;

      const key = `dm:${counterpart}`;
      const conversation = byKey.get(key) ?? createDirect(counterpart);

      conversation.messages.push(message);
      byKey.set(key, conversation);
    });

    return [...byKey.values()]
      .map((conversation) => {
        const ordered = [...conversation.messages].sort(
          (a, b) =>
            new Date(messageTime(a) || 0).getTime() -
            new Date(messageTime(b) || 0).getTime(),
        );

        const unreadCount = ordered.filter(
          (message) =>
            !readIds.has(message.id) &&
            !isOutgoing(message, employeeId, selfName),
        ).length;

        const isArchived =
          ordered.length > 0 &&
          ordered.every((message) => archivedIds.has(message.id));

        return {
          ...conversation,
          messages: ordered,
          unreadCount,
          isArchived,
        };
      })
      .sort((a, b) => {
        const aTime = new Date(
          messageTime(a.messages[a.messages.length - 1]) || 0,
        ).getTime();
        const bTime = new Date(
          messageTime(b.messages[b.messages.length - 1]) || 0,
        ).getTime();

        if (a.kind === "company" && b.kind !== "company") return -1;
        if (b.kind === "company" && a.kind !== "company") return 1;

        if (aTime !== bTime) return bTime - aTime;
        return a.title.localeCompare(b.title);
      });
  }, [messages, contacts, employeeId, selfName, readIds, archivedIds]);

  const filteredConversations = useMemo(() => {
    const search = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (filter === "archived" && !conversation.isArchived) return false;
      if (filter !== "archived" && conversation.isArchived) return false;
      if (filter === "unread" && conversation.unreadCount === 0) return false;

      if (!search) return true;

      return (
        conversation.title.toLowerCase().includes(search) ||
        conversation.subtitle.toLowerCase().includes(search) ||
        messagePreview(conversation.messages[conversation.messages.length - 1])
          .toLowerCase()
          .includes(search)
      );
    });
  }, [conversations, query, filter]);

  const selectedConversation =
    conversations.find((conversation) => conversation.key === selectedKey) ??
    null;

  useFocusEffect(
    useCallback(() => {
      if (!selectedConversation) return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          setSelectedKey(null);
          return true;
        },
      );

      return () => subscription.remove();
    }, [selectedConversation]),
  );

  const replyTargetMessage =
    selectedConversation?.messages.find(
      (message) => message.id === replyToMessageId,
    ) ?? null;

  useEffect(() => {
    if (!selectedConversation || !accessToken) {
      setThreadReplies({});
      return;
    }

    let cancelled = false;

    async function loadThreads() {
      const results = await Promise.all(
        selectedConversation!.messages.map(async (message) => {
          try {
            const thread = await getConversationThread(message.id, accessToken);

            return {
              id: message.id,
              replies: Array.isArray(thread?.replies) ? thread.replies : [],
            };
          } catch {
            return {
              id: message.id,
              replies: [],
            };
          }
        }),
      );

      if (cancelled) return;

      const next: Record<number, ConversationReply[]> = {};

      results.forEach(({ id, replies }) => {
        next[id] = replies;
      });

      setThreadReplies(next);
    }

    void loadThreads();

    return () => {
      cancelled = true;
    };
  }, [selectedConversation, accessToken]);

  const markRead = useCallback(
    (ids: number[]) => {
      if (!employeeId || ids.length === 0) return;

      const next = new Set(readIds);
      ids.forEach((id) => next.add(id));

      setReadIds(next);

      void AsyncStorage.setItem(
        storageKey("read", employeeId),
        JSON.stringify([...next]),
      ).catch(() => {});
    },
    [employeeId, readIds],
  );

  useEffect(() => {
    if (!notificationMessageId || loading) return;

    const target = conversations.find((conversation) =>
      conversation.messages.some(
        (message) => String(message.id) === notificationMessageId,
      ),
    );

    if (!target) {
      Alert.alert(
        "Message not found",
        "This notification's message could not be found in your conversations.",
      );
      router.setParams({ messageId: undefined });
      return;
    }

    setSelectedKey(target.key);
    router.setParams({ messageId: undefined });
  }, [notificationMessageId, loading, conversations, router]);

  useEffect(() => {
    if (!selectedConversation) return;

    const unreadIds = selectedConversation.messages
      .filter(
        (message) =>
          !readIds.has(message.id) &&
          employeeId != null &&
          !isOutgoing(message, employeeId, selfName),
      )
      .map((message) => message.id);

    if (unreadIds.length > 0) markRead(unreadIds);
  }, [selectedConversation, readIds, employeeId, selfName, markRead]);

  // A conversation view uses the full screen; the floating tabs are only for the list.
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selectedKey ? { display: "none" } : undefined,
    });

    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation, selectedKey]);

  function openConversation(conversation: ChatConversation) {
    setSelectedKey(conversation.key);
    markRead(conversation.messages.map((message) => message.id));
  }

  async function toggleArchive(conversation: ChatConversation) {
    if (!employeeId || conversation.messages.length === 0) return;

    const next = new Set(archivedIds);

    conversation.messages.forEach((message) => {
      if (conversation.isArchived) next.delete(message.id);
      else next.add(message.id);
    });

    setArchivedIds(next);

    try {
      await AsyncStorage.setItem(
        storageKey("archived", employeeId),
        JSON.stringify([...next]),
      );
    } catch {
      Alert.alert(
        "Chat",
        "Could not save the archive preference on this device.",
      );
    }

    setSelectedKey(null);
  }

  async function sendMessage() {
    const text = draft.trim();

    if (!text || !selectedConversation || !employeeId || !accessToken) return;
    if (selectedConversation.readOnly) return;

    if (replyToMessageId !== null) {
      const parentMessage = selectedConversation.messages.find(
        (message) => message.id === replyToMessageId,
      );

      if (!parentMessage) {
        Alert.alert("Reply", "The original message could not be found.");
        setReplyToMessageId(null);
        return;
      }

      setSending(true);

      try {
        const reply = await replyToConversation(
          parentMessage.id,
          {
            message: text,
            issuedBy: selfName,
            issuedByRole: roleLabel,
            senderEmployeeId: employeeId,
          },
          accessToken,
        );

        setThreadReplies((previous) => ({
          ...previous,
          [parentMessage.id]: [...(previous[parentMessage.id] ?? []), reply],
        }));

        setDraft("");
        setReplyToMessageId(null);
      } catch (caughtError) {
        Alert.alert(
          "Couldn't send reply",
          caughtError instanceof Error
            ? caughtError.message
            : "Please check your connection and try again.",
        );
      } finally {
        setSending(false);
      }

      return;
    }

    const recipientIds =
      selectedConversation.kind === "group"
        ? selectedConversation.memberIds.filter((id) => id !== employeeId)
        : selectedConversation.employeeId != null
          ? [selectedConversation.employeeId]
          : [];

    if (recipientIds.length === 0) {
      Alert.alert("Chat", "No recipients are available for this conversation.");
      return;
    }

    setSending(true);

    try {
      await sendConversationMessage(
        {
          employeeIDs: recipientIds,
          memoType: "General",
          subject:
            selectedConversation.kind === "group"
              ? `${GROUP_PREFIX}${selectedConversation.groupId}::${selectedConversation.title}`
              : "Message",
          description: text,
          issuedDate: new Date().toISOString().slice(0, 10),
          issuedBy: selfName,
          issuedByRole: roleLabel,
          senderEmployeeId: employeeId,
          ...(user?.companyID ? { companyID: user.companyID } : {}),
          ...(user?.branchesID ? { branchesID: user.branchesID } : {}),
          ...(user?.serviceProviderID
            ? { serviceProviderID: user.serviceProviderID }
            : {}),
        },
        accessToken,
      );

      setDraft("");
      await load(true);
    } catch (caughtError) {
      Alert.alert(
        "Couldn't send message",
        caughtError instanceof Error
          ? caughtError.message
          : "Please check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function toggleGroupMember(id: number) {
    setGroupMembers((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  async function createGroup() {
    const name = groupName.trim();

    if (!employeeId || !accessToken) return;
    if (!name) {
      Alert.alert("Create group", "Enter a group name.");
      return;
    }
    if (groupMembers.length < 2) {
      Alert.alert("Create group", "Select at least two other employees.");
      return;
    }

    const groupId = `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setCreatingGroup(true);

    try {
      await sendConversationMessage(
        {
          employeeIDs: groupMembers,
          memoType: "General",
          subject: `${GROUP_PREFIX}${groupId}::${name}`,
          description: `${selfName} created the group "${name}".`,
          issuedDate: new Date().toISOString().slice(0, 10),
          issuedBy: selfName,
          issuedByRole: roleLabel,
          senderEmployeeId: employeeId,
          ...(user?.companyID ? { companyID: user.companyID } : {}),
          ...(user?.branchesID ? { branchesID: user.branchesID } : {}),
          ...(user?.serviceProviderID
            ? { serviceProviderID: user.serviceProviderID }
            : {}),
        },
        accessToken,
      );

      setShowGroupCreator(false);
      setGroupName("");
      setGroupSearch("");
      setGroupMembers([]);

      await load(true);
      setSelectedKey(`group:${groupId}`);
    } catch (caughtError) {
      Alert.alert(
        "Couldn't create group",
        caughtError instanceof Error
          ? caughtError.message
          : "Please try again.",
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {selectedConversation ? (
          <View style={styles.screen}>
            <View style={styles.chatHeader}>
              <Pressable
                onPress={() => setSelectedKey(null)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Back to conversations"
              >
                <Ionicons
                  name="arrow-back"
                  size={21}
                  color={colors.textPrimary}
                />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {selectedConversation.title}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {selectedConversation.subtitle}
                </Text>
              </View>

              {selectedConversation.kind !== "company" ? (
                <Pressable
                  onPress={() => void toggleArchive(selectedConversation)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedConversation.isArchived
                      ? "Unarchive conversation"
                      : "Archive conversation"
                  }
                >
                  <Ionicons
                    name={
                      selectedConversation.isArchived
                        ? "archive"
                        : "archive-outline"
                    }
                    size={20}
                    color={colors.textPrimary}
                  />
                </Pressable>
              ) : null}
            </View>

            {selectedConversation.readOnly ? (
              <View style={styles.readOnlyBanner}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.readOnlyText}>
                  Company notifications are read-only.
                </Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageContent}
              keyboardShouldPersistTaps="handled"
            >
              {selectedConversation.messages.length === 0 ? (
                <View style={styles.emptyChat}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Start a conversation</Text>
                  <Text style={styles.emptyMessage}>
                    Send a message to get the conversation started.
                  </Text>
                </View>
              ) : (
                selectedConversation.messages.map((message) => {
                  const outgoing =
                    employeeId != null &&
                    isOutgoing(message, employeeId, selfName);

                  const replies = threadReplies[message.id] ?? [];

                  return (
                    <View key={message.id} style={styles.messageGroup}>
                      <View
                        style={[
                          styles.messageRow,
                          outgoing && styles.outgoingRow,
                        ]}
                      >
                        <Pressable
                          onLongPress={
                            selectedConversation.readOnly
                              ? undefined
                              : () => setReplyToMessageId(message.id)
                          }
                          delayLongPress={400}
                          style={[
                            styles.messageBubble,
                            outgoing
                              ? styles.outgoingBubble
                              : styles.incomingBubble,
                          ]}
                        >
                          {selectedConversation.kind === "group" ? (
                            <Text
                              style={[
                                styles.messageSender,
                                outgoing && styles.outgoingText,
                              ]}
                            >
                              {message.issuedBy || "Employee"}
                            </Text>
                          ) : null}

                          <Text
                            style={[
                              styles.messageText,
                              outgoing && styles.outgoingText,
                            ]}
                          >
                            {message.description?.trim() ||
                              "Attachment or message"}
                          </Text>

                          {message.attachmentPath ? (
                            <Pressable
                              onPress={() =>
                                void openChatAttachment(
                                  message.attachmentPath!,
                                  accessToken,
                                )
                              }
                              style={({ pressed }) => [
                                styles.attachmentCard,
                                pressed && styles.attachmentPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Open attachment ${getChatAttachmentName(
                                message.attachmentPath,
                              )}`}
                            >
                              <View style={styles.attachmentIcon}>
                                <Ionicons
                                  name="document-attach-outline"
                                  size={21}
                                  color={colors.primary}
                                />
                              </View>

                              <View style={styles.attachmentContent}>
                                <Text
                                  style={styles.attachmentName}
                                  numberOfLines={1}
                                  ellipsizeMode="middle"
                                >
                                  {getChatAttachmentName(
                                    message.attachmentPath,
                                  )}
                                </Text>
                                <Text style={styles.attachmentAction}>
                                  Tap to open file
                                </Text>
                              </View>

                              <Ionicons
                                name="open-outline"
                                size={17}
                                color={colors.primary}
                              />
                            </Pressable>
                          ) : null}
                          <Text
                            style={[
                              styles.messageTime,
                              outgoing && styles.outgoingText,
                            ]}
                          >
                            {formatTime(messageTime(message))}
                          </Text>
                        </Pressable>
                      </View>

                      {replies.map((reply) => {
                        const replyOutgoing =
                          employeeId != null &&
                          Number(reply.senderEmployeeId) === employeeId;

                        return (
                          <View
                            key={`reply-${reply.id}`}
                            style={[
                              styles.messageRow,
                              styles.replyRow,
                              replyOutgoing && styles.outgoingRow,
                            ]}
                          >
                            <View
                              style={[
                                styles.messageBubble,
                                styles.replyBubble,
                                replyOutgoing
                                  ? styles.outgoingBubble
                                  : styles.incomingBubble,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.messageSender,
                                  replyOutgoing && styles.outgoingText,
                                ]}
                              >
                                {reply.issuedBy || "Employee"}
                              </Text>

                              <Text
                                style={[
                                  styles.messageText,
                                  replyOutgoing && styles.outgoingText,
                                ]}
                              >
                                {reply.description?.trim() || "Reply"}
                              </Text>

                              {reply.attachmentPath ? (
                                <Pressable
                                  onPress={() =>
                                    void openChatAttachment(
                                      reply.attachmentPath!,
                                      accessToken,
                                    )
                                  }
                                  style={({ pressed }) => [
                                    styles.attachmentCard,
                                    pressed && styles.attachmentPressed,
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Open attachment ${getChatAttachmentName(
                                    reply.attachmentPath,
                                  )}`}
                                >
                                  <View style={styles.attachmentIcon}>
                                    <Ionicons
                                      name="document-attach-outline"
                                      size={21}
                                      color={colors.primary}
                                    />
                                  </View>

                                  <View style={styles.attachmentContent}>
                                    <Text
                                      style={styles.attachmentName}
                                      numberOfLines={1}
                                      ellipsizeMode="middle"
                                    >
                                      {getChatAttachmentName(
                                        reply.attachmentPath,
                                      )}
                                    </Text>
                                    <Text style={styles.attachmentAction}>
                                      Tap to open file
                                    </Text>
                                  </View>

                                  <Ionicons
                                    name="open-outline"
                                    size={17}
                                    color={colors.primary}
                                  />
                                </Pressable>
                              ) : null}

                              <Text
                                style={[
                                  styles.messageTime,
                                  replyOutgoing && styles.outgoingText,
                                ]}
                              >
                                {formatTime(reply.createdAt)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {!selectedConversation.readOnly ? (
              <View>
                {replyTargetMessage ? (
                  <View style={styles.replyingBanner}>
                    <Text style={styles.replyingText} numberOfLines={1}>
                      Replying to:{" "}
                      {replyTargetMessage.issuedBy ||
                        replyTargetMessage.description ||
                        "message"}
                    </Text>

                    <Pressable
                      onPress={() => setReplyToMessageId(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel reply"
                    >
                      <Ionicons
                        name="close-circle"
                        size={21}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.composer}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Write a message..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.composerInput}
                    multiline
                    maxLength={4000}
                    accessibilityLabel="Write a message"
                  />

                  <Pressable
                    onPress={() => void sendMessage()}
                    disabled={!draft.trim() || sending}
                    style={[
                      styles.sendButton,
                      (!draft.trim() || sending) && styles.disabledButton,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="send" size={18} color={colors.white} />
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.screen}>
            <View style={styles.listHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Conversations</Text>
                <Text style={styles.headerSubtitle}>Message your team</Text>
              </View>

              <View style={styles.headerActions}>
                {refreshing ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Pressable
                    onPress={() => void load(false)}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh conversations"
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                )}

                <Pressable
                  onPress={() => setShowGroupCreator(true)}
                  style={[styles.iconButton, styles.createGroupButton]}
                  accessibilityRole="button"
                  accessibilityLabel="Create group"
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={colors.white}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textMuted}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search conversations or contacts"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                accessibilityLabel="Search conversations"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filters}>
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                  ["archived", "Archived"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[
                    styles.filterChip,
                    filter === value && styles.activeFilterChip,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === value }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === value && styles.activeFilterText,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.stateMessage}>
                  Loading conversations...
                </Text>
              </View>
            ) : error && conversations.length === 0 ? (
              <View style={styles.centerState}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={34}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>
                  Couldn't load conversations
                </Text>
                <Text style={styles.stateMessage}>{error}</Text>
                <Pressable
                  onPress={() => void load(false)}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : filteredConversations.length === 0 ? (
              <View style={styles.centerState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {filter === "unread"
                    ? "No unread conversations"
                    : filter === "archived"
                      ? "No archived conversations"
                      : "No conversations found"}
                </Text>
                <Text style={styles.stateMessage}>
                  Choose a team member below to start a direct message, or
                  create a group.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
              >
                {filteredConversations.map((conversation) => {
                  const last =
                    conversation.messages[conversation.messages.length - 1];

                  return (
                    <Pressable
                      key={conversation.key}
                      onPress={() => openConversation(conversation)}
                      style={({ pressed }) => [
                        styles.conversationRow,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open conversation with ${conversation.title}`}
                    >
                      <View
                        style={[
                          styles.avatar,
                          conversation.kind === "company" &&
                            styles.companyAvatar,
                          conversation.kind === "group" && styles.groupAvatar,
                        ]}
                      >
                        <Ionicons
                          name={
                            conversation.kind === "company"
                              ? "megaphone-outline"
                              : conversation.kind === "group"
                                ? "people-outline"
                                : "person-outline"
                          }
                          size={21}
                          color={
                            conversation.kind === "direct"
                              ? colors.primary
                              : colors.white
                          }
                        />
                      </View>

                      <View style={styles.conversationCopy}>
                        <View style={styles.conversationTitleRow}>
                          <Text
                            style={styles.conversationTitle}
                            numberOfLines={1}
                          >
                            {conversation.title}
                          </Text>
                          <Text style={styles.listTime}>
                            {formatTime(messageTime(last))}
                          </Text>
                        </View>

                        <Text
                          style={styles.conversationSubtitle}
                          numberOfLines={1}
                        >
                          {messagePreview(last)}
                        </Text>
                      </View>

                      {conversation.unreadCount > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </Text>
                        </View>
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={17}
                          color={colors.textMuted}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={showGroupCreator}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupCreator(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Create group</Text>
                <Text style={styles.headerSubtitle}>
                  Choose at least two other employees
                </Text>
              </View>
              <Pressable
                onPress={() => setShowGroupCreator(false)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Close group creation"
              >
                <Ionicons name="close" size={21} color={colors.textPrimary} />
              </Pressable>
            </View>

            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              placeholderTextColor={colors.textMuted}
              style={styles.groupNameInput}
              maxLength={80}
            />

            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.textMuted}
              />
              <TextInput
                value={groupSearch}
                onChangeText={setGroupSearch}
                placeholder="Search team members"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>

            <ScrollView
              style={styles.groupContactList}
              keyboardShouldPersistTaps="handled"
            >
              {contacts
                .filter((contact) => {
                  const name = contactName(contact).toLowerCase();
                  const search = groupSearch.trim().toLowerCase();

                  return (
                    !search ||
                    name.includes(search) ||
                    (contact.employeeID ?? "").toLowerCase().includes(search)
                  );
                })
                .map((contact) => {
                  const selected = groupMembers.includes(contact.id);

                  return (
                    <Pressable
                      key={contact.id}
                      onPress={() => toggleGroupMember(contact.id)}
                      style={styles.memberRow}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={styles.memberCopy}>
                        <Text style={styles.memberName}>
                          {contactName(contact)}
                        </Text>
                        <Text style={styles.memberSubtitle}>
                          {contact.designation ||
                            contact.departmentName ||
                            contact.employeeID ||
                            "Team member"}
                        </Text>
                      </View>

                      <Ionicons
                        name={selected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setShowGroupCreator(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => void createGroup()}
                disabled={creatingGroup}
                style={[
                  styles.createButton,
                  creatingGroup && styles.disabledButton,
                ]}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.createButtonText}>
                    Create group ({groupMembers.length})
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ChatColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },

    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    chatHeader: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    headerTitle: {
      fontSize: 23,
      lineHeight: 29,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    headerSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: colors.textSecondary,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    createGroupButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    searchBox: {
      minHeight: 47,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginHorizontal: 18,
      marginBottom: 12,
      paddingHorizontal: 13,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.textPrimary,
    },
    filters: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 18,
      paddingBottom: 10,
    },
    filterChip: {
      minHeight: 34,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeFilterChip: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    activeFilterText: { color: colors.primary },

    listScroll: { flex: 1 },
    listContent: { paddingHorizontal: 14, paddingBottom: 115 },
    conversationRow: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 9,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 49,
      height: 49,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    groupAvatar: { backgroundColor: colors.primary },
    companyAvatar: { backgroundColor: colors.success },
    conversationCopy: { flex: 1, minWidth: 0 },
    conversationTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    conversationTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    listTime: { fontSize: 10, color: colors.textMuted },
    conversationSubtitle: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    unreadBadge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    unreadText: { fontSize: 10, fontWeight: "800", color: colors.white },

    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingBottom: 70,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    emptyTitle: {
      marginTop: 14,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    emptyMessage: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: colors.textSecondary,
    },
    stateMessage: {
      marginTop: 9,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: colors.textSecondary,
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 19,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    retryText: { color: colors.white, fontSize: 13, fontWeight: "800" },
    pressed: { opacity: 0.72 },

    messageScroll: { flex: 1 },
    messageContent: { paddingHorizontal: 14, paddingVertical: 18, gap: 12 },
    messageRow: { flexDirection: "row", justifyContent: "flex-start" },

    messageGroup: {
      gap: 5,
    },
    replyRow: {
      paddingHorizontal: 10,
    },
    replyBubble: {
      maxWidth: "82%",
    },

    outgoingRow: { justifyContent: "flex-end" },
    messageBubble: {
      maxWidth: "86%",
      minWidth: 72,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 17,
      borderWidth: 1,
    },
    incomingBubble: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderBottomLeftRadius: 5,
    },
    outgoingBubble: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderBottomRightRadius: 5,
    },
    messageSender: {
      marginBottom: 5,
      fontSize: 11,
      fontWeight: "800",
      color: colors.primary,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    outgoingText: { color: colors.white },
    messageTime: {
      marginTop: 6,
      fontSize: 10,
      textAlign: "right",
      color: colors.textMuted,
    },
    attachmentCard: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      width: 230,
      maxWidth: "100%",
      gap: 7,
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    attachmentIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    attachmentContent: {
      flex: 1,
      minWidth: 0,
    },
    attachmentName: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    attachmentAction: {
      marginTop: 3,
      fontSize: 10,
      color: colors.textSecondary,
    },
    attachmentPressed: {
      opacity: 0.72,
    },
    emptyChat: {
      flex: 1,
      minHeight: 250,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    readOnlyBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surfaceSecondary,
    },
    readOnlyText: { flex: 1, fontSize: 12, color: colors.textSecondary },
    replyingBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 9,
      backgroundColor: colors.surfaceSecondary,
    },
    replyingText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 9,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    composerInput: {
      flex: 1,
      minHeight: 45,
      maxHeight: 120,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    sendButton: {
      width: 45,
      height: 45,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    disabledButton: { opacity: 0.55 },

    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.42)",
    },
    modalCard: {
      maxHeight: "88%",
      paddingTop: 18,
      paddingHorizontal: 17,
      paddingBottom: 22,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 15,
    },
    groupNameInput: {
      minHeight: 47,
      marginBottom: 12,
      paddingHorizontal: 13,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 14,
      color: colors.textPrimary,
    },
    groupContactList: { maxHeight: 350, marginTop: 2 },
    memberRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 5,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    memberCopy: { flex: 1 },
    memberName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    memberSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: colors.textSecondary,
    },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 15,
    },
    cancelButton: {
      minHeight: 45,
      paddingHorizontal: 17,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    createButton: {
      minHeight: 45,
      paddingHorizontal: 17,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: colors.primary,
    },
    createButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.white,
    },
  });
}
