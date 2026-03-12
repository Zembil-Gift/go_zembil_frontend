interface ChapaInlineCheckoutOptions {
  publicKey: string;
  amount: string;
  currency?: string;
  mobile?: string;
  tx_ref: string;
  availablePaymentMethods?: Array<'telebirr' | 'cbebirr' | 'ebirr' | 'mpesa' | 'chapa'>;
  customizations?: {
    buttonText?: string;
    styles?: string;
    successMessage?: string;
  };
  callbackUrl?: string;
  returnUrl?: string;
  showFlag?: boolean;
  showPaymentMethodsNames?: boolean;
  onSuccessfulPayment?: (result: unknown, refId?: string) => void;
  onPaymentFailure?: (message: string) => void;
  onClose?: () => void;
}

interface ChapaInlineCheckoutInstance {
  initialize: (containerId?: string) => void;
}

declare module '@chapa_et/inline.js/lib/inline.js' {
  const ChapaInlineModule: {
    new (options: ChapaInlineCheckoutOptions): ChapaInlineCheckoutInstance;
  };

  export default ChapaInlineModule;
}

declare global {
  interface Window {
    ChapaCheckout?: new (
      options: ChapaInlineCheckoutOptions
    ) => ChapaInlineCheckoutInstance;
  }
}

export {};