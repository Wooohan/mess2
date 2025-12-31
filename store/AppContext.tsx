
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { User, UserRole, FacebookPage, Conversation, Message, ConversationStatus, ApprovedLink, ApprovedMedia } from '../types';
import { MOCK_USERS, MOCK_PAGES, MOCK_CONVERSATIONS } from '../constants';
import { dbService } from '../services/dbService';
import { fetchPageConversations, fetchThreadMessages, verifyPageAccessToken } from '../services/facebookService';

interface DashboardStats {
  openChats: number;
  avgResponseTime: string;
  resolvedToday: number;
  csat: string;
  chartData: { name: string; conversations: number }[];
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
  removeAgent: (id: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  syncMetaConversations: () => Promise<void>;
  verifyPageConnection: (pageId: string) => Promise<boolean>;
  simulateIncomingWebhook: (pageId: string) => Promise<void>;
  approvedLinks: ApprovedLink[];
  addApprovedLink: (link: ApprovedLink) => Promise<void>;
  removeApprovedLink: (id: string) => Promise<void>;
  approvedMedia: ApprovedMedia[];
  addApprovedMedia: (media: ApprovedMedia) => Promise<void>;
  removeApprovedMedia: (id: string) => Promise<void>;
  dashboardStats: DashboardStats;
  dbStatus: 'connected' | 'syncing' | 'error' | 'initializing';
  clearLocalChats: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const USER_SESSION_KEY = 'messengerflow_session_v1';

// Helper to fetch image as binary Blob for persistence
const fetchAsBlob = async (url: string): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.blob();
  } catch (e) {
    console.warn("Could not fetch avatar as binary:", url, e);
    return null;
  }
};

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

        if (agentsData.length === 0 && MOCK_USERS.length > 0) {
          for (const u of MOCK_USERS) await dbService.put('agents', u);
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

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => 
      new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [conversations]);

  const dashboardStats = useMemo(() => {
    const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const relevantConvs = sortedConversations.filter(c => {
      const page = pages.find(p => p.id === c.pageId);
      return isAdmin || (page?.assignedAgentIds || []).includes(currentUser?.id || '');
    });
    
    const openChats = relevantConvs.filter(c => c.status === ConversationStatus.OPEN).length;
    const resolvedToday = relevantConvs.filter(c => c.status === ConversationStatus.RESOLVED).length;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const chartData = last7Days.map(dateStr => {
      const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
      const count = relevantConvs.filter(c => c.lastTimestamp.startsWith(dateStr)).length;
      return { name: dayName, conversations: count };
    });

    return { 
      openChats, 
      avgResponseTime: "0m 30s", 
      resolvedToday, 
      csat: "98%",
      chartData
    };
  }, [sortedConversations, currentUser, pages]);

  const syncMetaConversations = async () => {
    if (pages.length === 0) return;
    setDbStatus('syncing');
    try {
      const existingConvs = await dbService.getAll<Conversation>('conversations');
      const existingMap = new Map(existingConvs.map(c => [c.id, c]));

      for (const page of pages) {
        if (!page.accessToken) continue;
        const metaConvs = await fetchPageConversations(page.id, page.accessToken);
        
        for (const conv of metaConvs) {
          const local = existingMap.get(conv.id);
          
          // PERSISTENCE FIX: Check if we have a binary blob locally
          if (local && local.customerAvatarBlob) {
            conv.customerAvatarBlob = local.customerAvatarBlob;
          } else if (conv.customerAvatar) {
            // First time seeing this user or missing blob, fetch and store as binary
            const blob = await fetchAsBlob(conv.customerAvatar);
            if (blob) conv.customerAvatarBlob = blob;
          }

          await dbService.put('conversations', conv);
        }
      }
      const allConvs = await dbService.getAll<Conversation>('conversations');
      setConversations(allConvs);
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setDbStatus('connected');
    }
  };

  const clearLocalChats = async () => {
    setDbStatus('syncing');
    try {
      await dbService.clearStore('conversations');
      await dbService.clearStore('messages');
      setConversations([]);
      setMessages([]);
    } catch (e) {
      console.error("Clear failed", e);
    } finally {
      setDbStatus('connected');
    }
  };

  const verifyPageConnection = async (pageId: string): Promise<boolean> => {
    const page = pages.find(p => p.id === pageId);
    if (!page || !page.accessToken) return false;
    return await verifyPageAccessToken(page.id, page.accessToken);
  };

  const addApprovedLink = async (link: ApprovedLink) => {
    await dbService.put('links', link);
    setApprovedLinks(prev => [...prev, link]);
  };

  const removeApprovedLink = async (id: string) => {
    await dbService.delete('links', id);
    setApprovedLinks(prev => prev.filter(l => l.id !== id));
  };

  const addApprovedMedia = async (media: ApprovedMedia) => {
    await dbService.put('media', media);
    setApprovedMedia(prev => [...prev, media]);
  };

  const removeApprovedMedia = async (id: string) => {
    await dbService.delete('media', id);
    setApprovedMedia(prev => prev.filter(m => m.id !== id));
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
    setPages(prev => {
      if (prev.find(p => p.id === page.id)) return prev;
      return [...prev, page];
    });
    await dbService.put('pages', page);
    try {
      const metaConvs = await fetchPageConversations(page.id, page.accessToken);
      for (const conv of metaConvs) {
        // Initial sync: fetch blob
        if (conv.customerAvatar) {
          const blob = await fetchAsBlob(conv.customerAvatar);
          if (blob) conv.customerAvatarBlob = blob;
        }
        await dbService.put('conversations', conv);
      }
      setConversations(await dbService.getAll<Conversation>('conversations'));
    } catch (e) {
      console.error("Initial sync for page failed", e);
    }
    setDbStatus('connected');
  };

  const removePage = async (id: string) => {
    setDbStatus('syncing');
    setPages(prev => prev.filter(p => p.id !== id));
    await dbService.delete('pages', id);
    setDbStatus('connected');
  };

  const removeAgent = async (id: string) => {
    setDbStatus('syncing');
    setAgents(prev => prev.filter(a => a.id !== id));
    await dbService.delete('agents', id);
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
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;

      const isOfficial = !msg.id.startsWith('msg-');
      if (isOfficial) {
        return [
          ...prev.filter(m => {
            if (!m.id.startsWith('msg-')) return true;
            const isPotentialMatch = m.text === msg.text && m.conversationId === msg.conversationId;
            if (isPotentialMatch && !msg.isIncoming) {
              return false; 
            }
            return true;
          }),
          msg
        ];
      }

      return [...prev, msg];
    });

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
      conversations: sortedConversations, updateConversation,
      messages, addMessage,
      agents, addAgent: async (a) => { setAgents(p => [...p, a]); await dbService.put('agents', a); },
      removeAgent,
      updateUser: async (id, u) => { 
        const updated = agents.map(a => a.id === id ? { ...a, ...u } : a);
        setAgents(updated);
        const agent = updated.find(a => a.id === id);
        if (agent) {
          await dbService.put('agents', agent);
          if (currentUser?.id === id) {
            const updatedUser = { ...currentUser, ...u };
            setCurrentUser(updatedUser);
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
          }
        }
      },
      login, logout, syncMetaConversations, verifyPageConnection,
      simulateIncomingWebhook,
      approvedLinks, addApprovedLink, removeApprovedLink,
      approvedMedia, addApprovedMedia, removeApprovedMedia,
      dashboardStats, dbStatus, clearLocalChats
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
