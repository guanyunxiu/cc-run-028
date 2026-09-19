import { create } from 'zustand';
import type { User, UserRole } from '@/types';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser } from '@/api/api';
import { useProgressStore } from './useProgressStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  init: () => void;
  login: (username: string, password: string) => { success: boolean; message?: string };
  register: (username: string, password: string, role?: UserRole) => { success: boolean; message?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  init: () => {
    const user = getCurrentUser();
    if (user) {
      set({ user, isAuthenticated: true });
    }
  },

  login: (username, password) => {
    const user = apiLogin(username, password);
    if (user) {
      useProgressStore.getState().reset();
      set({ user, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, message: '用户名或密码错误' };
  },

  register: (username, password, role = 'student') => {
    if (!username || username.length < 3) {
      return { success: false, message: '用户名至少 3 个字符' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: '密码至少 6 个字符' };
    }
    const user = apiRegister(username, password, role);
    if (user) {
      useProgressStore.getState().reset();
      set({ user, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, message: '用户名已存在' };
  },

  logout: () => {
    apiLogout();
    useProgressStore.getState().reset();
    set({ user: null, isAuthenticated: false });
  },
}));
