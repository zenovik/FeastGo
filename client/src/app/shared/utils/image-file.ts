const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_TYPES_WITH_PDF = [...ALLOWED_TYPES, 'application/pdf'];

/** Returns an error message if `file` isn't an acceptable image (or PDF, when allowed), or null if it's fine. */
export function validateImageFile(file: File, maxBytes: number, allowPdf = false): string | null {
  const allowed = allowPdf ? ALLOWED_TYPES_WITH_PDF : ALLOWED_TYPES;
  if (!allowed.includes(file.type)) {
    return allowPdf ? `${file.name} must be a JPG, PNG or PDF file` : `${file.name} must be a JPG, PNG or WEBP image`;
  }
  if (file.size > maxBytes) {
    return `${file.name} must be under ${Math.round(maxBytes / 1_000_000)}MB`;
  }
  return null;
}

export function isPdfDataUrl(src: string | null | undefined): boolean {
  return !!src?.startsWith('data:application/pdf');
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
