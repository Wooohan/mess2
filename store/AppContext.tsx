
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { User, UserRole, FacebookPage, Conversation, Message, ConversationStatus, ApprovedLink, ApprovedMedia } from '../types';
import { MOCK_USERS, MOCK_PAGES, MOCK_CONVERSATIONS } from '../constants';
import { dbService } from '../services/dbService';
import { fetchPageConversations, fetchThreadMessages } from '../services/facebookService';

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
  updatePage: (id: string, updates: Partial<FacebookPage>) => Promise<void>;
  addPage: (page: FacebookPage) => Promise<void>;
  removePage: (id: string) => Promise<void>;
  conversations: Conversation[];
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  messages: Message[];
  addMessage: (msg: Message) => Promise<void>;
  agents: User[];
  addAgent: (agent: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  syncMetaConversations: () => Promise<void>;
  simulateIncomingWebhook: (pageId: string) => Promise<void>;
  approvedLinks: ApprovedLink[];
  setApprovedLinks: React.Dispatch<React.SetStateAction<ApprovedLink[]>>;
  approvedMedia: ApprovedMedia[];
  setApprovedMedia: React.Dispatch<React.SetStateAction<ApprovedMedia[]>>;
  dashboardStats: DashboardStats;
  dbStatus: 'connected' | 'syncing' | 'error' | 'initializing';
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const USER_SESSION_KEY = 'messengerflow_session_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error' | 'initializing'>('initializing');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [approvedLinks, setApprovedLinks] = useState<ApprovedLink[]>([]);
  const [approvedMedia, setApprovedMedia] = useState<ApprovedMedia[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await dbService.init();
        const agentsData = await dbService.getAll<User>('agents');
        const pagesData = await dbService.getAll<FacebookPage>('pages');
        const convsData = await dbService.getAll<Conversation>('conversations');
        const msgsData = await dbService.getAll<Message>('messages');
        const linksData = await dbService.getAll<ApprovedLink>('links');
        const mediaData = await dbService.getAll<ApprovedMedia>('media');

        if (agentsData.length === 0) {
          for (const u of MOCK_USERS) await dbService.put('agents', u);
          for (const p of MOCK_PAGES) await dbService.put('pages', p);
          for (const c of MOCK_CONVERSATIONS) await dbService.put('conversations', c);
        }

        setAgents(agentsData.length ? agentsData : MOCK_USERS);
        setPages(pagesData);
        setConversations(convsData);
        setMessages(msgsData);
        setApprovedLinks(linksData);
        setApprovedMedia(mediaData);

        const session = localStorage.getItem(USER_SESSION_KEY);
        if (session) setCurrentUser(JSON.parse(session));
        
        setDbStatus('connected');
      } catch (err) {
        setDbStatus('error');
      }
    };
    initDatabase();
  }, []);

  const dashboardStats = useMemo(() => {
    const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const assignedPageIds = currentUser?.assignedPageIds || [];
    const relevantConvs = conversations.filter(c => isAdmin || assignedPageIds.includes(c.pageId));
    const openChats = relevantConvs.filter(c => c.status === ConversationStatus.OPEN).length;
    const resolvedToday = relevantConvs.filter(c => c.status === ConversationStatus.RESOLVED).length;
    return { openChats, avgResponseTime: "0m 30s", resolvedToday, csat: "98%" };
  }, [conversations, currentUser]);

  const syncMetaConversations = async () => {
    setDbStatus('syncing');
    try {
      for (const page of pages) {
        if (!page.accessToken) continue;
        const metaConvs = await fetchPageConversations(page.id, page.accessToken);
        for (const conv of metaConvs) {
          await dbService.put('conversations', conv);
          const metaMsgs = await fetchThreadMessages(conv.id, page.accessToken);
          for (const msg of metaMsgs) {
            await dbService.put('messages', msg);
          }
        }
      }
      // Refresh local state
      setConversations(await dbService.getAll<Conversation>('conversations'));
      setMessages(await dbService.getAll<Message>('messages'));
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setDbStatus('connected');
    }
  };

  const updatePage = async (id: string, updates: Partial<FacebookPage>) => {
    setDbStatus('syncing');
    const updated = pages.map(p => p.id === id ? { ...p, ...updates } : p);
    setPages(updated);
    const page = updated.find(p => p.id === id);
    if (page) await dbService.put('pages', page);
    setDbStatus('connected');
  };

  const addPage = async (page: FacebookPage) => {
    setDbStatus('syncing');
    setPages(prev => [...prev, page]);
    await dbService.put('pages', page);
    setDbStatus('connected');
  };

  const removePage = async (id: string) => {
    setDbStatus('syncing');
    setPages(prev => prev.filter(p => p.id !== id));
    await dbService.delete('pages', id);
    setDbStatus('connected');
  };

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    setDbStatus('syncing');
    const updated = conversations.map(c => c.id === id ? { ...c, ...updates } : c);
    setConversations(updated);
    const conv = updated.find(c => c.id === id);
    if (conv) await dbService.put('conversations', conv);
    setDbStatus('connected');
  };

  const addMessage = async (msg: Message) => {
    setDbStatus('syncing');
    setMessages(prev => [...prev, msg]);
    await dbService.put('messages', msg);
    await updateConversation(msg.conversationId, {
      lastMessage: msg.text,
      lastTimestamp: msg.timestamp,
    });
    setDbStatus('connected');
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const user = agents.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = async () => {
    localStorage.removeItem(USER_SESSION_KEY);
    setCurrentUser(null);
    window.location.reload();
  };

  const simulateIncomingWebhook = async (pageId: string) => {
    const customerId = `sim-${Date.now()}`;
    const newConv: Conversation = {
      id: `conv-sim-${Date.now()}`,
      pageId,
      customerId,
      customerName: "Simulated User",
      customerAvatar: `https://picsum.photos/seed/${customerId}/200`,
      lastMessage: "Test message",
      lastTimestamp: new Date().toISOString(),
      status: ConversationStatus.OPEN,
      assignedAgentId: null,
      unreadCount: 1,
    };
    setConversations(prev => [newConv, ...prev]);
    await dbService.put('conversations', newConv);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      pages, addPage, removePage, updatePage,
      conversations, updateConversation,
      messages, addMessage,
      agents, addAgent: async (a) => { setAgents(p => [...p, a]); await dbService.put('agents', a); },
      updateUser: async (id, u) => { /* logic */ },
      login, logout, syncMetaConversations,
      simulateIncomingWebhook,
      approvedLinks, setApprovedLinks,
      approvedMedia, setApprovedMedia,
      dashboardStats, dbStatus
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
