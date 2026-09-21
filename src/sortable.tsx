/**
 * The drag-to-reorder grid, published as its own entry point
 * (`@kongpda/laravel-attachments-react/sortable`) so that only hosts that use
 * it need `@dnd-kit` installed.
 */
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { cn } from './utils';

export type SortableMediaGridProps<T extends { id: string }> = {
  /** Stable across server and client renders, which dnd-kit's own id is not. */
  dndId: string;
  items: T[];
  /** The tiles on screen, when a filter hides some of `items`. */
  visible?: T[];
  /** Receives the complete new order; persist it and roll back on failure. */
  onReorder: (next: T[]) => void;
  className?: string;
  children: ReactNode;
};

/**
 * Owns the pointer and keyboard sensors; what a tile shows and what a new
 * order does are the caller's. Tiles are reordered with a drag handle, or from
 * the keyboard with Space and the arrow keys.
 */
export function SortableMediaGrid<T extends { id: string }>({
  dndId,
  items,
  visible = items,
  onReorder,
  className,
  children,
}: SortableMediaGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    onReorder(
      arrayMove(
        items,
        items.findIndex((item) => item.id === active.id),
        items.findIndex((item) => item.id === over.id),
      ),
    );
  };

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visible.map((item) => item.id)} strategy={rectSortingStrategy}>
        <ul className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4', className)}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

export type SortableMediaTileProps = {
  id: string;
  /** Names the tile in the reorder handle's label. */
  name: string;
  canReorder: boolean;
  className?: string;
  media: ReactNode;
  children?: ReactNode;
};

/** One tile: the 16:9 frame with its reorder handle, and the caller's controls underneath. */
export function SortableMediaTile({ id, name, canReorder, className, media, children }: SortableMediaTileProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !canReorder,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-background',
        isDragging && 'relative z-10 opacity-80 shadow-lg',
        className,
      )}
    >
      <div className="relative aspect-video bg-muted">
        {media}
        {canReorder && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Reorder ${name}`}
            className="absolute left-1.5 top-1.5 cursor-grab touch-none rounded-md bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
              <circle cx="9" cy="5" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="9" cy="19" r="1.5" />
              <circle cx="15" cy="5" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="15" cy="19" r="1.5" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </li>
  );
}
