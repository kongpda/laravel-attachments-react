import { type ReactNode, useState } from 'react';
import type { AttachmentActionHandlers, AttachmentResource } from '../types';
import { cn } from '../utils';
import { Badge } from './badge';
import { Button, buttonVariants } from './button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';

type AttachmentListProps = {
  attachments: AttachmentResource[];
  className?: string;
  emptyState?: ReactNode;
} & AttachmentActionHandlers;

export function AttachmentList({
  attachments,
  className,
  emptyState,
  onPreview,
  onDelete,
  onCaptionSave,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No attachments available yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>
      {attachments.map((attachment) => (
        <AttachmentCard
          // A caption saved elsewhere remounts the card, so the draft never
          // shows a stale value.
          key={`${attachment.id}:${attachment.caption ?? ''}`}
          attachment={attachment}
          onPreview={onPreview}
          onDelete={onDelete}
          onCaptionSave={onCaptionSave}
        />
      ))}
    </div>
  );
}

type AttachmentCardProps = {
  attachment: AttachmentResource;
} & AttachmentActionHandlers;

function AttachmentCard({ attachment, onPreview, onDelete, onCaptionSave }: AttachmentCardProps) {
  const [draft, setDraft] = useState<string>(attachment.caption ?? '');
  // The thumbnail is a few kilobytes; the original can be megabytes. Fall back
  // to the original only while an image's thumbnail is still being generated.
  const previewImageUrl = attachment.thumbnail_url ?? (attachment.is_image ? attachment.url : null);

  const commitCaption = () => {
    if (!onCaptionSave) {
      return;
    }

    const next = draft.trim() === '' ? null : draft.trim();

    if (next !== (attachment.caption ?? null)) {
      onCaptionSave(attachment, next);
    }
  };

  return (
    <Card className="overflow-hidden">
      {previewImageUrl ? (
        <button
          type="button"
          className="flex h-36 w-full items-center justify-center overflow-hidden border-b bg-muted/40"
          onClick={() => onPreview?.(attachment)}
          disabled={!attachment.is_previewable || !onPreview}
          aria-label={`Preview ${attachment.file_name}`}
        >
          <img
            src={previewImageUrl}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </button>
      ) : null}
      <CardHeader className="space-y-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-sm">{attachment.file_name}</CardTitle>
            <p className="text-xs text-muted-foreground">{attachment.file_type ?? 'file'}</p>
          </div>
          {attachment.is_default ? <Badge variant="secondary">Default</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {onCaptionSave ? (
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitCaption}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            placeholder="Add a caption"
            aria-label={`Caption for ${attachment.file_name}`}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : attachment.caption ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{attachment.caption}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {attachment.group ? <Badge variant="outline">{attachment.group}</Badge> : null}
          {attachment.is_image ? <Badge variant="secondary">Image</Badge> : null}
          {attachment.is_previewable ? <Badge variant="outline">Previewable</Badge> : null}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 p-4 pt-0">
        {attachment.is_previewable && onPreview ? (
          <Button variant="outline" size="sm" onClick={() => onPreview(attachment)}>
            Preview
          </Button>
        ) : null}
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Open
        </a>
        {onDelete ? (
          <Button variant="destructive" size="sm" onClick={() => onDelete(attachment)}>
            Delete
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
