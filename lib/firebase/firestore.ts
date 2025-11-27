import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
} from "firebase/firestore";
import { db } from "./config";

export const getDocument = async <T = DocumentData>(
  collectionPath: string,
  documentId: string
) => {
  const docRef = doc(db, collectionPath, documentId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
  }
  return null;
};

export const getDocuments = async <T = DocumentData>(
  collectionPath: string,
  ...queryConstraints: QueryConstraint[]
) => {
  const collectionRef = collection(db, collectionPath);
  const q = queryConstraints.length
    ? query(collectionRef, ...queryConstraints)
    : collectionRef;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as T & { id: string })
  );
};

export const createDocument = async <T extends WithFieldValue<DocumentData>>(
  collectionPath: string,
  documentId: string,
  data: T
) => {
  const docRef = doc(db, collectionPath, documentId);
  await setDoc(docRef, data);
  return documentId;
};

export const updateDocument = async <T extends WithFieldValue<DocumentData>>(
  collectionPath: string,
  documentId: string,
  data: T
) => {
  const docRef = doc(db, collectionPath, documentId);
  await updateDoc(docRef, data);
};

export const deleteDocument = async (
  collectionPath: string,
  documentId: string
) => {
  const docRef = doc(db, collectionPath, documentId);
  await deleteDoc(docRef);
};

export const subscribeToDocument = <T = DocumentData>(
  collectionPath: string,
  documentId: string,
  callback: (data: (T & { id: string }) | null) => void
) => {
  const docRef = doc(db, collectionPath, documentId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as T & { id: string });
    } else {
      callback(null);
    }
  });
};

export const subscribeToDocuments = <T = DocumentData>(
  collectionPath: string,
  callback: (data: (T & { id: string })[]) => void,
  ...queryConstraints: QueryConstraint[]
) => {
  const collectionRef = collection(db, collectionPath);
  const q = queryConstraints.length
    ? query(collectionRef, ...queryConstraints)
    : collectionRef;
  return onSnapshot(q, (querySnapshot) => {
    const docs = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T & { id: string })
    );
    callback(docs);
  });
};

export const getCollectionGroup = async <T = DocumentData>(
  collectionGroupId: string,
  ...queryConstraints: QueryConstraint[]
) => {
  const groupRef = collectionGroup(db, collectionGroupId);
  const q = queryConstraints.length
    ? query(groupRef, ...queryConstraints)
    : groupRef;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as T & { id: string })
  );
};
