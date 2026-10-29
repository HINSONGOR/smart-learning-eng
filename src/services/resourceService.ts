import "server-only";
import { z } from "zod";
import { resourceRepository } from "@/repositories";
import { CATEGORY_IDS, RESOURCE_TYPE_IDS } from "@/lib/constants";
import { resourceInputSchema, type LearningResource } from "@/lib/schemas";
import { NotFoundError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { createId } from "@/lib/text";

const resourceFilterSchema = z.object({
  search: z.string().trim().max(100).default(""),
  category: z.union([z.enum(CATEGORY_IDS), z.literal("")]).default(""),
  resourceType: z.union([z.enum(RESOURCE_TYPE_IDS), z.literal("")]).default(""),
  favorites: z
    .union([z.boolean(), z.string()])
    .default(false)
    .transform((v) => v === true || v === "1" || v === "true"),
});

export async function listResources(input: unknown = {}): Promise<LearningResource[]> {
  const filter = parseInput(resourceFilterSchema, input);
  const items = await resourceRepository.list();
  const q = filter.search.toLowerCase();
  return items
    .filter((item) => {
      if (filter.category && item.category !== filter.category) return false;
      if (filter.resourceType && item.resourceType !== filter.resourceType) return false;
      if (filter.favorites && !item.isFavorite) return false;
      if (q && ![item.title, item.topic, item.notes, item.url].join(" ").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getResource(id: string): Promise<LearningResource> {
  const item = await resourceRepository.get(id);
  if (!item) throw new NotFoundError("找不到這個資源");
  return item;
}

export async function createResource(input: unknown): Promise<LearningResource> {
  const data = parseInput(resourceInputSchema, input);
  const now = new Date().toISOString();
  return resourceRepository.insert({
    ...data,
    id: createId("res"),
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateResource(id: string, input: unknown): Promise<LearningResource> {
  const data = parseInput(resourceInputSchema, input);
  const updated = await resourceRepository.update(id, (current) => ({
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) throw new NotFoundError("找不到這個資源");
  return updated;
}

export async function setResourceFavorite(id: string, isFavorite: boolean): Promise<LearningResource> {
  const updated = await resourceRepository.update(id, (current) => ({ ...current, isFavorite }));
  if (!updated) throw new NotFoundError("找不到這個資源");
  return updated;
}

export async function deleteResource(id: string): Promise<void> {
  const removed = await resourceRepository.remove(id);
  if (!removed) throw new NotFoundError("找不到這個資源");
}
