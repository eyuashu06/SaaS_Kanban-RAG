/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Board, Column, Task, User, Comment, ActivityLog, ProjectDocument, AppNotification, BillingState, AppState } from '../lib/types';
import { safeStorage } from '../lib/storage';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = safeStorage.getItem('saas_authed_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export async function fetchAppState(): Promise<AppState> {
  const res = await authFetch('/api/state');
  if (!res.ok) throw new Error('Failed to load application state');
  return res.json();
}

export async function resetAppState(): Promise<{ state: AppState }> {
  const res = await authFetch('/api/state/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset state');
  return res.json();
}

export async function switchUser(userId: string): Promise<{ user: User }> {
  const res = await authFetch('/api/user/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error('Failed to switch user');
  return res.json();
}

export async function createBoard(name: string, description?: string): Promise<{ board: Board; state: AppState }> {
  const res = await authFetch('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create board');
  }
  return res.json();
}

export async function deleteBoard(id: string): Promise<{ state: AppState }> {
  const res = await authFetch(`/api/boards/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete board');
  }
  return res.json();
}

export async function createColumn(boardId: string, name: string): Promise<{ column: Column; state: AppState }> {
  const res = await authFetch('/api/columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, name })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create column');
  }
  return res.json();
}

export async function updateColumn(id: string, name?: string, order?: number): Promise<{ column: Column; state: AppState }> {
  const res = await authFetch(`/api/columns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, order })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update column');
  }
  return res.json();
}

export async function deleteColumn(id: string): Promise<{ state: AppState }> {
  const res = await authFetch(`/api/columns/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete column');
  }
  return res.json();
}

export async function createTask(taskData: Partial<Task>): Promise<{ task: Task; state: AppState }> {
  const res = await authFetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create task');
  }
  return res.json();
}

export async function updateTask(id: string, taskUpdates: Partial<Task>): Promise<{ task: Task; state: AppState }> {
  const res = await authFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskUpdates)
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update task');
  }
  return res.json();
}

export async function deleteTask(id: string): Promise<{ state: AppState }> {
  const res = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete task');
  }
  return res.json();
}

export async function addComment(taskId: string, text: string): Promise<{ comment: Comment; state: AppState }> {
  const res = await authFetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, text })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to add comment');
  }
  return res.json();
}

export async function createDocument(title: string, content: string): Promise<{ doc: ProjectDocument; state: AppState }> {
  const res = await authFetch('/api/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create document');
  }
  return res.json();
}

export async function deleteDocument(id: string): Promise<{ state: AppState }> {
  const res = await authFetch(`/api/docs/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete document');
  }
  return res.json();
}

export async function clearNotifications(): Promise<{ state: AppState }> {
  const res = await authFetch('/api/notifications/read-all', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear notifications');
  return res.json();
}

export async function upgradePlan(plan: 'Free' | 'Pro' | 'Enterprise'): Promise<{ state: AppState }> {
  const checkoutRes = await authFetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });
  
  if (checkoutRes.ok) {
    const checkoutData = await checkoutRes.json();
    if (checkoutData.url) {
      window.location.href = checkoutData.url;
      return new Promise(() => {}); // prevent resolution during redirect
    }
  }

  const res = await authFetch('/api/billing/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to upgrade plan');
  }
  return res.json();
}

export async function inviteTeamUser(name: string, email: string, role: string): Promise<{ user: User; state: AppState }> {
  const res = await authFetch('/api/users/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, role })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to trigger user invitation');
  }
  return res.json();
}

export async function askAiAssistant(query: string): Promise<{ text: string; sources?: string[] }> {
  const res = await authFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch AI assistant reply');
  }
  return res.json();
}

export async function registerUser(name: string, email: string, password?: string): Promise<{ user: User; state: AppState; token?: string; refreshToken?: string }> {
  const res = await authFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(email: string, password?: string): Promise<{ user: User; state: AppState; token?: string; refreshToken?: string }> {
  const res = await authFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

export async function authenticateWithGoogle(name: string, email: string, avatarUrl?: string): Promise<{ user: User; state: AppState; token?: string; refreshToken?: string }> {
  const res = await authFetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, avatarUrl })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Google Authentication failed');
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
  const res = await authFetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Forgot password request failed');
  }
  return res.json();
}

export async function resetPassword(token: string, password?: string): Promise<{ message: string }> {
  const res = await authFetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Reset password failed');
  }
  return res.json();
}
