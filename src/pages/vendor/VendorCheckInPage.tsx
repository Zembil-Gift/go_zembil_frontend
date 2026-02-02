import { TicketScanner } from "@/components/vendor/TicketScanner";

export default function VendorCheckInPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Ticket Check-In</h2>
          <p className="text-muted-foreground">
            Validate and check in attendees at your events
          </p>
        </div>
      </div>
      <TicketScanner />
    </div>
  );
}
