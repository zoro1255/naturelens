
import { NatureInfo } from "../types";

export async function identifySpecies(base64Image: string): Promise<NatureInfo> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data as NatureInfo;
}
