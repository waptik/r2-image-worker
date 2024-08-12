export type Type = {
  mimeType: string;
  extension: string;
};

const signatures: Record<string, string> = {
  "image/gif": "gif",
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const getMimeExtension = (mimeType: string): string | undefined => {
  return signatures[mimeType];
};
