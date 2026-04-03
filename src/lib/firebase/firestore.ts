import { getFirestore } from "firebase/firestore";

import { getFirebaseApp } from "@/lib/firebase/client";

export const getFirebaseFirestore = () => {
  return getFirestore(getFirebaseApp());
};
