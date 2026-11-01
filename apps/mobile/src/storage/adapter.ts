export interface StorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  async read(key: string) {
    return this.values.get(key) ?? null;
  }
  async write(key: string, value: string) {
    this.values.set(key, value);
  }
  async remove(key: string) {
    this.values.delete(key);
  }
}
