# @kongpda/laravel-attachments-react

React and Inertia-friendly UI primitives for the Kongpda attachments ecosystem.

This package is the frontend companion to:

- `kongpda/laravel-attachments-core`
- `kongpda/laravel-attachments-livewire`

It provides:

- typed attachment contracts
- composable React primitives
- bundled shadcn-style source components for cards, buttons, badges, and dialogs
- upload, preview, caption, and delete workflow helpers

It does not implement backend storage, auth, or route logic. Those stay in the Laravel packages.

## Current UI scope

This package now ships a small internal component layer inspired by shadcn/ui patterns:

- `Button`
- `Card`
- `Badge`
- `Dialog`
- `AttachmentList`
- `AttachmentPreviewDialog`

These components expect the host app to provide compatible Tailwind design tokens such as:

- `bg-card`
- `text-card-foreground`
- `text-muted-foreground`
- `ring-ring`
- `bg-primary`

That keeps the package easy to theme inside a shadcn-style React or Inertia app without forcing backend Laravel dependencies into the frontend package.

## Recommended integration

Use this package as:

- typed attachment resource contracts
- shadcn-style attachment list and preview helpers
- a foundation for richer host-app upload, caption, reorder, and delete workflows

## Example

```tsx
import {
  AttachmentList,
  AttachmentPreviewDialog,
  useAttachmentPreview,
  type AttachmentResource,
} from '@kongpda/laravel-attachments-react';

type AttachmentsPanelProps = {
  attachments: AttachmentResource[];
};

export function AttachmentsPanel({ attachments }: AttachmentsPanelProps) {
  const { previewing, openPreview, closePreview } = useAttachmentPreview();

  return (
    <>
      <AttachmentList attachments={attachments} onPreview={openPreview} />
      <AttachmentPreviewDialog
        attachment={previewing}
        open={previewing !== null}
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
      />
    </>
  );
}
```

## Local development

```bash
bun install
bun run check
bun run build
```
