import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import { getFirebaseApp } from "@/lib/firebase/client";

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const optimizeImageFile = async (file: File): Promise<File> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      element.src = objectUrl;
    });

    const maxEdge = 500;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("画像の変換に失敗しました。");
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob);
            return;
          }
          reject(new Error("画像の圧縮に失敗しました。"));
        },
        "image/webp",
        0.5
      );
    });

    const safeBaseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "") || "image");
    return new File([blob], `${safeBaseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now()
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const uploadProjectScriptImage = async (
  projectId: string,
  scriptId: string,
  file: File
): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください。");
  }

  const optimizedFile = await optimizeImageFile(file);
  const storage = getStorage(getFirebaseApp());
  const timestamp = Date.now();
  const safeFileName = sanitizeFileName(optimizedFile.name || "image.webp");
  const imageRef = ref(storage, `projects/${projectId}/scripts/${scriptId}/images/${timestamp}-${safeFileName}`);

  await uploadBytes(imageRef, optimizedFile, {
    contentType: optimizedFile.type
  });

  return getDownloadURL(imageRef);
};
