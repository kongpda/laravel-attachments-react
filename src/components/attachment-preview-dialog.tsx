import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import type { AttachmentResource } from '../types';

type AttachmentPreviewDialogProps = {
  attachment: AttachmentResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AttachmentPreviewDialog({
  attachment,
  open,
  onOpenChange,
}: AttachmentPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{attachment?.file_name ?? 'Attachment preview'}</DialogTitle>
          <DialogDescription>
            {attachment?.caption ?? attachment?.file_type ?? 'Preview the selected attachment.'}
          </DialogDescription>
        </DialogHeader>

        {attachment ? (
          attachment.is_image && attachment.url ? (
            <img
              src={attachment.url}
              alt={attachment.file_name}
              className="max-h-[70vh] w-full rounded-lg border object-contain"
            />
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">{attachment.file_name}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This file type does not support inline preview in the bundled dialog.
              </p>
            </div>
          )
        ) : null}

        <DialogFooter>
          {attachment ? (
            <a href={attachment.url} target="_blank" rel="noreferrer">
              <Button variant="outline">Open file</Button>
            </a>
          ) : null}
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
