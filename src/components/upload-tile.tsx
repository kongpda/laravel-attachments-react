import type { QueuedUpload } from '../hooks/use-upload-queue';
import { cn } from '../utils';
import { Button } from './button';

export type UploadTileProps = {
  upload: QueuedUpload;
  onRetry: () => void;
  onRemove: () => void;
  className?: string;
};

/**
 * One file of an upload queue: its preview, progress, and the cancel, dismiss
 * and retry controls. Renders an `<li>`, so place it in a list.
 */
export function UploadTile({ upload, onRetry, onRemove, className }: UploadTileProps) {
  const isFailed = upload.status === 'failed';
  const percent = Math.round(upload.progress * 100);

  return (
    <li
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border bg-background',
        isFailed && 'border-destructive/60',
        className,
      )}
    >
      <div className="relative aspect-video bg-muted">
        {upload.previewUrl && <img src={upload.previewUrl} alt="" className="size-full object-cover opacity-50" />}
        {upload.status !== 'done' && (
          <button
            type="button"
            aria-label={`${isFailed ? 'Dismiss' : 'Cancel'} ${upload.file.name}`}
            className="absolute right-1.5 top-1.5 rounded-md bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onRemove}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {!isFailed && (
          <div
            role="progressbar"
            aria-label={`Uploading ${upload.file.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="absolute inset-x-0 bottom-0 h-1 bg-border"
          >
            <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2 text-sm">
        <p className="truncate">{upload.file.name}</p>
        {isFailed ? (
          <div className="flex items-start justify-between gap-2">
            <p role="alert" className="text-xs text-destructive">
              {upload.error}
            </p>
            {upload.canRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry} aria-label={`Retry ${upload.file.name}`}>
                Retry
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {upload.status === 'queued' ? 'Waiting…' : upload.status === 'done' ? 'Finishing…' : `${percent}%`}
          </p>
        )}
      </div>
    </li>
  );
}
