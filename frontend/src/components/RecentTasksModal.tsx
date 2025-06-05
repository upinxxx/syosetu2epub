import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RecentTasksList from "@/components/RecentTasksList";
import { History } from "lucide-react";

interface RecentTasksModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToKindle?: (jobId: string) => void;
}

export default function RecentTasksModal({
  isOpen,
  onOpenChange,
  onSendToKindle,
}: RecentTasksModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className=" max-w-2xl w-[95vw] h-[90vh] max-h-[1000px] overflow-hidden flex flex-col p-0 sm:max-w-[1000px]">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5 text-sky-600" />
            <span>最近的任務</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <RecentTasksList onSendToKindle={onSendToKindle} showCard={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
