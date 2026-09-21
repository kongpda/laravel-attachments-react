import { type DragEvent, type ReactNode, useRef, useState } from 'react';
import { cn } from '../utils';

export type FileDropzoneProps = {
  /** `accept` attribute value, e.g. "image/jpeg,image/png,image/webp". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  onFiles: (files: File[]) => void;
};

/**
 * A drop target that is also a real button, so it works from the keyboard and
 * on touch devices, where there is nothing to drag. `accept` only filters the
 * picker; the server still has to validate what arrives.
 */
export function FileDropzone({
  accept,
  multiple = true,
  disabled = false,
  title = 'Drop files here or click to browse',
  hint,
  icon,
  className,
  onFiles,
}: FileDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsOver(false);

    if (disabled) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          isOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/50',
          className,
        )}
      >
        {icon ?? <UploadIcon />}
        <span className="font-medium">{title}</span>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          // Picking the same file again must fire `change` again.
          event.target.value = '';
        }}
      />
    </>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 text-muted-foreground"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
