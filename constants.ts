
import { User, UserRole, FacebookPage, Conversation, ConversationStatus } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'admin-0',
    name: 'Main Admin',
    email: 'wooohan3@gmail.com',
    password: 'Admin@1122',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://picsum.photos/seed/admin-main/200',
    status: 'online',
    // Added missing assignedPageIds property
    assignedPageIds: ['page-101', 'page-102'],
  },
  {
    id: 'admin-1',
    name: 'Alex Johnson',
    email: 'admin@messengerflow.io',
    password: 'password123',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://picsum.photos/seed/admin/200',
    status: 'online',
    // Added missing assignedPageIds property
    assignedPageIds: ['page-101', 'page-102'],
  },
  {
    id: 'agent-1',
    name: 'Sarah Smith',
    email: 'sarah@messengerflow.io',
    password: 'password123',
    role: UserRole.AGENT,
    avatar: 'https://picsum.photos/seed/sarah/200',
    status: 'online',
    // Added missing assignedPageIds property
    assignedPageIds: ['page-101'],
  },
  {
    id: 'agent-2',
    name: 'Mike Ross',
    email: 'mike@messengerflow.io',
    password: 'password123',
    role: UserRole.AGENT,
    avatar: 'https://picsum.photos/seed/mike/200',
    status: 'busy',
    // Added missing assignedPageIds property
    assignedPageIds: ['page-102'],
  },
];

export const MOCK_PAGES: FacebookPage[] = [
  {
    id: 'page-101',
    name: 'TechStore Online',
    category: 'E-commerce',
    isConnected: true,
    accessToken: 'EAAb...',
    assignedAgentIds: ['admin-1', 'agent-1'],
  },
  {
    id: 'page-102',
    name: 'Fitness First Hub',
    category: 'Gym & Health',
    isConnected: true,
    accessToken: 'EAAb...',
    assignedAgentIds: ['admin-1', 'agent-2'],
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    pageId: 'page-101',
    customerId: 'cust-1',
    customerName: 'John Doe',
    customerAvatar: 'https://picsum.photos/seed/john/200',
    lastMessage: 'Is the new iPhone in stock?',
    lastTimestamp: new Date().toISOString(),
    status: ConversationStatus.OPEN,
    assignedAgentId: 'agent-1',
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    pageId: 'page-101',
    customerId: 'cust-2',
    customerName: 'Jane Smith',
    customerAvatar: 'https://picsum.photos/seed/jane/200',
    lastMessage: 'I need help with my order #12345',
    lastTimestamp: new Date(Date.now() - 3600000).toISOString(),
    status: ConversationStatus.PENDING,
    assignedAgentId: null,
    unreadCount: 0,
  },
  {
    id: 'conv-3',
    pageId: 'page-102',
    customerId: 'cust-3',
    customerName: 'Bob Builder',
    customerAvatar: 'https://picsum.photos/seed/bob/200',
    lastMessage: 'What are your opening hours?',
    lastTimestamp: new Date(Date.now() - 86400000).toISOString(),
    status: ConversationStatus.RESOLVED,
    assignedAgentId: 'agent-2',
    unreadCount: 0,
  },
];