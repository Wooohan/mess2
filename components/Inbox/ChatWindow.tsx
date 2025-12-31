
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, X, Link as LinkIcon, Image as ImageIcon, Library, AlertCircle, ChevronDown, Check, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { Conversation, Message, ApprovedLink, ApprovedMedia, UserRole, ConversationStatus } from '../../types';
import { useApp } from '../../store/AppContext';
import { sendPageMessage, fetchThreadMessages } from '../../services/facebookService';

interface ChatWindowProps {
  conversation: Conversation;
  onDelete?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onDelete }) => {
  const { currentUser, messages, addMessage, pages, approvedLinks, approvedMedia, updateConversation, deleteConversation } = useApp();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const chatMessages = useMemo(() => messages.filter(m => m.conversationId === conversation.id), [messages, conversation.id]);

  useEffect(() => {
    const syncThread = async () => {
      const page = pages.find(p => p.id === conversation.pageId);
      if (!page?.accessToken) return;

      setIsLoadingMessages(true);
      try {
        const metaMsgs = await fetchThreadMessages(conversation.id, page.id, page.accessToken);
        for (const msg of metaMsgs) {
          if (!messages.find(m => m.id === msg.id)) {
            await addMessage(msg);
          }
        }
      } catch (err) {
        console.error("Thread sync failed", err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    syncThread();
  }, [conversation.id, pages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const blockRestrictedLinks = (text: string): boolean => {
    if (isAdmin) return true;
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const foundUrls = text.match(urlPattern);
    if (!foundUrls) return true;
    const libraryUrls = [
      ...approvedLinks.map(l => l.url.toLowerCase()),
      ...approvedMedia.map(m => m.url.toLowerCase())
    ];
    return foundUrls.every(url => libraryUrls.includes(url.toLowerCase()));
  };

  const handleSend = async (forcedText?: string) => {
    const textToSubmit = (forcedText || inputText).trim();
    if (!textToSubmit || isSending) return;
    
    if (!blockRestrictedLinks(textToSubmit)) {
      setLastError('Security: Only pre-approved assets allowed.');
      return;
    }

    setIsSending(true);
    setLastError(null);
    const currentPage = pages.find(p => p.id === conversation.pageId);
    
    try {
      if (currentPage && currentPage.accessToken) {
        const response = await sendPageMessage(conversation.customerId, textToSubmit, currentPage.accessToken);
        const newMessage: Message = {
          id: response.message_id || `msg-${Date.now()}`,
          conversationId: conversation.id,
          senderId: currentPage.id,
          senderName: currentPage.name,
          text: textToSubmit,
          timestamp: new Date().toISOString(),
          isIncoming: false,
          isRead: true,
        };
        await addMessage(newMessage);
      }
      if (!forcedText) setInputText('');
      setShowLibrary(false);
    } catch (err: any) {
      setLastError(err.message || 'Meta API Error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (isAdmin && window.confirm("Permanently delete local chat history?")) {
      await deleteConversation(conversation.id);
      if (onDelete) onDelete();
    }
  };

  const getStatusStyle = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.OPEN: return 'bg-blue-50 text-blue-600 border-blue-100';
      case ConversationStatus.PENDING: return 'bg-amber-50 text-amber-600 border-amber-100';
      case ConversationStatus.RESOLVED: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const setStatus = (newStatus: ConversationStatus) => {
    updateConversation(conversation.id, { status: newStatus });
    setShowStatusMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3 md:gap-4 ml-10 md:ml-0">
          <div className="relative flex-shrink-0">
            <img src={conversation.customerAvatar} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover shadow-sm" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{conversation.customerName}</h3>
              {isLoadingMessages && <Loader2 size={12} className="animate-spin text-blue-400" />}
            </div>
            
            <div className="relative inline-block">
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all ${getStatusStyle(conversation.status)}`}
              >
                {conversation.status}
                <ChevronDown size={10} className="opacity-60" />
              </button>

              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-36 bg-white border border-slate-100 shadow-2xl rounded-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {(Object.values(ConversationStatus)).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatus(status)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          conversation.status === status ? 'bg-slate-50 text-slate-900' : 'text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            status === ConversationStatus.OPEN ? 'bg-blue-500' : 
                            status === ConversationStatus.PENDING ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></div>
                          {status}
                        </span>
                        {conversation.status === status && <Check size={10} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isAdmin && (
          <button 
            onClick={handleDeleteChat}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Purge Local Chat"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 bg-slate-50/20">
        {chatMessages.length === 0 && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
              <MessageSquare size={24} className="opacity-20" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Direct Conversation Active</p>
          </div>
        )}
        {isLoadingMessages && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-400/50">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Pulling History from Meta...</p>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isIncoming ? 'items-start' : 'items-end'}`}>
            <div className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 rounded-2xl md:rounded-3xl text-sm leading-relaxed shadow-sm ${
              msg.isIncoming 
                ? 'bg-white text-slate-700 border border-slate-100 rounded-bl-none' 
                : 'bg-blue-600 text-white shadow-blue-100 rounded-br-none'
            }`}>
              {msg.text}
            </div>
            <span className="text-[8px] font-bold text-slate-400 mt-1.5 px-1 uppercase tracking-widest">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4 md:p-8 border-t border-slate-100 bg-white relative">
        {lastError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2 animate-in shake border border-red-100">
            <AlertCircle size={14} /> {lastError}
          </div>
        )}

        {showLibrary && (
          <div className="absolute bottom-full right-4 md:right-8 mb-4 bg-white border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-200 w-[calc(100%-32px)] md:w-1/2 max-w-[500px]">
             <div className="p-4 bg-slate-50/50 border-b flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Compliance Verified Assets</span>
                <button onClick={() => setShowLibrary(false)} className="p-1.5 hover:bg-white rounded-lg"><X size={16} /></button>
             </div>
             <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {approvedLinks.map(link => (
                  <button onClick={() => handleSend(link.url)} key={link.id} className="text-left p-3 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3 min-w-0">
                     <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                        <LinkIcon size={14} />
                     </div>
                     <div className="truncate">
                       <p className="text-xs font-bold text-slate-700 truncate">{link.title}</p>
                       <p className="text-[8px] text-slate-400 font-medium truncate">{link.url}</p>
                     </div>
                  </button>
                ))}
                {approvedMedia.map(media => (
                  <button onClick={() => handleSend(media.url)} key={media.id} className="relative aspect-[2/1] rounded-2xl overflow-hidden border border-slate-100 group">
                     <img src={media.url} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity p-2">
                        <span className="text-white font-black text-[9px] uppercase">Send Media</span>
                     </div>
                  </button>
                ))}
             </div>
          </div>
        )}

        <div className="flex items-end gap-2 md:gap-3">
           <button 
             onClick={() => setShowLibrary(!showLibrary)}
             className={`p-3.5 md:p-4 rounded-xl md:rounded-2xl transition-all ${showLibrary ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-blue-50'}`}
             title="Verified Assets"
           >
             <Library size={20} />
           </button>
           <div className="flex-1 relative">
             <textarea
               value={inputText}
               onChange={e => setInputText(e.target.value)}
               className="w-full bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl p-3 md:p-4 text-sm outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all resize-none max-h-32"
               placeholder="Write a message..."
               rows={1}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
             />
           </div>
           <button
             onClick={() => handleSend()}
             disabled={!inputText.trim() || isSending}
             className="p-3.5 md:p-5 bg-blue-600 text-white rounded-xl md:rounded-[24px] shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-40 transition-all flex-shrink-0"
           >
             {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
