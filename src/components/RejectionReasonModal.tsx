import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

const DEFAULT_TITLE = 'Rejection Reason';

interface RejectionReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  title?: string;
}

export function RejectionReasonModal({
  open,
  onOpenChange,
  reason,
  title = DEFAULT_TITLE,
}: RejectionReasonModalProps) {
  if (!reason?.trim()) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Full reason provided for this rejection.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          <p className="text-sm text-red-800 whitespace-pre-wrap break-words bg-red-50 border border-red-200 rounded-lg p-4">
            {reason}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Character length after which we suggest viewing in modal (e.g. in cards). */
export const REJECTION_REASON_TRUNCATE_LENGTH = 80;

/** Renders truncated reason and a "View reason" button that opens the modal. */
export function RejectionReasonWithModal({
  reason,
  title,
  className = '',
  truncateLength = REJECTION_REASON_TRUNCATE_LENGTH,
}: {
  reason: string;
  title?: string;
  className?: string;
  truncateLength?: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  if (!reason?.trim()) return null;
  const truncated =
    reason.length > truncateLength
      ? `${reason.slice(0, truncateLength).trim()}…`
      : reason;

  return (
    <>
      <div className={className}>
        <p className="text-xs text-red-600">
          {truncated}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ml-1 text-red-700 underline hover:no-underline font-medium"
          >
            View reason
          </button>
        </p>
      </div>
      <RejectionReasonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reason={reason}
        title={title}
      />
    </>
  );
}
