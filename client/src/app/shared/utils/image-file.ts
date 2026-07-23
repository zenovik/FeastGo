const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Returns an error message if `file` isn't an acceptable image, or null if it's fine. */
export function validateImageFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `${file.name} must be a JPG, PNG or WEBP image`;
  }
  if (file.size > maxBytes) {
    return `${file.name} must be under ${Math.round(maxBytes / 1_000_000)}MB`;
  }
  return null;
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
