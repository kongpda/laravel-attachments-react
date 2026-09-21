import { useEffect, useRef, useState } from 'react';
import { isAbortError, UploadError } from '../lib/xhr-upload';

export type QueuedUpload = {
  id: string;
  file: File;
  previewUrl: string | null;
  /** 0–1 */
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'failed';
  error?: string;
  /** False when the server refused the file itself, so a retry cannot help. */
  canRetry: boolean;
};

export type Uploader = (
  file: File,
  options: { onProgress: (fraction: number) => void; signal: AbortSignal },
) => Promise<unknown>;

export type UseUploadQueueOptions = {
  /** Sends one file. Reject with an `UploadError` to report its status. */
  upload: Uploader;
  /** Every file has settled and at least one went through. */
  onDrained?: () => void;
  /** How many files upload at once. Defaults to 3. */
  concurrency?: number;
};

/** Statuses that mean the file itself was refused, not the attempt. */
const PERMANENT_FAILURES = [413, 415, 422];

let fallbackId = 0;

function uploadId(): string {
  // `crypto.randomUUID` only exists in secure contexts, and a plain-HTTP
  // staging host is not one.
  return globalThis.crypto?.randomUUID?.() ?? `upload-${Date.now()}-${++fallbackId}`;
}

/**
 * Uploads a batch a few files at a time, each with its own progress, error and
 * retry. Mount it above anything that reloads when the batch drains (an
 * Inertia `<Deferred>` boundary, for one), or the reload unmounts it mid-upload.
 */
export function useUploadQueue({ upload, onDrained, concurrency = 3 }: UseUploadQueueOptions) {
  const [items, setItems] = useState<QueuedUpload[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const previews = useRef(new Set<string>());

  // Leaving the page cancels what is in flight and frees every preview.
  useEffect(() => {
    const inFlight = controllers.current;
    const previewUrls = previews.current;

    return () => {
      inFlight.forEach((controller) => controller.abort());
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const patch = (id: string, changes: Partial<QueuedUpload>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const release = (item: QueuedUpload) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
      previews.current.delete(item.previewUrl);
    }
  };

  const start = (item: QueuedUpload) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);

    upload(item.file, {
      signal: controller.signal,
      onProgress: (progress) => patch(item.id, { progress }),
    })
      .then(() => patch(item.id, { status: 'done', progress: 1 }))
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return; // cancelled — the tile is already gone
        }

        const status = error instanceof UploadError ? error.status : 0;

        patch(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'The upload failed.',
          canRetry: !PERMANENT_FAILURES.includes(status),
        });
      })
      .finally(() => controllers.current.delete(item.id));
  };

  useEffect(() => {
    const active = items.filter((item) => item.status === 'uploading').length;
    const next = items
      .filter((item) => item.status === 'queued' && !controllers.current.has(item.id))
      .slice(0, Math.max(0, concurrency - active));

    if (next.length > 0) {
      next.forEach(start);
      setItems((current) =>
        current.map((item) => (next.some((started) => started.id === item.id) ? { ...item, status: 'uploading' } : item)),
      );

      return;
    }

    const isBusy = items.some((item) => item.status === 'queued' || item.status === 'uploading');

    if (!isBusy && items.some((item) => item.status === 'done')) {
      onDrained?.();
    }
    // The queue is driven by `items` alone; `start` and `onDrained` are
    // recreated every render and must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return {
    items,
    isUploading: items.some((item) => item.status === 'queued' || item.status === 'uploading'),
    add: (files: File[]) =>
      setItems((current) => [
        ...current,
        ...files.map((file): QueuedUpload => {
          const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

          if (previewUrl) {
            previews.current.add(previewUrl);
          }

          return { id: uploadId(), file, previewUrl, progress: 0, status: 'queued', canRetry: true };
        }),
      ]),
    retry: (id: string) => patch(id, { status: 'queued', progress: 0, error: undefined }),
    /** Cancel an upload in flight, or dismiss one that failed. */
    remove: (id: string) => {
      controllers.current.get(id)?.abort();
      setItems((current) =>
        current.filter((item) => {
          if (item.id === id) {
            release(item);
          }

          return item.id !== id;
        }),
      );
    },
    /** Drop finished tiles once the host shows the saved attachments. */
    clearDone: () =>
      setItems((current) =>
        current.filter((item) => {
          if (item.status === 'done') {
            release(item);
          }

          return item.status !== 'done';
        }),
      ),
  };
}

export type UploadQueue = ReturnType<typeof useUploadQueue>;
