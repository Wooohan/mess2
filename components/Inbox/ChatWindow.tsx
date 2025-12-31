
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, X, Link as LinkIcon, Image as ImageIcon, Library, AlertCircle, ChevronDown, Check, MessageSquare, Loader2, ShieldAlert } from 'lucide-react';
import { Conversation, Message, ApprovedLink, ApprovedMedia, UserRole, ConversationStatus } from '../../types';
import { useApp } from '../../store/AppContext';
import { sendPageMessage, fetchThreadMessages } from '../../services/facebookService';

interface ChatWindowProps {
  conversation: Conversation;
}

const CachedAvatar: React.FC<{ conversation: Conversation, className?: string }> = ({ conversation, className }) => {
  const [url, setUrl] = useState<string>(conversation.customerAvatar);

  useEffect(() => {
    if (conversation.customerAvatarBlob) {
      const objectUrl = URL.createObjectURL(conversation.customerAvatarBlob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setUrl(conversation.customerAvatar);
  }, [conversation.customerAvatarBlob, conversation.customerAvatar]);

  return (
    <img 
      src={url} 
      className={className} 
      alt="" 
      onError={(e) => {
        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.customerName)}&background=random`;
      }}
    />
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const { currentUser, messages, bulkAddMessages, pages, approvedLinks, approvedMedia, updateConversation, isHistorySynced } = useApp();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSecurityPopup, setShowSecurityPopup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMessages = useMemo(() => {
    return messages
      .filter(m => m.conversationId === conversation.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, conversation.id]);

  useEffect(() => {
    let isMounted = true;
    
    const syncThread = async (isInitial = false) => {
      const page = pages.find(p => p.id === conversation.pageId);
      if (!page?.accessToken || !isMounted) return;

      // DELTA LOGIC: If history isn't synced, only pull messages from the last 5 minutes.
      // This satisfies the "don't request old messages unless fetch meta is pressed" requirement.
      let sinceTimestamp: number | undefined = undefined;
      if (!isHistorySynced && isInitial) {
        sinceTimestamp = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
      }

      if (isInitial && chatMessages.length === 0) setIsLoadingMessages(true);
      
      try {
        const metaMsgs = await fetchThreadMessages(conversation.id, page.id, page.accessToken, sinceTimestamp);
        if (isMounted) {
          await bulkAddMessages(metaMsgs, true);
        }
      } catch (err) {
        console.error("Delta poll failed", err);
      } finally {
        if (isInitial && isMounted) setIsLoadingMessages(false);
      }
    };

    syncThread(true);
    const poll = setInterval(() => syncThread(false), 10000); 
    
    return () => {
      isMounted = false;
      clearInterval(poll);
    };
  }, [conversation.id, isHistorySynced]); 

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const blockRestrictedLinks = (text: string): boolean => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const foundUrls = text.match(urlPattern);
    if (!foundUrls) return true;

    const libraryUrls = [
      ...approvedLinks.map(l => l.url.trim().toLowerCase()),
      ...approvedMedia.map(m => m.url.trim().toLowerCase())
    ];

    return foundUrls.every(url => libraryUrls.includes(url.trim().toLowerCase()));
  };

  const handleSend = async (forcedText?: string) => {
    const textToSubmit = (forcedText || inputText).trim();
    if (!textToSubmit || isSending) return;
    
    if (!blockRestrictedLinks(textToSubmit)) {
      setShowSecurityPopup(true);
      return;
    }

    setIsSending(true);
    setLastError(null);
    const currentPage = pages.find(p => p.id === conversation.pageId);
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUser?.id || 'unknown',
      senderName: currentUser?.name || 'Agent',
      text: textToSubmit,
      timestamp: new Date().toISOString(),
      isIncoming: false,
      isRead: true,
    };

    try {
      if (currentPage && currentPage.accessToken) {
        await sendPageMessage(conversation.customerId, textToSubmit, currentPage.accessToken);
      }
      await bulkAddMessages([newMessage]);
      if (!forcedText) setInputText('');
      setShowLibrary(false);
    } catch (err: any) {
      setLastError(err.message || 'Meta API Error');
    } finally {
      setIsSending(false);
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
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl shrink-0 z-30">
        <div className="flex items-center gap-3 md:gap-4 ml-10 md:ml-0">
          <div className="relative flex-shrink-0">
            <CachedAvatar conversation={conversation} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover shadow-sm bg-slate-100" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{conversation.customerName}</h3>
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
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 bg-slate-50/20 custom-scrollbar">
        {chatMessages.length === 0 && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
              <MessageSquare size={24} className="opacity-20" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Delta Channel Active</p>
            {!isHistorySynced && <p className="text-[8px] font-black uppercase tracking-tighter text-blue-500 mt-2">Sync History for old messages</p>}
          </div>
        )}
        {isLoadingMessages && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-400/50">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Opening Secure Channel...</p>
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

      <div className="p-4 md:p-8 border-t border-slate-100 bg-white shrink-0">
        {lastError && (
          <div className="mb-4 p-4 bg-red-600 text-white text-xs font-black rounded-2xl flex items-center gap-3 animate-shake shadow-xl shadow-red-200 border border-red-700">
            <AlertCircle size={20} className="flex-shrink-0" /> {lastError}
          </div>
        )}

        {showLibrary && (
          <div className="absolute bottom-full left-4 right-4 md:left-8 md:right-8 mb-4 bg-white border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-200">
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

      {showSecurityPopup && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-sm p-10 text-center animate-in zoom-in-95 border-b-8 border-red-500">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-100">
                 <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-4">Security Violation</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                 You are attempting to send a <span className="text-red-600 font-black">Restricted URL</span>. Agents are strictly prohibited from sending external links not present in the verified library.
              </p>
              <button 
                onClick={() => setShowSecurityPopup(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl active:scale-95"
              >
                I Understand
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
