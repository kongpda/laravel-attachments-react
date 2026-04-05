export type AttachmentResource = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  caption: string | null;
  group: string | null;
  is_default: boolean;
  url: string;
  thumbnail_url: string | null;
  is_previewable: boolean;
  is_image: boolean;
  created_at: string | null;
};

export type AttachmentActionHandlers = {
  onPreview?: (attachment: AttachmentResource) => void;
  onDelete?: (attachment: AttachmentResource) => void;
  onCaptionSave?: (attachment: AttachmentResource, caption: string | null) => void;
};
