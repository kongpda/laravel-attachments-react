import { useState } from 'react';
import type { AttachmentResource } from '../types';

export function useAttachmentPreview() {
  const [previewing, setPreviewing] = useState<AttachmentResource | null>(null);

  return {
    previewing,
    openPreview: (attachment: AttachmentResource) => setPreviewing(attachment),
    closePreview: () => setPreviewing(null),
  };
}
