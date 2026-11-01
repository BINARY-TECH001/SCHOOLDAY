import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageAdapter } from "./adapter";
export const deviceStorage: StorageAdapter = {
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};
