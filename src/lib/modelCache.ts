export function getModelCacheKey(modelId: string): string {
  return `model_cache_${modelId}`;
}

export function isModelMarkedCached(
  modelId: string,
  storage: Pick<Storage, "getItem">,
): boolean {
  return storage.getItem(getModelCacheKey(modelId)) === "cached";
}

export function markModelCached(
  modelId: string,
  storage: Pick<Storage, "setItem">,
): void {
  storage.setItem(getModelCacheKey(modelId), "cached");
}

export function unmarkModelCached(
  modelId: string,
  storage: Pick<Storage, "removeItem">,
): void {
  storage.removeItem(getModelCacheKey(modelId));
}
