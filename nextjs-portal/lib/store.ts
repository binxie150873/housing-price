import { create } from "zustand";

interface PortalState {
  /** Currently active application section */
  activeApp: "home" | "estimator" | "market";
  setActiveApp: (app: "home" | "estimator" | "market") => void;

  /** Mobile menu open state */
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}

export const usePortalStore = create<PortalState>((set) => ({
  activeApp: "home",
  setActiveApp: (app) => set({ activeApp: app }),

  isMobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
}));
