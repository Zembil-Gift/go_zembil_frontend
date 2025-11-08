import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SuccessAnimation from "@/components/animations/SuccessAnimation";

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Clear any return URL from localStorage since we've completed the order
    localStorage.removeItem('returnTo');
  }, []);

  return (
    <SuccessAnimation
      title="Order Placed Successfully!"
      message={orderId ? `Order #${orderId} is being prepared with love` : "Your gift has been sent with love"}
      showContinueButton={true}
      continueLink="/gifts"
    />
  );
}