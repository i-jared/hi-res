import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  StorageReference,
} from "firebase/storage";
import { storage } from "./config";

export const uploadFile = async (
  path: string,
  file: Blob | Uint8Array | ArrayBuffer
) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const getFileUrl = async (path: string) => {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

export const deleteFile = async (path: string) => {
  const storageRef = ref(storage, path);
  return deleteObject(storageRef);
};

export const listFiles = async (path: string) => {
  const storageRef = ref(storage, path);
  return listAll(storageRef);
};
