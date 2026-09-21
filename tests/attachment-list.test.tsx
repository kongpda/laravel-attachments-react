import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttachmentList } from '../src/components/attachment-list';
import type { AttachmentResource } from '../src/types';

afterEach(cleanup);

function attachment(overrides: Partial<AttachmentResource> = {}): AttachmentResource {
  return {
    id: '01A',
    file_name: 'report.pdf',
    file_size: 1024,
    file_type: 'application/pdf',
    caption: null,
    group: null,
    is_default: false,
    url: 'https://example.test/attachments/01A/download',
    thumbnail_url: null,
    is_previewable: true,
    is_image: false,
    created_at: null,
    ...overrides,
  };
}

describe('AttachmentList', () => {
  it('shows the empty state when there is nothing to list', () => {
    render(<AttachmentList attachments={[]} />);

    expect(screen.getByText('No attachments available yet.')).toBeTruthy();
  });

  it('loads the thumbnail rather than the full image in the grid', () => {
    const { container } = render(
      <AttachmentList
        attachments={[
          attachment({
            is_image: true,
            file_type: 'image/png',
            url: 'https://example.test/full.png',
            thumbnail_url: 'https://example.test/thumb.jpg',
          }),
        ]}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/thumb.jpg');
  });

  it('falls back to the original image while its thumbnail is being generated', () => {
    const { container } = render(
      <AttachmentList attachments={[attachment({ is_image: true, url: 'https://example.test/full.png' })]} />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/full.png');
  });

  it('renders Open as a link, never a button inside a link', () => {
    render(<AttachmentList attachments={[attachment()]} />);

    const open = screen.getByRole('link', { name: 'Open' });

    expect(open.getAttribute('href')).toBe('https://example.test/attachments/01A/download');
    expect(open.querySelector('button')).toBeNull();
    expect(open.getAttribute('rel')).toContain('noopener');
  });

  it('only offers actions the host provided handlers for', () => {
    render(<AttachmentList attachments={[attachment()]} />);

    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull();
    expect(screen.queryByLabelText('Caption for report.pdf')).toBeNull();
  });

  it('saves a changed caption once on blur, trimmed, and not at all when unchanged', async () => {
    const onCaptionSave = vi.fn();
    const user = userEvent.setup();
    const item = attachment({ caption: 'Old' });

    render(<AttachmentList attachments={[item]} onCaptionSave={onCaptionSave} />);

    const input = screen.getByLabelText('Caption for report.pdf');

    await user.click(input);
    await user.tab();
    expect(onCaptionSave).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, '  New caption  {Enter}');

    expect(onCaptionSave).toHaveBeenCalledTimes(1);
    expect(onCaptionSave).toHaveBeenCalledWith(item, 'New caption');
  });

  it('sends null when a caption is cleared', async () => {
    const onCaptionSave = vi.fn();
    const user = userEvent.setup();
    const item = attachment({ caption: 'Old' });

    render(<AttachmentList attachments={[item]} onCaptionSave={onCaptionSave} />);

    await user.clear(screen.getByLabelText('Caption for report.pdf'));
    await user.tab();

    expect(onCaptionSave).toHaveBeenCalledWith(item, null);
  });

  it('shows a caption saved elsewhere instead of the stale draft', () => {
    const { rerender } = render(<AttachmentList attachments={[attachment({ caption: 'Old' })]} onCaptionSave={vi.fn()} />);

    rerender(<AttachmentList attachments={[attachment({ caption: 'From server' })]} onCaptionSave={vi.fn()} />);

    expect((screen.getByLabelText('Caption for report.pdf') as HTMLInputElement).value).toBe('From server');
  });

  it('hands the attachment to the delete handler', async () => {
    const onDelete = vi.fn();
    const item = attachment();

    render(<AttachmentList attachments={[item]} onDelete={onDelete} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(item);
  });
});
