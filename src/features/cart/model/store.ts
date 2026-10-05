import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { addItem, removeItem, setQty, type CartItem } from './cart'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  add: (item: CartItem) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  open: () => void
  close: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (item) => set((s) => ({ items: addItem(s.items, item), isOpen: true })),
      setQty: (key, qty) => set((s) => ({ items: setQty(s.items, key, qty) })),
      remove: (key) => set((s) => ({ items: removeItem(s.items, key) })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: 'serafim-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
)
