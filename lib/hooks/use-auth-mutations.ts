import { useMutation } from "@tanstack/react-query";
import {
  signIn,
  signUp,
  resetPassword,
  sendVerificationEmail,
  confirmEmail,
} from "@/lib/firebase";
import { User } from "firebase/auth";

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signUp(email, password),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) => resetPassword(email),
  });
}

export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: (user: User) => sendVerificationEmail(user),
  });
}

export function useConfirmEmail() {
  return useMutation({
    mutationFn: (actionCode: string) => confirmEmail(actionCode),
  });
}
