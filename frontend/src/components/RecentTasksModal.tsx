import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RecentTasksList from "@/components/RecentTasksList";
import { FileText } from "lucide-react";

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
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>我的轉換紀錄</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <RecentTasksList onSendToKindle={onSendToKindle} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
