import type { AttachmentActionHandlers, AttachmentResource } from '../types';

type AttachmentListProps = {
  attachments: AttachmentResource[];
} & AttachmentActionHandlers;

export function AttachmentList({
  attachments,
  onPreview,
  onDelete,
}: AttachmentListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {attachments.map((attachment) => (
        <article
          key={attachment.id}
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">{attachment.file_type ?? 'file'}</p>
            </div>
            <div className="flex items-center gap-2">
              {attachment.is_previewable && onPreview ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onPreview(attachment)}
                >
                  Preview
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="text-xs text-destructive hover:opacity-80"
                  onClick={() => onDelete(attachment)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
