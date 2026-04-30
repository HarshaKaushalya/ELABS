import { apiFetch } from "./api";

export async function fetchItems(labId?: number) {
  const qs = labId ? `?labId=${labId}` : "";
  const res = await apiFetch(`/inventory/items${qs}`);
  if (!res.ok) throw new Error("Failed to load items");
  return res.json();
}

export async function borrowItems(payload: any) {
  const res = await apiFetch(`/inventory/borrow`, { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Borrow failed");
  return data;
}

export async function returnTransaction(transactionId: number, conditionIn?: string) {
  const res = await apiFetch(`/inventory/return`, {
    method: "POST",
    body: JSON.stringify({ transactionId, conditionIn: conditionIn ?? null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Return failed");
  return data;
}
