const AI_BASE = process.env.NEXT_PUBLIC_AI_BASE_URL ?? "http://localhost:8001";

export async function uploadDocument(file: File): Promise<{ ok: boolean; filename: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${AI_BASE}/docs/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Document upload failed");
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true, filename: data?.filename ?? file.name };
}
