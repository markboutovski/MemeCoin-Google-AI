import { UniverseSnapshot } from '../types/live';

export class LiveApi {
  static async getUniverse(): Promise<UniverseSnapshot> {
    const response = await fetch('/api/live-universe');

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return (await response.json()) as UniverseSnapshot;
  }
}
