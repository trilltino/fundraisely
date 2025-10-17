/**
 * UI STORE - User Interface State Management
 *
 * PURPOSE:
 * Manages ephemeral UI state such as modals, notifications, loading states, and
 * other UI-only concerns. Separated from business logic for cleaner state management.
 *
 * ROLE IN APPLICATION:
 * - Tracks modal open/close states
 * - Manages notification display
 * - Handles loading indicators
 * - Stores win notification state
 * - Manages UI-only flags and toggles
 *
 * KEY FEATURES:
 * - UI-only state (no business logic)
 * - Easy modal management
 * - Notification queue support
 * - Loading state tracking
 *
 * USAGE:
 * ```typescript
 * import { useUIStore } from '@/stores/uiStore';
 *
 * function MyModal() {
 *   const showModal = useUIStore(state => state.showConfirmModal);
 *   const setShowModal = useUIStore(state => state.setShowConfirmModal);
 *
 *   return showModal ? (
 *     <Modal onClose={() => setShowModal(false)}>
 *       Modal content
 *     </Modal>
 *   ) : null;
 * }
 * ```
 */

import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: number;
}

export interface UIStore {
  // Modal states
  showConfirmModal: boolean;
  showVerifyRoomModal: boolean;
  showAccessError: boolean;
  showGameOver: boolean;

  // Loading states
  isLoading: boolean;
  loadingMessage: string;

  // Notification state
  showWinNotification: boolean;
  winNotificationType: 'line' | 'fullHouse' | '';
  winnerName: string;

  // Notification queue
  notifications: Notification[];

  // Access error
  accessErrorMessage: string;

  // Actions - Modals
  setShowConfirmModal: (show: boolean) => void;
  setShowVerifyRoomModal: (show: boolean) => void;
  setShowAccessError: (show: boolean) => void;
  setShowGameOver: (show: boolean) => void;

  // Actions - Loading
  setIsLoading: (loading: boolean, message?: string) => void;

  // Actions - Win notifications
  setShowWinNotification: (show: boolean) => void;
  setWinNotificationType: (type: 'line' | 'fullHouse' | '') => void;
  setWinnerName: (name: string) => void;
  showWinMessage: (type: 'line' | 'fullHouse', winnerName: string) => void;
  hideWinMessage: () => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Access error
  setAccessErrorMessage: (message: string) => void;

  // Reset
  resetUIStore: () => void;
}

// Initial state factory
const createInitialState = () => ({
  // Modals
  showConfirmModal: false,
  showVerifyRoomModal: false,
  showAccessError: false,
  showGameOver: false,

  // Loading
  isLoading: false,
  loadingMessage: '',

  // Win notifications
  showWinNotification: false,
  winNotificationType: '' as '' | 'line' | 'fullHouse',
  winnerName: '',

  // Notifications
  notifications: [] as Notification[],

  // Access error
  accessErrorMessage: '',
});

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useUIStore = create<UIStore>()((set, get) => ({
  ...createInitialState(),

  // Modal actions
  setShowConfirmModal: (showConfirmModal) => {
    if (get().showConfirmModal !== showConfirmModal) {
      set({ showConfirmModal });
    }
  },

  setShowVerifyRoomModal: (showVerifyRoomModal) => {
    if (get().showVerifyRoomModal !== showVerifyRoomModal) {
      set({ showVerifyRoomModal });
    }
  },

  setShowAccessError: (showAccessError) => {
    if (get().showAccessError !== showAccessError) {
      set({ showAccessError });
    }
  },

  setShowGameOver: (showGameOver) => {
    if (get().showGameOver !== showGameOver) {
      set({ showGameOver });
    }
  },

  // Loading actions
  setIsLoading: (isLoading, loadingMessage = '') => {
    set({ isLoading, loadingMessage });
  },

  // Win notification actions
  setShowWinNotification: (showWinNotification) => {
    if (get().showWinNotification !== showWinNotification) {
      set({ showWinNotification });
    }
  },

  setWinNotificationType: (winNotificationType) => {
    if (get().winNotificationType !== winNotificationType) {
      set({ winNotificationType });
    }
  },

  setWinnerName: (winnerName) => {
    if (get().winnerName !== winnerName) {
      set({ winnerName });
    }
  },

  // Show win message (convenience method)
  showWinMessage: (type, winnerName) => {
    set({
      showWinNotification: true,
      winNotificationType: type,
      winnerName,
    });
  },

  // Hide win message
  hideWinMessage: () => {
    set({
      showWinNotification: false,
      winNotificationType: '',
      winnerName: '',
    });
  },

  // Notification actions
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: Date.now(),
    };

    set({
      notifications: [...get().notifications, newNotification],
    });

    // Auto-remove after duration
    if (notification.duration) {
      setTimeout(() => {
        get().removeNotification(newNotification.id);
      }, notification.duration);
    }
  },

  removeNotification: (id) => {
    set({
      notifications: get().notifications.filter(n => n.id !== id),
    });
  },

  clearNotifications: () => {
    if (get().notifications.length > 0) {
      set({ notifications: [] });
    }
  },

  // Access error actions
  setAccessErrorMessage: (accessErrorMessage) => {
    if (get().accessErrorMessage !== accessErrorMessage) {
      set({ accessErrorMessage });
    }
  },

  // Reset to initial state
  resetUIStore: () => {
    set(createInitialState());
  },
}));

export default useUIStore;
