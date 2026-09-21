import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FileDropzone } from '../src/components/file-dropzone';
import { UploadTile } from '../src/components/upload-tile';
import { type QueuedUpload, type Uploader, useUploadQueue } from '../src/hooks/use-upload-queue';
import { UploadError } from '../src/lib/xhr-upload';

afterEach(cleanup);

beforeAll(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

function file(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['x'], name, { type });
}

/** An uploader whose calls stay pending until the test settles them. */
function controllableUploader() {
  const calls: { file: File; resolve: () => void; reject: (error: unknown) => void; signal: AbortSignal }[] = [];
  const upload: Uploader = (file, { signal }) =>
    new Promise<void>((resolve, reject) => {
      calls.push({ file, resolve, reject, signal });
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });

  return { upload, calls };
}

const flush = () => act(async () => {});

describe('useUploadQueue', () => {
  it('never runs more uploads at once than the concurrency allows', async () => {
    const { upload, calls } = controllableUploader();
    const { result } = renderHook(() => useUploadQueue({ upload, concurrency: 2 }));

    act(() => result.current.add([file('a.jpg'), file('b.jpg'), file('c.jpg')]));
    await flush();

    expect(calls.map((call) => call.file.name)).toEqual(['a.jpg', 'b.jpg']);

    await act(async () => calls[0].resolve());
    await flush();

    expect(calls.map((call) => call.file.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('reports drained once, after every file settles, only when one succeeded', async () => {
    const { upload, calls } = controllableUploader();
    const onDrained = vi.fn();
    const { result } = renderHook(() => useUploadQueue({ upload, onDrained }));

    act(() => result.current.add([file('a.jpg'), file('b.jpg')]));
    await flush();
    await act(async () => calls[0].resolve());

    expect(onDrained).not.toHaveBeenCalled();

    await act(async () => calls[1].reject(new UploadError('Server error', 500)));

    expect(onDrained).toHaveBeenCalledTimes(1);
  });

  it('does not report drained when every file failed', async () => {
    const { upload, calls } = controllableUploader();
    const onDrained = vi.fn();
    const { result } = renderHook(() => useUploadQueue({ upload, onDrained }));

    act(() => result.current.add([file()]));
    await flush();
    await act(async () => calls[0].reject(new UploadError('The connection dropped. Retry?', 0)));

    expect(onDrained).not.toHaveBeenCalled();
    expect(result.current.items[0]).toMatchObject({ status: 'failed', error: 'The connection dropped. Retry?' });
  });

  it.each([
    [0, true],
    [500, true],
    [429, true],
    [413, false],
    [422, false],
  ])('offers a retry after a %i only when retrying could help', async (status, canRetry) => {
    const { upload, calls } = controllableUploader();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => result.current.add([file()]));
    await flush();
    await act(async () => calls[0].reject(new UploadError('Nope', status)));

    expect(result.current.items[0].canRetry).toBe(canRetry);
  });

  it('sends the same file again on retry', async () => {
    const { upload, calls } = controllableUploader();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => result.current.add([file('a.jpg')]));
    await flush();
    await act(async () => calls[0].reject(new UploadError('Server error', 500)));

    act(() => result.current.retry(result.current.items[0].id));
    await flush();

    expect(calls).toHaveLength(2);
    expect(calls[1].file.name).toBe('a.jpg');
    expect(result.current.items[0]).toMatchObject({ status: 'uploading', error: undefined });
  });

  it('aborts a cancelled upload and forgets it without marking it failed', async () => {
    const { upload, calls } = controllableUploader();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => result.current.add([file()]));
    await flush();

    act(() => result.current.remove(result.current.items[0].id));
    await flush();

    expect(calls[0].signal.aborted).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('cancels uploads still in flight when the host unmounts', async () => {
    const { upload, calls } = controllableUploader();
    const { result, unmount } = renderHook(() => useUploadQueue({ upload }));

    act(() => result.current.add([file()]));
    await flush();
    unmount();

    expect(calls[0].signal.aborted).toBe(true);
  });

  it('clears finished tiles but keeps failed ones', async () => {
    const { upload, calls } = controllableUploader();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => result.current.add([file('a.jpg'), file('b.jpg')]));
    await flush();
    await act(async () => calls[0].resolve());
    await act(async () => calls[1].reject(new UploadError('Server error', 500)));

    act(() => result.current.clearDone());

    expect(result.current.items.map((item) => item.file.name)).toEqual(['b.jpg']);
  });

  it('only previews images', () => {
    const { upload } = controllableUploader();
    const { result } = renderHook(() => useUploadQueue({ upload }));

    act(() => result.current.add([file('a.jpg'), file('b.pdf', 'application/pdf')]));

    expect(result.current.items.map((item) => item.previewUrl)).toEqual(['blob:preview', null]);
  });
});

describe('FileDropzone', () => {
  it('hands picked files to the host from the keyboard-reachable button', async () => {
    const onFiles = vi.fn();
    const { container } = render(<FileDropzone title="Add photos" onFiles={onFiles} />);

    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, [file('a.jpg')]);

    expect(screen.getByRole('button', { name: /add photos/i })).toBeTruthy();
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.jpg' })]);
  });

  it('keeps only the first dropped file when it takes one', () => {
    const onFiles = vi.fn();
    render(<FileDropzone title="Add photo" multiple={false} onFiles={onFiles} />);

    fireEvent.drop(screen.getByRole('button'), { dataTransfer: { files: [file('a.jpg'), file('b.jpg')] } });

    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.jpg' })]);
  });

  it('ignores drops while disabled', () => {
    const onFiles = vi.fn();
    render(<FileDropzone title="Add photos" disabled onFiles={onFiles} />);

    fireEvent.drop(screen.getByRole('button'), { dataTransfer: { files: [file()] } });

    expect(onFiles).not.toHaveBeenCalled();
  });
});

describe('UploadTile', () => {
  function upload(overrides: Partial<QueuedUpload> = {}): QueuedUpload {
    return { id: '1', file: file('a.jpg'), previewUrl: null, progress: 0.4, status: 'uploading', canRetry: true, ...overrides };
  }

  function renderTile(queued: QueuedUpload) {
    const handlers = { onRetry: vi.fn(), onRemove: vi.fn() };
    render(
      <ul>
        <UploadTile upload={queued} {...handlers} />
      </ul>,
    );

    return handlers;
  }

  it('reports progress to assistive technology', () => {
    renderTile(upload());

    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
  });

  it('announces the error and retries a failure that can be retried', async () => {
    const { onRetry } = renderTile(upload({ status: 'failed', error: 'The connection dropped. Retry?' }));

    expect(screen.getByRole('alert').textContent).toBe('The connection dropped. Retry?');

    await userEvent.click(screen.getByRole('button', { name: 'Retry a.jpg' }));

    expect(onRetry).toHaveBeenCalled();
  });

  it('offers only dismissal for a file the server refused', async () => {
    const { onRemove } = renderTile(upload({ status: 'failed', error: 'Too large', canRetry: false }));

    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss a.jpg' }));

    expect(onRemove).toHaveBeenCalled();
  });
});
