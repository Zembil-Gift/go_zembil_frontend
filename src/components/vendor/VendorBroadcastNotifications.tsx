import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  BroadcastMessageResponse,
  broadcastService,
} from "@/services/broadcastService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const getSeenStorageKey = (userId?: string | number) =>
  `vendor-broadcast-seen:${String(userId ?? "anonymous")}`;

const parseStoredIds = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => Number.isFinite(Number(value))).map(Number);
  } catch {
    return [];
  }
};

const formatDate = (iso: string | null) => {
  if (!iso) return "No end date";
  return new Date(iso).toLocaleString();
};

const formatAudience = (message: BroadcastMessageResponse) => {
  if (!message.vendorTypes || message.vendorTypes.length === 0) {
    return message.targetRole;
  }
  return `${message.targetRole} (${message.vendorTypes.join(", ")})`;
};

interface VendorBroadcastNotificationsProps {
  className?: string;
}

export default function VendorBroadcastNotifications({
  className,
}: VendorBroadcastNotificationsProps) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<number[]>([]);

  const storageKey = getSeenStorageKey(user?.id);

  useEffect(() => {
    setSeenIds(parseStoredIds(localStorage.getItem(storageKey)));
  }, [storageKey]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["broadcasts", "me", "active"],
    queryFn: () => broadcastService.getMyActiveBroadcasts(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const messages = useMemo(
    () =>
      (data || []).slice().sort((a, b) => {
        return (
          new Date(b.effectiveFrom).getTime() -
          new Date(a.effectiveFrom).getTime()
        );
      }),
    [data]
  );

  const unseenCount = useMemo(() => {
    const seenSet = new Set(seenIds);
    return messages.filter((message) => !seenSet.has(message.id)).length;
  }, [messages, seenIds]);

  const markAllSeen = () => {
    if (messages.length === 0) return;
    const ids = messages.map((message) => message.id);
    setSeenIds(ids);
    localStorage.setItem(storageKey, JSON.stringify(ids));
  };

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      markAllSeen();
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open broadcast notifications"
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unseenCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px] bg-red-500 text-white">
                {unseenCount > 99 ? "99+" : unseenCount}
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Broadcasts</h4>
          {(isLoading || isFetching) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Separator />

        <ScrollArea className="max-h-[380px]">
          {messages.length === 0 && !isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No active broadcast messages.
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => (
                <div key={message.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Megaphone className="h-4 w-4 mt-0.5 text-eagle-green" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {message.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        {message.message}
                      </p>
                      {/* <p className="mt-2 text-[11px] text-muted-foreground">
                        From: {formatDate(message.effectiveFrom)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        To: {formatDate(message.effectiveTo)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Audience: {formatAudience(message)}
                      </p> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
