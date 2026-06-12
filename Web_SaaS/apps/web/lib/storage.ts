/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const mockStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage.getItem blocked, using fallback memory storage:', e);
      return mockStore[key] || null;
    }
  },
  
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage.setItem blocked, using fallback memory storage:', e);
      mockStore[key] = value;
    }
  },
  
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage.removeItem blocked, using fallback memory storage:', e);
      delete mockStore[key];
    }
  }
};
