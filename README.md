# @kongpda/laravel-attachments-react

React components and hooks for
[`kongpda/laravel-attachments-core`](https://github.com/kongpda/laravel-attachments-core):
an attachment list, a preview dialog, a drag-and-drop uploader with a
progress queue, and an optional sortable grid. Works in Inertia apps or any
React 18/19 app.

The package owns no endpoints. Your app supplies the upload, caption, delete
and reorder requests, so it keeps control of routes and authorisation.

## Installation

```bash
npm install @kongpda/laravel-attachments-react
```

The components are styled with Tailwind classes and shadcn/ui tokens
(`bg-card`, `text-muted-foreground`, `ring-ring`, `bg-primary`, …). Tailwind
v4 does not scan `node_modules`, so point it at the package:

```css
/* resources/css/app.css */
@source '../../node_modules/@kongpda/laravel-attachments-react/dist';
```

The sortable grid is a separate entry point with optional peer dependencies.
Install them only if you use it:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Listing and previewing

Pass arrays shaped like the core package's `AttachmentResource`:

```tsx
import {
  AttachmentList,
  AttachmentPreviewDialog,
  useAttachmentPreview,
  type AttachmentResource,
} from '@kongpda/laravel-attachments-react';

export function Attachments({ attachments }: { attachments: AttachmentResource[] }) {
  const { previewing, openPreview, closePreview } = useAttachmentPreview();

  return (
    <>
      <AttachmentList
        attachments={attachments}
        onPreview={openPreview}
        onCaptionSave={(attachment, caption) => {/* PATCH it */}}
        onDelete={(attachment) => {/* DELETE it */}}
      />
      <AttachmentPreviewDialog
        attachment={previewing}
        open={previewing !== null}
        onOpenChange={(open) => !open && closePreview()}
      />
    </>
  );
}
```

An action is shown only when you pass its handler.

## Uploading

`useUploadQueue` sends a batch a few files at a time (three by default). Each
file gets its own progress, error and retry. `xhrUpload` posts one file with
progress, sending Laravel's `X-XSRF-TOKEN`. It rejects with an `UploadError`
that carries the first validation message and the HTTP status.

```tsx
import { router } from '@inertiajs/react';
import { FileDropzone, UploadTile, useUploadQueue, xhrUpload } from '@kongpda/laravel-attachments-react';

export function Uploader({ invoiceId }: { invoiceId: number }) {
  const queue = useUploadQueue({
    upload: (file, { onProgress, signal }) => {
      const body = new FormData();
      body.append('file', file);

      return xhrUpload(`/invoices/${invoiceId}/attachments`, body, { onProgress, signal });
    },
    onDrained: () => router.reload({ only: ['attachments'], onFinish: queue.clearDone }),
  });

  return (
    <>
      <FileDropzone
        accept="image/jpeg,image/png,image/webp,application/pdf"
        hint="JPEG, PNG, WebP or PDF, up to 10 MB"
        onFiles={queue.add}
      />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {queue.items.map((item) => (
          <UploadTile
            key={item.id}
            upload={item}
            onRetry={() => queue.retry(item.id)}
            onRemove={() => queue.remove(item.id)}
          />
        ))}
      </ul>
    </>
  );
}
```

- A failure with status 413, 415 or 422 is final, because the server refused
  the file itself, so its tile offers only Dismiss.
- Network errors, 429s and 5xx errors can be retried.
- Unmounting the queue cancels uploads in flight. With Inertia, call the hook
  above any `<Deferred>` boundary that the reload refreshes.
- For direct-to-storage uploads, `xhrPut(signedUrl, file, signedHeaders)`
  sends a file to a presigned S3 or R2 URL with only the signed headers.

## Reordering

```tsx
import { SortableMediaGrid, SortableMediaTile } from '@kongpda/laravel-attachments-react/sortable';

<SortableMediaGrid dndId="invoice-attachments" items={attachments} onReorder={saveOrder}>
  {attachments.map((attachment) => (
    <SortableMediaTile
      key={attachment.id}
      id={attachment.id}
      name={attachment.file_name}
      canReorder
      media={<img src={attachment.thumbnail_url ?? attachment.url} alt="" className="size-full object-cover" />}
    />
  ))}
</SortableMediaGrid>
```

`onReorder` receives the complete new order. Persist it, and roll back if
the request fails. Tiles can be moved with the pointer, or from the keyboard
with Space and the arrow keys on the handle.

## Development

```bash
bun install
bun run check
bun run test
bun run build
```

## License

MIT. See [LICENSE.md](LICENSE.md).
