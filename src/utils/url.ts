export const formatAvatarUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('/')) {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      if (baseUrl) {
        const urlObj = new URL(baseUrl);
        return `${urlObj.origin}${url}`;
      }
    } catch (e) {
      console.error('Failed to parse base URL for avatar formatting:', e);
    }
  }
  return url;
};
