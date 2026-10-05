import { UniversityResultAdapter } from './base/adapter.interface';
import { CCSUAdapter } from './ccsu/ccsu.adapter';
import { AKTUAdapter } from './aktu/aktu.adapter';

class AdapterRegistry {
  private adapters = new Map<string, UniversityResultAdapter>();

  constructor() {
    this.register(new CCSUAdapter());
    this.register(new AKTUAdapter());
  }

  public register(adapter: UniversityResultAdapter): void {
    this.adapters.set(adapter.universityCode.toUpperCase(), adapter);
  }

  public getAdapter(code: string): UniversityResultAdapter {
    const adapter = this.adapters.get(code.toUpperCase());
    if (!adapter) {
      throw new Error(`No university adapter registered for code: ${code}. Supported: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return adapter;
  }

  public getAllUniversities(): Array<{ code: string; name: string; portalUrl: string }> {
    return Array.from(this.adapters.values()).map(a => ({
      code: a.universityCode,
      name: a.universityName,
      portalUrl: a.defaultPortalUrl,
    }));
  }
}

export const universityRegistry = new AdapterRegistry();
