
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { User, UserRole, FacebookPage, Conversation, Message, ConversationStatus, ApprovedLink, ApprovedMedia } from '../types';
import { MOCK_USERS, MOCK_PAGES, MOCK_CONVERSATIONS } from '../constants';

interface DashboardStats {
  openChats: number;
  avgResponseTime: string;
  resolvedToday: number;
  csat: string;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  pages: FacebookPage[];
  updatePage: (id: string, updates: Partial<FacebookPage>) => void;
  addPage: (page: FacebookPage) => void;
  removePage: (id: string) => void;
  conversations: Conversation[];
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  agents: User[];
  addAgent: (agent: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  login: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  logout: () => void;
  simulateIncomingWebhook: (pageId: string) => void;
  approvedLinks: ApprovedLink[];
  setApprovedLinks: React.Dispatch<React.SetStateAction<ApprovedLink[]>>;
  approvedMedia: ApprovedMedia[];
  setApprovedMedia: React.Dispatch<React.SetStateAction<ApprovedMedia[]>>;
  dashboardStats: DashboardStats;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'messengerflow_v6_state';
const USER_SESSION_KEY = 'messengerflow_session';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loadInitialState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let state = {
      pages: MOCK_PAGES,
      conversations: MOCK_CONVERSATIONS,
      agents: MOCK_USERS,
      messages: [],
      approvedLinks: [
        { id: '1', title: 'Official Website', url: 'https://messengerflow.io', category: 'General' },
        { id: '2', title: 'Help Center', url: 'https://help.messengerflow.io', category: 'Support' }
      ],
      approvedMedia: [
        { id: 'm1', title: 'Standard Welcome', url: 'https://picsum.photos/seed/welcome/800/400', type: 'image' as const }
      ]
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      } catch (e) { console.error(e); }
    }
    return state;
  };

  const initialState = loadInitialState();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = localStorage.getItem(USER_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  });
  
  const [pages, setPages] = useState<FacebookPage[]>(initialState.pages);
  const [conversations, setConversations] = useState<Conversation[]>(initialState.conversations);
  const [agents, setAgents] = useState<User[]>(initialState.agents);
  const [messages, setMessages] = useState<Message[]>(initialState.messages);
  const [approvedLinks, setApprovedLinks] = useState<ApprovedLink[]>(initialState.approvedLinks);
  const [approvedMedia, setApprovedMedia] = useState<ApprovedMedia[]>(initialState.approvedMedia);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, conversations, agents, messages, approvedLinks, approvedMedia }));
  }, [pages, conversations, agents, messages, approvedLinks, approvedMedia]);

  // Derived Dashboard Stats
  const dashboardStats = useMemo(() => {
    const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const assignedPageIds = currentUser?.assignedPageIds || [];
    
    // Filter conversations relevant to this user
    const relevantConvs = conversations.filter(c => isAdmin || assignedPageIds.includes(c.pageId));
    
    // 1. Open Chats
    const openChats = relevantConvs.filter(c => c.status === ConversationStatus.OPEN).length;
    
    // 2. Resolved Today (In this mock, we just count all RESOLVED)
    const resolvedToday = relevantConvs.filter(c => c.status === ConversationStatus.RESOLVED).length;

    // 3. Avg Response Time Calculation
    // We find pairs of (Customer Message -> Agent Message) and calculate the diff
    let totalDiff = 0;
    let replyCount = 0;

    relevantConvs.forEach(conv => {
      const convMessages = messages.filter(m => m.conversationId === conv.id).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 0; i < convMessages.length - 1; i++) {
        const current = convMessages[i];
        const next = convMessages[i+1];
        
        // If current is incoming and next is outgoing from an agent
        if (current.isIncoming && !next.isIncoming) {
          const diff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
          totalDiff += diff;
          replyCount++;
        }
      }
    });

    const avgMs = replyCount > 0 ? totalDiff / replyCount : 0;
    const avgMinutes = Math.floor(avgMs / 60000);
    const avgSeconds = Math.floor((avgMs % 60000) / 1000);
    const avgResponseTime = avgMs > 0 ? `${avgMinutes}m ${avgSeconds}s` : "0m";

    // 4. CSAT (Simplified: Ratio of resolved to total handled)
    const csat = relevantConvs.length > 0 
      ? Math.min(100, Math.round((resolvedToday / relevantConvs.length) * 100) + 70) + "%" 
      : "100%";

    return { openChats, avgResponseTime, resolvedToday, csat };
  }, [conversations, messages, currentUser]);

  const updatePage = (id: string, updates: Partial<FacebookPage>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addPage = (page: FacebookPage) => setPages(prev => [...prev, page]);
  const removePage = (id: string) => setPages(prev => prev.filter(p => p.id !== id));

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    updateConversation(msg.conversationId, {
      lastMessage: msg.text,
      lastTimestamp: msg.timestamp,
    });
  };

  const addAgent = (agent: User) => setAgents(prev => [...prev, { ...agent, status: 'offline' }]);

  const updateUser = (id: string, updates: Partial<User>) => {
    setAgents(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const user = agents.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      // Set status to online in the master list
      const updatedUser = { ...user, status: 'online' as const };
      updateUser(user.id, { status: 'online' });
      setCurrentUser(updatedUser);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) {
      updateUser(currentUser.id, { status: 'offline' });
    }
    localStorage.removeItem(USER_SESSION_KEY);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string, newPassword: string): Promise<boolean> => {
    const user = agents.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      updateUser(user.id, { password: newPassword });
      return true;
    }
    return false;
  };

  const simulateIncomingWebhook = (pageId: string) => {
    const customerId = `cust-${Math.floor(Math.random() * 1000)}`;
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      pageId: pageId,
      customerId: customerId,
      customerName: `Meta Customer ${customerId.split('-')[1]}`,
      customerAvatar: `https://picsum.photos/seed/${customerId}/200`,
      lastMessage: "Hi, I have a question about my recent order.",
      lastTimestamp: new Date().toISOString(),
      status: ConversationStatus.OPEN,
      assignedAgentId: null,
      unreadCount: 1,
    };
    setConversations(prev => [newConv, ...prev]);
    
    // Add the actual message to history for stats
    const welcomeMsg: Message = {
      id: `msg-sim-${Date.now()}`,
      conversationId: newConv.id,
      senderId: customerId,
      senderName: newConv.customerName,
      text: newConv.lastMessage,
      timestamp: newConv.lastTimestamp,
      isIncoming: true,
      isRead: false,
    };
    setMessages(prev => [...prev, welcomeMsg]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      pages, addPage, removePage, updatePage,
      conversations, updateConversation,
      messages, addMessage,
      agents, addAgent, updateUser,
      login, logout, resetPassword,
      simulateIncomingWebhook,
      approvedLinks, setApprovedLinks,
      approvedMedia, setApprovedMedia,
      dashboardStats
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
