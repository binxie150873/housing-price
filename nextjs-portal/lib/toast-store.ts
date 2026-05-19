import { create } from "zustand";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  recoveryAction?: string;
  onRecover?: () => void;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const message =
      toast.message.length > 120
        ? toast.message.slice(0, 117) + "..."
        : toast.message;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, message, id }],
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearAll: () => set({ toasts: [] }),
}));
