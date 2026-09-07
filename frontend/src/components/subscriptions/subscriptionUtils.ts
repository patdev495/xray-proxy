export const formatDataSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
};

export const formatGb = (bytes: number): string => (bytes / (1024 * 1024 * 1024)).toFixed(1);

export const getSubUrl = (subToken: string): string => {
  const origin = window.location.origin;
  return `${origin}/sub/${subToken}`;
};
