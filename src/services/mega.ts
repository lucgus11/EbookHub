// Client-side MEGA helpers — actual upload/download goes through API routes

export interface MegaUploadResult {
  nodeHandle: string;
  shareUrl: string;
  name: string;
  size: number;
}

export async function uploadToMega(
  file: File,
  onProgress?: (pct: number) => void
): Promise<MegaUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid response"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", "/api/mega/upload");
    xhr.send(formData);
  });
}

export async function listMegaFiles(): Promise<MegaUploadResult[]> {
  const res = await fetch("/api/mega/files");
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Failed to list MEGA files");
  }
  return res.json();
}

export async function deleteMegaFile(nodeHandle: string): Promise<void> {
  const res = await fetch("/api/mega/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeHandle }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? "Failed to delete file");
  }
}

export async function getMegaShareUrl(nodeHandle: string): Promise<string> {
  const res = await fetch(`/api/mega/share?handle=${nodeHandle}`);
  if (!res.ok) throw new Error("Failed to get share URL");
  const data = await res.json();
  return data.url;
}
