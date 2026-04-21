"use client";

import dynamic from "next/dynamic";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const NodeDetailsContent = dynamic(
  () => import("./NodeDetailsContent").then((mod) => mod.NodeDetailsContent),
  {
    ssr: false,
  },
);

interface NodeDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uuid: string | null;
}

export function NodeDetailsPanel({
  open,
  onOpenChange,
  uuid,
}: NodeDetailsPanelProps) {
  const isMobile = useIsMobile();

  if (!uuid) {
    return null;
  }

  const content = (
    <div className="max-h-[85vh] overflow-y-auto">
      {open ? <NodeDetailsContent uuid={uuid} /> : null}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">Node details</DrawerTitle>
          <DrawerDescription className="sr-only">
            View node details without leaving the dashboard.
          </DrawerDescription>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden border-none p-0 shadow-2xl">
        <DialogTitle className="sr-only">Node details</DialogTitle>
        <DialogDescription className="sr-only">
          View node details without leaving the dashboard.
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
