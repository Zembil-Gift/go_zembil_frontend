import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number | string;
  image: string;
  quantity: number;
  stockQuantity?: number;
  skuId?: number;
  skuCode?: string;
  skuName?: string;
  customization?: any;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  appliedDiscountCode: string | null;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setAppliedDiscountCode: (code: string | null) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      appliedDiscountCode: null,
      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find(i =>
          i.productId === item.productId && 
          (i.skuId === item.skuId || (!i.skuId && !item.skuId))
        );
        
        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          // Respect stock limit if available
          const finalQuantity = item.stockQuantity !== undefined 
            ? Math.min(newQuantity, item.stockQuantity) 
            : newQuantity;

          set({
            items: items.map(i =>
              i.productId === item.productId && 
              (i.skuId === item.skuId || (!i.skuId && !item.skuId))
                ? { ...i, quantity: finalQuantity }
                : i
            )
          });
        } else {
          set({
            items: [...items, { ...item, id: Date.now() }]
          });
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter(item => item.id !== id) });
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        });
      },
      clearCart: () => {
        set({ items: [], appliedDiscountCode: null });
      },
      openCart: () => {
        set({ isOpen: true });
      },
      closeCart: () => {
        set({ isOpen: false });
      },
      toggleCart: () => {
        set({ isOpen: !get().isOpen });
      },
      setAppliedDiscountCode: (code) => {
        set({ appliedDiscountCode: code });
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (parseFloat(item.price as string) * item.quantity), 0);
      },
    }),
    {
      name: 'goGerami-cart',
    }
  )
);
