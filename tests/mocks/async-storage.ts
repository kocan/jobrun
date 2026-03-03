const storage = new Map<string, string>();

const AsyncStorageMock = {
  clear: async () => storage.clear(),
  getAllKeys: async () => Array.from(storage.keys()),
  getItem: async (key: string) => storage.get(key) ?? null,
  multiRemove: async (keys: string[]) => {
    for (const key of keys) {
      storage.delete(key);
    }
  },
  removeItem: async (key: string) => storage.delete(key),
  setItem: async (key: string, value: string) => storage.set(key, value),
};

export default AsyncStorageMock;
