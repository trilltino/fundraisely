/**
 * # UI State Slice
 *
 * Manages application-wide UI state including modals, toasts, sidebar state, and
 * theme preferences. Centralizes UI state that doesn't fit into domain-specific
 * slices (room, player, charity, wallet).
 *
 * ## State Management
 * - `sidebarOpen`: Sidebar collapsed/expanded state (mobile/desktop)
 * - `activeModal`: Currently displayed modal (null if none)
 * - `theme`: Light/dark theme preference
 * - `toasts`: Active toast notifications
 *
 * ## Actions
 * - `toggleSidebar`: Open/close sidebar
 * - `openModal`: Show a specific modal
 * - `closeModal`: Hide current modal
 * - `setTheme`: Change light/dark theme
 * - `addToast`: Show toast notification
 * - `removeToast`: Dismiss toast notification
 *
 * ## Integration Points
 * - **Layout Components**: Sidebar uses sidebarOpen
 * - **Modal System**: All modals use activeModal
 * - **Toast System**: Uses toasts array for notifications
 *
 * ## Related Files
 * - `components/Layout.tsx` (future) - Uses sidebar state
 * - `components/Modal.tsx` (future) - Uses modal state
 * - `components/Toast.tsx` (future) - Uses toast state
 */

import { StateCreator } from 'zustand'

export type ModalType =
  | 'create-room'
  | 'join-room'
  | 'select-charity'
  | 'wallet-select'
  | null

export type Theme = 'light' | 'dark' | 'system'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export interface UISlice {
  // State
  sidebarOpen: boolean
  activeModal: ModalType
  theme: Theme
  toasts: Toast[]

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modal: ModalType) => void
  closeModal: () => void
  setTheme: (theme: Theme) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  // Initial state
  sidebarOpen: true,
  activeModal: null,
  theme: 'system',
  toasts: [],

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openModal: (modal) => set({ activeModal: modal }),

  closeModal: () => set({ activeModal: null }),

  setTheme: (theme) => set({ theme }),

  addToast: (toast) => set((state) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    return { toasts: [...state.toasts, { ...toast, id }] }
  }),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  clearToasts: () => set({ toasts: [] }),
})
