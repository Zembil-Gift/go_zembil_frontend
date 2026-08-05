import { TicketScanner } from "@/components/vendor/TicketScanner";
import { useTranslation } from "react-i18next";

export default function VendorCheckInPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("Ticket Check-In")}</h2>
          <p className="text-muted-foreground">
            {t("Validate and check in attendees at your events")}
          </p>
        </div>
      </div>
      <TicketScanner />
    </div>
  );
}
