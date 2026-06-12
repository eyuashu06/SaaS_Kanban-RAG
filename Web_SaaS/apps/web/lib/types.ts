/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionPlan = 'Free' | 'Pro' | 'Enterprise';
export type UserRole = 'Admin' | 'Member' | 'Viewer';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  activeOrgId?: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD or ISO string
  assigneeId?: string;
  labels: string[];
  checklist?: { id: string; text: string; completed: boolean }[];
  recurring?: { enabled: boolean; frequency: 'daily' | 'weekly' | 'monthly'; interval?: number };
  attachments?: { id: string; name: string; url: string; size?: number; createdAt: string }[];
  history?: { id: string; userId: string; userName: string; action: string; details: string; createdAt: string }[];
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  boardId?: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  content: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface BillingState {
  currentPlan: SubscriptionPlan;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  usage: {
    boardsCount: number;
    tasksCount: number;
    aiQueriesCount: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
  sources?: string[]; // retrieved chunk identifiers
}

export interface AppState {
  users: User[];
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  comments: Comment[];
  docs: ProjectDocument[];
  logs: ActivityLog[];
  billing: BillingState;
  notifications: AppNotification[];
  currentUser: User;
}
