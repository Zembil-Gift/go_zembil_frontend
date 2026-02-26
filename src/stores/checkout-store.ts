import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ShippingInfo {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ShippingCoords {
  latitude?: number;
  longitude?: number;
  placeId?: string;
  formattedAddress?: string;
}

interface ItemGiftSelection {
  giftWrapping: boolean;
  giftMessage: string;
}

interface CheckoutStore {
  shippingInfo: ShippingInfo;
  billingInfo: ShippingInfo;
  sameAsShipping: boolean;
  contactPhone: string;
  contactEmail: string;
  itemGiftSelections: Record<string, ItemGiftSelection>;
  discountCode: string;
  selectedPaymentMethod: string;
  shippingCoords: ShippingCoords;

  setShippingInfo: (info: ShippingInfo) => void;
  setBillingInfo: (info: ShippingInfo) => void;
  setSameAsShipping: (same: boolean) => void;
  setContactPhone: (phone: string) => void;
  setContactEmail: (email: string) => void;
  setItemGiftSelections: (selections: Record<string, ItemGiftSelection>) => void;
  setDiscountCode: (code: string) => void;
  setSelectedPaymentMethod: (method: string) => void;
  setShippingCoords: (coords: ShippingCoords) => void;
  clearCheckout: () => void;
}

const defaultShippingInfo: ShippingInfo = {
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      shippingInfo: { ...defaultShippingInfo },
      billingInfo: { ...defaultShippingInfo },
      sameAsShipping: true,
      contactPhone: '',
      contactEmail: '',
      itemGiftSelections: {},
      discountCode: '',
      selectedPaymentMethod: '',
      shippingCoords: {},

      setShippingInfo: (info) => set({ shippingInfo: info }),
      setBillingInfo: (info) => set({ billingInfo: info }),
      setSameAsShipping: (same) => set({ sameAsShipping: same }),
      setContactPhone: (phone) => set({ contactPhone: phone }),
      setContactEmail: (email) => set({ contactEmail: email }),
      setItemGiftSelections: (selections) => set({ itemGiftSelections: selections }),
      setDiscountCode: (code) => set({ discountCode: code }),
      setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
      setShippingCoords: (coords) => set({ shippingCoords: coords }),
      clearCheckout: () =>
        set({
          shippingInfo: { ...defaultShippingInfo },
          billingInfo: { ...defaultShippingInfo },
          sameAsShipping: true,
          contactPhone: '',
          contactEmail: '',
          itemGiftSelections: {},
          discountCode: '',
          selectedPaymentMethod: '',
          shippingCoords: {},
        }),
    }),
    {
      name: 'checkout-draft',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
