import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  User,
} from "firebase/auth";
import { auth } from "./config";

export const signIn = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return signOut(auth);
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export const sendVerificationEmail = async (user: User) => {
  return sendEmailVerification(user);
};

export const confirmEmail = async (actionCode: string) => {
  return applyActionCode(auth, actionCode);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
