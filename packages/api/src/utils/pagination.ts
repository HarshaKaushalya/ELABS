export function getPagination(page = 1, pageSize = 20) {
  const safePage = Math.max(page, 1);
  const safeSize = Math.max(1, Math.min(pageSize, 100));
  return { page: safePage, pageSize: safeSize, offset: (safePage - 1) * safeSize };
}