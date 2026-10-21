import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Notebook } from "./notebook-data.ts";
import { sanitizeNotebook } from "./notebook-data.ts";

export const firebaseConfig = {
  apiKey: "AIzaSyCmpiLyZlAxuUpQrrQ7iIX7GVJRZoMu0FQ",
  authDomain: "termolab-8f502.firebaseapp.com",
  projectId: "termolab-8f502",
  storageBucket: "termolab-8f502.firebasestorage.app",
  messagingSenderId: "21407193985",
  appId: "1:21407193985:web:65a045e8522a15bad4a680",
  measurementId: "G-E7NDSMFXVS",
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const adminEmail = "guisouza.sx3030@gmail.com";
export const isAdminUser = (user: User) =>
  user.email?.toLowerCase() === adminEmail && user.emailVerified;
export const login = () => signInWithPopup(auth, new GoogleAuthProvider());
export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);
export const createEmailAccount = async (email: string, password: string) => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await sendEmailVerification(credential.user);
  return credential;
};
export const verifyEmail = async () => {
  if (!auth.currentUser) throw new Error("Entre na conta primeiro.");
  await sendEmailVerification(auth.currentUser);
};
export const logout = () => signOut(auth);
export const notebookRef = (uid: string) => doc(db, "notebooks", uid);
export async function getCloudNotebook(uid: string): Promise<Notebook | null> {
  const snap = await getDoc(notebookRef(uid));
  return snap.exists() ? sanitizeNotebook(snap.data().data) : null;
}
export async function putCloudNotebook(user: User, data: Notebook) {
  await setDoc(notebookRef(user.uid), {
    ownerUid: user.uid,
    email: user.email ?? "",
    data: sanitizeNotebook(data),
    updatedAt: serverTimestamp(),
  });
}
export async function listCloudNotebooks() {
  const snapshots = await getDocs(collection(db, "notebooks"));
  return snapshots.docs.map((s) => ({
    uid: s.id,
    email: String(s.data().email ?? ""),
    data: sanitizeNotebook(s.data().data),
    updatedAt: s.data().updatedAt?.toDate?.() as Date | undefined,
  }));
}
export async function deleteCloudNotebook(uid: string) {
  await deleteDoc(notebookRef(uid));
}
