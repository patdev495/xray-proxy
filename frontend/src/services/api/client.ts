export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function parseError(response: Response, defaultMessage: string): Promise<string> {
  try {
    const errJson = await response.json();
    if (errJson.detail) {
      return typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
    }
  } catch {
    // Ignore JSON parsing failure
  }
  return defaultMessage;
}
