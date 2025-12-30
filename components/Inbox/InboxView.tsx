
import React, { useState } from 'react';
import { Search, MessageSquareOff, Facebook, ChevronLeft } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Conversation, ConversationStatus, UserRole } from '../../types';
import ChatWindow from './ChatWindow';

const InboxView: React.FC = () => {
  const { conversations, currentUser, pages } = useApp();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConversationStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  const visibleConversations = conversations.filter(conv => {
    const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const isAssigned = isAdmin || (currentUser?.assignedPageIds || []).includes(conv.pageId);
    if (!isAssigned) return false;
    const matchesFilter = filter === 'ALL' || conv.status === filter;
    const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.OPEN: return 'bg-blue-50 text-blue-600 border-blue-100';
      case ConversationStatus.PENDING: return 'bg-amber-50 text-amber-600 border-amber-100';
      case ConversationStatus.RESOLVED: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] bg-white overflow-hidden rounded-3xl md:rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/40">
      {/* Sidebar List - Hidden on mobile if chat is active */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30 ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Messages</h2>
            <div className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">
              {visibleConversations.length} Live
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search chats..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {(['ALL', ConversationStatus.OPEN, ConversationStatus.PENDING, ConversationStatus.RESOLVED] as const).map((stat) => (
              <button
                key={stat}
                onClick={() => setFilter(stat)}
                className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex-shrink-0 border ${
                  filter === stat 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 md:px-4 pb-8 space-y-2">
          {visibleConversations.length > 0 ? (
            visibleConversations.map((conv) => {
              const page = pages.find(p => p.id === conv.pageId);
              const isActive = activeConv?.id === conv.id;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-3 md:p-4 rounded-2xl md:rounded-[28px] transition-all border relative group ${
                    isActive 
                      ? 'bg-white border-blue-500 shadow-xl shadow-blue-100/50 ring-4 ring-blue-50' 
                      : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="relative flex-shrink-0">
                      <img src={conv.customerAvatar} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl shadow-sm object-cover" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Facebook size={10} className="text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className={`font-bold truncate text-sm transition-colors ${isActive ? 'text-blue-600' : 'text-slate-800'}`}>
                          {conv.customerName}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 flex-shrink-0 ml-2">
                          {new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs truncate text-slate-500 mb-2">{conv.lastMessage}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${getStatusColor(conv.status)}`}>
                          {conv.status}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-lg truncate max-w-[80px]">
                           {page?.name || 'Page'}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <MessageSquareOff size={32} className="opacity-20 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Detail - Full screen on mobile if active */}
      <div className={`flex-1 bg-white relative ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {activeConv ? (
          <div className="flex flex-col w-full h-full">
            {/* Mobile Back Button */}
            <button 
              onClick={() => setActiveConvId(null)}
              className="md:hidden absolute top-5 left-4 z-50 p-2 bg-slate-100 text-slate-600 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <ChatWindow conversation={activeConv} />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/20">
             <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mb-6 shadow-sm border border-slate-100">
               <MessageSquareOff size={32} className="text-slate-200" />
             </div>
             <h3 className="text-slate-800 font-bold mb-2">Select a Conversation</h3>
             <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
               Choose a chat from the sidebar to view history and reply.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxView;
