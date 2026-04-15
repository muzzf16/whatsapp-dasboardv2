import React, { useEffect, useMemo, useRef } from 'react';
import {
    ArrowLeft,
    CheckCheck,
    FileText,
    Mic,
    MoreVertical,
    Paperclip,
    Phone,
    Plus,
    Search,
    Send,
    Smile,
    User,
    Video,
} from 'lucide-react';

const FILTERS = ['Semua', 'Belum dibaca', 'Favorit', 'Grup'];
const AVATAR_COLORS = [
    'bg-emerald-100 text-emerald-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-cyan-100 text-cyan-700',
];

const normalizeJid = (value = '') => String(value || '').split('@')[0].replace(/\D/g, '') || String(value || '');

const getMessageTime = (message) => {
    const raw = message.timestamp || (message.messageTimestamp ? message.messageTimestamp * 1000 : null);
    const date = raw ? new Date(raw) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatChatTime = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatBubbleTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name = '') => {
    const clean = String(name || '').trim();
    if (!clean) return <User className="w-4 h-4" />;
    const parts = clean.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : clean.slice(0, 2);
    return letters.toUpperCase();
};

const getAvatarColor = (id = '') => {
    const hash = String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getConversationId = (message, type) => normalizeJid(type === 'incoming' ? (message.sender || message.from) : message.to);

const getConversationName = (message, id, type) => {
    if (type === 'incoming') {
        return message.pushName || message.senderName || id;
    }
    return message.name || id;
};

const buildConversations = (incomingMessages, outgoingMessages) => {
    const conversations = new Map();

    const addMessage = (message, type) => {
        const id = getConversationId(message, type);
        if (!id) return;

        const time = getMessageTime(message);
        const normalized = {
            ...message,
            id: `${type}-${id}-${time.getTime()}-${message.text || message.file || ''}`,
            direction: type,
            conversationId: id,
            displayName: getConversationName(message, id, type),
            text: message.text || (message.file ? `[File: ${message.file}]` : '[Media]'),
            file: message.file || message.file_name || null,
            time,
        };

        const existing = conversations.get(id) || {
            id,
            name: normalized.displayName,
            phone: id,
            lastMessage: normalized,
            unread: 0,
            messages: [],
        };

        existing.name = existing.name === id ? normalized.displayName : existing.name;
        existing.messages.push(normalized);
        if (!existing.lastMessage || normalized.time > existing.lastMessage.time) {
            existing.lastMessage = normalized;
        }
        if (type === 'incoming') {
            existing.unread += 1;
        }
        conversations.set(id, existing);
    };

    incomingMessages.forEach((message) => addMessage(message, 'incoming'));
    outgoingMessages.forEach((message) => addMessage(message, 'outgoing'));

    return Array.from(conversations.values())
        .map((conversation) => ({
            ...conversation,
            messages: conversation.messages.sort((a, b) => a.time - b.time),
        }))
        .sort((a, b) => b.lastMessage.time - a.lastMessage.time);
};

const WhatsAppChatView = ({
    activeConnection,
    messages,
    outgoingMessages,
    selectedConversationId,
    setSelectedConversationId,
    conversationSearch,
    setConversationSearch,
    isNewChatMode,
    setIsNewChatMode,
    isMobileThreadOpen,
    setIsMobileThreadOpen,
    sendTo,
    setSendTo,
    sendMessageText,
    setSendMessageText,
    selectedFile,
    setSelectedFile,
    isSending,
    onSendMessage,
    onFileChange,
}) => {
    const fileInputRef = useRef(null);
    const threadEndRef = useRef(null);

    const conversations = useMemo(
        () => buildConversations(messages, outgoingMessages),
        [messages, outgoingMessages]
    );

    const filteredConversations = useMemo(() => {
        const query = conversationSearch.trim().toLowerCase();
        if (!query) return conversations;

        return conversations.filter((conversation) => {
            const haystack = [
                conversation.name,
                conversation.phone,
                conversation.lastMessage?.text,
            ].join(' ').toLowerCase();
            return haystack.includes(query);
        });
    }, [conversationSearch, conversations]);

    const activeConversation = conversations.find((conversation) => conversation.id === selectedConversationId)
        || (selectedConversationId ? {
            id: selectedConversationId,
            name: selectedConversationId,
            phone: selectedConversationId,
            messages: [],
        } : null);
    const activeThread = activeConversation?.messages || [];
    const isConnected = activeConnection?.status === 'connected';
    const activeRecipient = isNewChatMode ? sendTo : (activeConversation?.phone || sendTo);
    const composerDisabled = !isConnected || (!isNewChatMode && !activeConversation);

    useEffect(() => {
        if (!selectedConversationId && conversations.length > 0 && !isNewChatMode) {
            setSelectedConversationId(conversations[0].id);
            setSendTo(conversations[0].phone);
        }
    }, [conversations, isNewChatMode, selectedConversationId, setSelectedConversationId, setSendTo]);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeThread.length, selectedConversationId]);

    const selectConversation = (conversation) => {
        setSelectedConversationId(conversation.id);
        setSendTo(conversation.phone);
        setIsNewChatMode(false);
        setIsMobileThreadOpen(true);
    };

    const startNewChat = () => {
        setSelectedConversationId('');
        setSendTo('');
        setSendMessageText('');
        setSelectedFile(null);
        setIsNewChatMode(true);
        setIsMobileThreadOpen(true);
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (event) => {
        if (!isNewChatMode && activeConversation) {
            setSendTo(activeConversation.phone);
        }
        onSendMessage(event);
    };

    const renderEmptyChat = () => (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-500">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <User className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Pilih percakapan</h2>
            <p className="mt-2 max-w-sm text-sm leading-6">
                Riwayat pesan akan tampil seperti ruang chat. Pilih chat di kiri atau mulai pesan baru.
            </p>
            <button
                type="button"
                onClick={startNewChat}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
                <Plus className="h-4 w-4" />
                Chat baru
            </button>
        </div>
    );

    return (
        <div className="h-full overflow-hidden bg-[#f0f2f5] text-slate-900">
            <div className="flex h-full">
                <aside className={`${isMobileThreadOpen ? 'hidden' : 'flex'} w-full flex-col border-r border-slate-200 bg-white md:flex md:w-[390px] xl:w-[430px]`}>
                    <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[#128c7e]">Messages</h2>
                            <p className="text-xs text-slate-500">{activeConnection?.connectionId || 'No session selected'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={startNewChat}
                                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                                title="Chat baru"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                            <button type="button" className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" title="Menu">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="border-b border-slate-100 px-3 py-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={conversationSearch}
                                onChange={(event) => setConversationSearch(event.target.value)}
                                placeholder="Cari atau mulai chat baru"
                                className="h-10 w-full rounded-lg border-0 bg-slate-100 pl-10 pr-3 text-sm text-slate-800 outline-none ring-1 ring-transparent transition placeholder:text-slate-500 focus:bg-white focus:ring-emerald-300"
                            />
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {FILTERS.map((filter, index) => (
                                <button
                                    key={filter}
                                    type="button"
                                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                        index === 0
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-slate-500">
                                <User className="mb-3 h-10 w-10 text-slate-300" />
                                Belum ada percakapan. Mulai chat baru untuk mengirim pesan.
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const isActive = selectedConversationId === conversation.id && !isNewChatMode;
                                return (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        onClick={() => selectConversation(conversation)}
                                        className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${
                                            isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getAvatarColor(conversation.id)}`}>
                                            {getInitials(conversation.name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="truncate text-sm font-semibold text-slate-900">{conversation.name}</span>
                                                <span className="shrink-0 text-[11px] text-slate-500">{formatChatTime(conversation.lastMessage.time)}</span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-3">
                                                <p className="truncate text-sm text-slate-500">
                                                    {conversation.lastMessage.direction === 'outgoing' && <CheckCheck className="mr-1 inline h-3.5 w-3.5 text-sky-500" />}
                                                    {conversation.lastMessage.text}
                                                </p>
                                                {conversation.unread > 0 && (
                                                    <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                                                        {conversation.unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="hidden border-t border-slate-100 px-4 py-3 text-center text-xs text-emerald-700 md:block">
                        Gunakan desktop app style untuk percakapan operasional.
                    </div>
                </aside>

                <section className={`${isMobileThreadOpen ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col bg-[#efeae2] md:flex`}>
                    {(activeConversation || isNewChatMode) ? (
                        <>
                            <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-[#f0f2f5] px-3 md:px-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileThreadOpen(false)}
                                        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 md:hidden"
                                        title="Kembali"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getAvatarColor(activeRecipient)}`}>
                                        {getInitials(isNewChatMode ? activeRecipient || 'Baru' : activeConversation.name)}
                                    </div>
                                    <div className="min-w-0">
                                        {isNewChatMode ? (
                                            <input
                                                type="text"
                                                value={sendTo}
                                                onChange={(event) => setSendTo(event.target.value)}
                                                placeholder="Nomor tujuan"
                                                className="h-8 w-44 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 md:w-64"
                                            />
                                        ) : (
                                            <h2 className="truncate text-sm font-semibold text-slate-900">{activeConversation.name}</h2>
                                        )}
                                        <p className="truncate text-xs text-slate-500">
                                            {isConnected ? 'online melalui session aktif' : activeConnection?.status || 'session tidak aktif'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-slate-600">
                                    <button type="button" className="rounded-lg p-2 transition hover:bg-slate-200" title="Video">
                                        <Video className="h-5 w-5" />
                                    </button>
                                    <button type="button" className="rounded-lg p-2 transition hover:bg-slate-200" title="Telepon">
                                        <Phone className="h-5 w-5" />
                                    </button>
                                    <button type="button" className="rounded-lg p-2 transition hover:bg-slate-200" title="Cari">
                                        <Search className="h-5 w-5" />
                                    </button>
                                    <button type="button" className="rounded-lg p-2 transition hover:bg-slate-200" title="Menu">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </div>
                            </header>

                            <div className="relative flex-1 overflow-y-auto px-3 py-5 md:px-10">
                                <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:radial-gradient(circle_at_1px_1px,rgba(17,24,39,0.12)_1px,transparent_0)] [background-size:24px_24px]" />
                                <div className="relative mx-auto flex max-w-4xl flex-col gap-2">
                                    <div className="my-2 self-center rounded-lg bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                                        Hari ini
                                    </div>
                                    {activeThread.length === 0 && (
                                        <div className="mt-16 self-center rounded-lg bg-white/90 px-4 py-3 text-center text-sm text-slate-500 shadow-sm">
                                            Masukkan nomor dan tulis pesan untuk memulai percakapan.
                                        </div>
                                    )}
                                    {activeThread.map((message) => {
                                        const isOutgoing = message.direction === 'outgoing';
                                        return (
                                            <div key={message.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm md:max-w-[62%] ${
                                                        isOutgoing
                                                            ? 'rounded-tr-sm bg-[#d9fdd3] text-slate-900'
                                                            : 'rounded-tl-sm bg-white text-slate-900'
                                                    }`}
                                                >
                                                    {message.file && (
                                                        <div className="mb-2 flex items-center gap-2 rounded-md bg-white/60 px-2 py-2 text-xs font-medium text-slate-700">
                                                            <FileText className="h-4 w-4 text-emerald-700" />
                                                            <span className="truncate">{message.file}</span>
                                                        </div>
                                                    )}
                                                    <div className="whitespace-pre-wrap break-words">{message.text}</div>
                                                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                                                        {formatBubbleTime(message.time)}
                                                        {isOutgoing && <CheckCheck className="h-3.5 w-3.5 text-sky-500" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={threadEndRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="flex shrink-0 items-end gap-2 bg-[#f0f2f5] px-3 py-3">
                                <button type="button" className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200" title="Emoji">
                                    <Smile className="h-5 w-5" />
                                </button>
                                <label className={`rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 ${composerDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} title="Lampirkan file">
                                    <Paperclip className="h-5 w-5" />
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={onFileChange}
                                        disabled={composerDisabled}
                                    />
                                </label>
                                <div className="min-w-0 flex-1">
                                    {selectedFile && (
                                        <div className="mb-2 flex max-w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                                            <FileText className="h-4 w-4 text-emerald-700" />
                                            <span className="truncate">{selectedFile.name}</span>
                                            <button type="button" onClick={clearSelectedFile} className="ml-auto text-slate-400 hover:text-slate-700">
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                    <textarea
                                        value={sendMessageText}
                                        onChange={(event) => setSendMessageText(event.target.value)}
                                        placeholder={composerDisabled ? 'Pilih chat dan pastikan session connected' : 'Ketik pesan'}
                                        rows={1}
                                        disabled={composerDisabled}
                                        className="max-h-32 min-h-11 w-full resize-none rounded-lg border-0 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-transparent transition placeholder:text-slate-500 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    />
                                </div>
                                <button type="button" className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200" title="Voice note">
                                    <Mic className="h-5 w-5" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={composerDisabled || isSending || (!sendMessageText.trim() && !selectedFile)}
                                    className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    title="Kirim"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        </>
                    ) : renderEmptyChat()}
                </section>
            </div>
        </div>
    );
};

export default WhatsAppChatView;
