# @kongpda/laravel-attachments-react

React and Inertia-friendly UI primitives for the Kongpda attachments ecosystem.

This package is the frontend companion to:

- `kongpda/laravel-attachments-core`
- `kongpda/laravel-attachments-livewire`

It provides:

- typed attachment contracts
- composable React primitives
- semantic class-token defaults that fit shadcn-style design systems
- upload, preview, caption, and delete workflow helpers

It does not implement backend storage, auth, or route logic. Those stay in the Laravel packages.

## Current UI scope

This package does **not** bundle shadcn/ui components yet.

Today it ships lightweight React primitives with semantic class names such as:

- `bg-card`
- `text-card-foreground`
- `text-muted-foreground`
- `text-destructive`

That makes it easy to drop into an app that already uses shadcn-style tokens, but it is not the same as shipping real shadcn/ui source components.

## Recommended integration

Use this package as:

- typed attachment resource contracts
- lightweight list/preview helpers
- a foundation for a host app's own shadcn-composed attachment UI

If we want first-class shadcn support later, the next step should be adding explicit adapter components built from real shadcn/ui building blocks rather than only relying on shared class tokens.

## Local development

```bash
bun install
bun run check
bun run build
```
