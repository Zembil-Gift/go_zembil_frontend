import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Clock, ArrowDownLeft, ArrowUpRight, Gift, RotateCcw, Ban, Settings2, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import {
  walletService,
  minorToMajor,
  type WalletTransaction,
  type WalletTransactionType,
} from "@/services/walletService";
import { cashbackService } from "@/services/cashbackService";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;

const TYPE_META: Record<
  WalletTransactionType,
  { label: string; icon: typeof Gift; description: string }
> = {
  GRANT: { label: "Credits earned", icon: Gift, description: "Reward credits added to your wallet" },
  SPEND: { label: "Spent on order", icon: ArrowUpRight, description: "Credits applied at checkout" },
  REFUND: { label: "Credits returned", icon: RotateCcw, description: "Returned from a refunded or cancelled order" },
  EXPIRY: { label: "Credits expired", icon: Ban, description: "Unspent credits that reached their expiry date" },
  ADMIN_ADJUST: { label: "Adjustment", icon: Settings2, description: "Manual correction by support" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TransactionRow({
  transaction,
  currencyCode,
}: {
  transaction: WalletTransaction;
  currencyCode: string;
}) {
  const { t } = useTranslation();
  const meta = TYPE_META[transaction.type] ?? {
    label: transaction.type,
    icon: Wallet,
    description: "",
  };
  const Icon = meta.icon;
  const isCredit = transaction.amountMinor > 0;

  return (
    <li className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isCredit ? "bg-viridian-green/10 text-viridian-green" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-eagle-green">{meta.label}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(transaction.createdAt)}
          {transaction.orderId ? ` · Order #${transaction.orderId}` : ""}
        </p>
        {transaction.note && (
          <p className="mt-0.5 text-xs text-muted-foreground break-words">{transaction.note}</p>
        )}
        {transaction.expiresAt && transaction.remainingMinor
          ? (
            <p className="mt-0.5 text-xs text-amber-600">
              {formatCurrency(minorToMajor(transaction.remainingMinor), currencyCode)} {t("left, expires")} {formatDate(transaction.expiresAt)}
            </p>
          )
          : null}
      </div>

      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          isCredit ? "text-viridian-green" : "text-eagle-green"
        }`}
      >
        {isCredit ? "+" : "−"}
        {formatCurrency(minorToMajor(Math.abs(transaction.amountMinor)), currencyCode)}
      </span>
    </li>
  );
}

export default function WalletMenu({ variant = "icon" }: { variant?: "icon" | "mobile" }) {
  const { t } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: () => walletService.getBalance(),
    staleTime: 60_000,
  });

  // Only fetch history once the dialog is actually opened.
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["wallet", "transactions", page],
    queryFn: () => walletService.getTransactions(page, PAGE_SIZE),
    enabled: historyOpen,
  });

  // Cashback promised on orders not yet delivered — visible, but not spendable.
  const { data: pending } = useQuery({
    queryKey: ["cashback", "pending"],
    queryFn: () => cashbackService.getPending(),
    staleTime: 60_000,
  });

  // Amounts arrive already converted to the caller's currency; USD is the
  // stored default, used only until the balance/pending currency is known.
  const currencyCode = balance?.currencyCode ?? pending?.currencyCode ?? "USD";
  const balanceLabel = formatCurrency(minorToMajor(balance?.balanceMinor), currencyCode);
  const hasCredits = (balance?.balanceMinor ?? 0) > 0;
  const pendingMinor = pending?.pendingMinor ?? 0;
  const pendingLabel = formatCurrency(minorToMajor(pendingMinor), currencyCode);

  return (
    <Dialog
      open={historyOpen}
      onOpenChange={(open) => {
        setHistoryOpen(open);
        if (!open) setPage(0);
      }}
    >
      {/* Touch devices have no hover, so the mobile menu shows the balance inline. */}
      {variant === "mobile" ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start h-9">
            <Wallet className="mr-2 h-4 w-4" />
            {t("Reward credits")}
            <span className="ml-auto text-xs font-semibold text-viridian-green tabular-nums">
              {balanceLoading ? "…" : balanceLabel}
            </span>
          </Button>
        </DialogTrigger>
      ) : (
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative text-eagle-green hover:text-viridian-green p-2"
              >
                <Wallet className="h-5 w-5" />
                {hasCredits && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-viridian-green"
                    aria-hidden="true"
                  />
                )}
                <span className="sr-only">
                  {t("Reward wallet")}{hasCredits ? `, balance ${balanceLabel}` : ""}
                </span>
              </Button>
            </DialogTrigger>
          </HoverCardTrigger>

          <HoverCardContent align="end" className="w-72">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Reward credits")}
            </p>

            {balanceLoading ? (
              <Skeleton className="mt-2 h-7 w-28" />
            ) : (
              <p className="mt-1 text-2xl font-semibold text-eagle-green">{balanceLabel}</p>
            )}

            {pendingMinor > 0 ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium text-eagle-green">{pendingLabel}</span> {t("on the way — cashback lands here once your order is delivered.")}
                </span>
              </p>
            ) : null}

            {balance?.nextExpiryAt && balance.expiringSoonMinor ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {formatCurrency(minorToMajor(balance.expiringSoonMinor), currencyCode)} {t("expires on")}{" "}
                  {formatDate(balance.nextExpiryAt)}
                </span>
              </p>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              {hasCredits
                ? "Applied automatically at checkout, up to the limit for each order."
                : "Earn credits from rewards and refunds. They apply automatically at checkout."}
            </p>

            <p className="mt-2 text-xs font-medium text-viridian-green">
              {t("Click to view your credit history")}
            </p>
          </HoverCardContent>
        </HoverCard>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-viridian-green" />
            {t("Reward credits")}
          </DialogTitle>
          <DialogDescription>
            {t("Balance")} {balanceLabel}
            {pendingMinor > 0 ? ` · ${pendingLabel} pending delivery` : ""}
            {balance?.nextExpiryAt && balance.expiringSoonMinor
              ? ` · ${formatCurrency(
                  minorToMajor(balance.expiringSoonMinor),
                  currencyCode
                )} expires ${formatDate(balance.nextExpiryAt)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          {historyLoading ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : history && history.content.length > 0 ? (
            <ul>
              {history.content.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  currencyCode={currencyCode}
                />
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <ArrowDownLeft className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-eagle-green">{t("No credit activity yet")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Credits you earn, spend or get refunded will show up here.")}
              </p>
            </div>
          )}
        </ScrollArea>

        {history && history.totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={history.first || historyLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t("Previous")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("Page")} {history.number + 1} of {history.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={history.last || historyLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Next")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
