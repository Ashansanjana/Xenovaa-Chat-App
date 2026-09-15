import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  listConversationsRequest,
  getConversationMessagesRequest,
  listPinnedMessagesRequest,
  uploadAttachmentRequest,
} from '../api/conversations';
import { listUsersRequest } from '../api/users';
import { sendChatRequestApi } from '../api/chatRequests';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { StatusDot } from '../components/StatusDot';
import { MessageBubble } from '../components/MessageBubble';
import { NewGroupModal } from '../components/NewGroupModal';
import { GroupInfoPanel } from '../components/GroupInfoPanel';
import { TypingDots } from '../components/TypingDots';
import { OnlineColleagues } from '../components/OnlineColleagues';
import { Spinner } from '../components/Spinner';
import { PaperclipIcon, SendIcon, InfoIcon, CloseIcon, PlusIcon } from '../components/Icons';
import { createReportRequest } from '../api/reports';

function formatMessageTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

function toStatuses(messageStatusRows) {
  return (messageStatusRows || []).map((s) => ({ userId: s.user_id, status: s.status }));
}

function upsertStatuses(statuses, userId, status) {
  const next = (statuses || []).filter((s) => s.userId !== userId);
  next.push({ userId, status });
  return next;
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export default function ChatsPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [error, setError] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [startingChatWith, setStartingChatWith] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const otherTypingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === conversationId) || null,
    [conversations, conversationId]
  );

  const onlineUsers = useMemo(
    () => allUsers.filter((u) => u.status === 'online' || u.status === 'break'),
    [allUsers]
  );

  useEffect(() => {
    loadConversations();
    listUsersRequest().then(setAllUsers).catch(() => setAllUsers([]));
  }, []);

  useEffect(() => {
    setIsOtherTyping(false);
    setReplyingTo(null);
    setShowGroupInfo(false);
    if (!conversationId) {
      setMessages([]);
      setPinnedMessages([]);
      return;
    }
    setLoadingMessages(true);
    getConversationMessagesRequest(conversationId)
      .then((msgs) => {
        setMessages(msgs.map((m) => ({ ...m, statuses: toStatuses(m.message_status) })));
      })
      .catch(() => setError('Failed to load messages.'))
      .finally(() => setLoadingMessages(false));
    loadPins(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('join_conversation', { conversationId });
  }, [socket, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    function onReceiveMessage(msg) {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => [...prev, { ...msg, statuses: msg.statuses || [] }]);
        socket.emit('mark_as_read', { conversationId });
      }
      applyPreview(msg);
    }

    function onTyping({ conversationId: cid, userId, isTyping }) {
      if (cid !== conversationId || userId === user?.id) return;
      setIsOtherTyping(isTyping);
      // Safety net: if a typing_stop event ever gets dropped (network blip),
      // don't leave the indicator stuck on forever.
      clearTimeout(otherTypingTimeoutRef.current);
      if (isTyping) {
        otherTypingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 4000);
      }
    }

    function onStatusUpdate({ conversationId: cid, userId, status, messageIds }) {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) ? { ...m, statuses: upsertStatuses(m.statuses, userId, status) } : m
        )
      );
    }

    function onUserStatusChanged({ userId, status }) {
      applyMemberStatus(userId, status);
      setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    }

    function onMessageUpdated({ conversationId: cid, messageId, isPinned, isDeleted, deletedForEveryone, hiddenForMe }) {
      if (cid !== conversationId) return;

      if (hiddenForMe) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return;
      }

      if (isDeleted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted: true, deleted_for_everyone: deletedForEveryone, message: null, file_url: null }
              : m
          )
        );
      }

      if (typeof isPinned === 'boolean') {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_pinned: isPinned } : m)));
        loadPins(conversationId);
      }
    }

    function onConversationCreated(summary) {
      setConversations((prev) => (prev.some((c) => c.id === summary.id) ? prev : [summary, ...prev]));
    }

    function onGroupUpdated({ conversationId: cid, name, groupImage, members }) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === cid
            ? { ...c, name, groupImage, members, myRole: members.find((m) => m.id === user?.id)?.role || c.myRole }
            : c
        )
      );
    }

    function onRemovedFromGroup({ conversationId: cid }) {
      setConversations((prev) => prev.filter((c) => c.id !== cid));
      if (cid === conversationId) navigate('/chats');
    }

    socket.on('receive_message', onReceiveMessage);
    socket.on('typing', onTyping);
    socket.on('message_status_update', onStatusUpdate);
    socket.on('user_status_changed', onUserStatusChanged);
    socket.on('message_updated', onMessageUpdated);
    socket.on('conversation_created', onConversationCreated);
    socket.on('group_updated', onGroupUpdated);
    socket.on('removed_from_group', onRemovedFromGroup);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('typing', onTyping);
      socket.off('message_status_update', onStatusUpdate);
      socket.off('user_status_changed', onUserStatusChanged);
      socket.off('message_updated', onMessageUpdated);
      socket.off('conversation_created', onConversationCreated);
      socket.off('group_updated', onGroupUpdated);
      socket.off('removed_from_group', onRemovedFromGroup);
    };
  }, [socket, conversationId, user?.id]);

  function applyMemberStatus(userId, status) {
    setConversations((prev) =>
      prev.map((c) =>
        c.otherMember?.id === userId ? { ...c, otherMember: { ...c.otherMember, status } } : c
      )
    );
  }

  function applyPreview(msg) {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== msg.conversation_id) return c;
        const isOpen = msg.conversation_id === conversationId;
        return {
          ...c,
          lastMessage: msg,
          unreadCount: isOpen ? 0 : (c.unreadCount || 0) + 1,
        };
      })
    );
  }

  async function loadConversations() {
    setLoadingConversations(true);
    try {
      const list = await listConversationsRequest();
      setConversations(list);
    } catch {
      setError('Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadPins(id) {
    try {
      const pins = await listPinnedMessagesRequest(id);
      setPinnedMessages(pins);
    } catch {
      setPinnedMessages([]);
    }
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    if (!socket || !conversationId) return;

    // Only emit typing_start on the leading edge (not every keystroke), and
    // give a longer grace period before typing_stop — a short pause while
    // composing a message (thinking, re-reading) shouldn't make the "typing…"
    // indicator flicker off and back on for the other person.
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { conversationId });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId });
    }, 3000);
  }

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !conversationId || !socket) return;

    setDraft('');
    clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    socket.emit('typing_stop', { conversationId });

    const replyToMessageId = replyingTo?.id || null;
    setReplyingTo(null);
    setSending(true);
    socket.emit('send_message', { conversationId, message: text, replyToMessageId }, (res) => {
      setSending(false);
      if (res?.error) setError(res.error);
    });
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conversationId) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('File exceeds the 10MB limit.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      await uploadAttachmentRequest(conversationId, file, { replyToMessageId: replyingTo?.id });
      setReplyingTo(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  }

  function handleTogglePin(message) {
    if (!socket || !conversationId) return;
    socket.emit('pin_message', { conversationId, messageId: message.id, pinned: !message.is_pinned }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  function handleDelete(message, forEveryone) {
    if (!socket || !conversationId) return;
    socket.emit('delete_message', { conversationId, messageId: message.id, forEveryone }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  async function handleStartChat(otherUser) {
    const existing = conversations.find((c) => !c.isGroup && c.otherMember?.id === otherUser.id);
    if (existing) {
      navigate(`/chats/${existing.id}`);
      return;
    }

    setInfoMessage('');
    setStartingChatWith(otherUser.id);
    try {
      const { conversation } = await sendChatRequestApi(otherUser.id);
      if (conversation) {
        setConversations((prev) => (prev.some((c) => c.id === conversation.id) ? prev : [conversation, ...prev]));
        navigate(`/chats/${conversation.id}`);
      } else {
        setInfoMessage(`Chat request sent to ${otherUser.name}.`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start chat.');
    } finally {
      setStartingChatWith(null);
    }
  }

  async function handleReport(message, reason) {
    try {
      await createReportRequest({ messageId: message.id, reason });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report.');
    }
  }

  return (
    <div className="flex h-full">
      <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Chats</h2>
          <button
            onClick={() => setShowNewGroupModal(true)}
            title="New group"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-600 transition hover:bg-accent-tint"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Group
          </button>
        </div>
        {loadingConversations ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-[var(--color-ink-muted)]">
            <Spinner /> Loading conversations…
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-ink-muted)]">
            No conversations yet. Connect with someone from the{' '}
            <Link to="/directory" className="font-medium text-accent-600 hover:text-accent-700">
              directory
            </Link>{' '}
            first.
          </p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/chats/${c.id}`)}
              className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-surface-hover ${
                c.id === conversationId ? 'bg-accent-tint' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <Avatar name={c.name} profileImage={c.isGroup ? c.groupImage : c.otherMember?.profile_image} />
                {!c.isGroup && (
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={c.otherMember?.status} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                  {c.lastMessage?.created_at && (
                    <span className="flex-shrink-0 text-[11px] text-[var(--color-ink-muted)]">
                      {formatMessageTime(c.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-[var(--color-ink-muted)]">
                    {c.lastMessage?.message || 'No messages yet'}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-600 px-1.5 text-xs font-medium text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </aside>

      <section className="flex flex-1 flex-col bg-canvas">
        {!conversationId || !activeConversation ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-10">
            <div className="mx-auto w-full max-w-xl">
              <h1 className="text-lg font-semibold text-ink">
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Pick a conversation from the left, or start one with a colleague who's online now.
              </p>

              {infoMessage && (
                <p className="mt-4 rounded-lg bg-success-tint px-3 py-2 text-sm text-success-600">{infoMessage}</p>
              )}

              <h2 className="mb-3 mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-success-600" />
                Online now
              </h2>
              <OnlineColleagues users={onlineUsers} busyUserId={startingChatWith} onSelect={handleStartChat} />
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    name={activeConversation.name}
                    profileImage={
                      activeConversation.isGroup
                        ? activeConversation.groupImage
                        : activeConversation.otherMember?.profile_image
                    }
                  />
                  {!activeConversation.isGroup && (
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={activeConversation.otherMember?.status} />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{activeConversation.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                    {isOtherTyping ? (
                      <>
                        typing <TypingDots />
                      </>
                    ) : activeConversation.isGroup ? (
                      `${activeConversation.members.length} members`
                    ) : activeConversation.otherMember?.status === 'online' ? (
                      'Online'
                    ) : activeConversation.otherMember?.status === 'break' ? (
                      'On Break'
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>
              {activeConversation.isGroup && (
                <button
                  onClick={() => setShowGroupInfo((v) => !v)}
                  title="Group info"
                  className="rounded-lg p-2 text-[var(--color-ink-muted)] transition hover:bg-field hover:text-[var(--color-ink-soft)]"
                >
                  <InfoIcon className="h-[18px] w-[18px]" />
                </button>
              )}
            </header>

            {pinnedMessages.length > 0 && (
              <div className="flex gap-3 overflow-x-auto border-b border-line bg-accent-tint px-4 py-2">
                {pinnedMessages.map((p) => (
                  <div key={p.messageId} className="flex min-w-40 max-w-56 flex-shrink-0 items-start gap-1.5 text-xs">
                    <span className="text-accent-700">📌</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-ink-soft)]">{p.message.sender?.name}</p>
                      <p className="truncate text-[var(--color-ink-muted)]">
                        {p.message.is_deleted
                          ? 'Message deleted'
                          : p.message.message_type !== 'text'
                          ? `Attachment · ${p.message.message_type}`
                          : p.message.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                  <Spinner /> Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">No messages yet. Say hello!</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isMine={m.sender_id === user?.id}
                      otherMemberId={activeConversation.otherMember?.id}
                      onReply={setReplyingTo}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                      onReport={handleReport}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {error && <p className="px-4 pb-1 text-xs text-danger-600">{error}</p>}

            {replyingTo && (
              <div className="mx-3 mt-2 flex items-center justify-between rounded-lg border-l-2 border-accent-600 bg-accent-tint px-3 py-1.5 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-accent-700">Replying to {replyingTo.sender?.name}</p>
                  <p className="truncate text-[var(--color-ink-muted)]">
                    {replyingTo.message_type !== 'text' ? `Attachment · ${replyingTo.message_type}` : replyingTo.message}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-2 rounded p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2 border-t border-line bg-surface p-3">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={uploading}
                title="Attach a file"
                className="rounded-lg border border-line px-3 text-[var(--color-ink-soft)] transition hover:bg-field disabled:opacity-50"
              >
                <PaperclipIcon className="h-[18px] w-[18px]" />
              </button>
              <input
                value={draft}
                onChange={handleDraftChange}
                placeholder="Type a message…"
                className="flex-1 rounded-md border border-transparent bg-field px-3 py-2 text-sm text-ink outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50"
              >
                <SendIcon className="h-4 w-4" /> Send
              </button>
            </form>
          </>
        )}
      </section>

      {showGroupInfo && activeConversation?.isGroup && (
        <GroupInfoPanel
          conversation={activeConversation}
          currentUserId={user?.id}
          onClose={() => setShowGroupInfo(false)}
          onLeave={() => {
            setShowGroupInfo(false);
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
            navigate('/chats');
          }}
        />
      )}

      {showNewGroupModal && (
        <NewGroupModal
          onClose={() => setShowNewGroupModal(false)}
          onCreated={(conversation) => {
            setConversations((prev) => [conversation, ...prev]);
            setShowNewGroupModal(false);
            navigate(`/chats/${conversation.id}`);
          }}
        />
      )}
    </div>
  );
}
