import { z } from "zod";
import {
  packIdSchema,
  relativeArtifactPathSchema,
  schemaVersionLiteral,
  sha256DigestSchema,
  versionSchema,
} from "./common.js";

export const snapshotEntryKindSchema = z.enum(["bundle", "release-manifest", "retirement-notice"]);

export const snapshotIndexEntrySchema = z
  .object({
    kind: snapshotEntryKindSchema,
    packId: packIdSchema,
    packVersion: versionSchema,
    path: relativeArtifactPathSchema,
    digest: sha256DigestSchema,
  })
  .strict();

export const snapshotIndexSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    entries: z.array(snapshotIndexEntrySchema),
  })
  .strict()
  .superRefine((value, context) => {
    const seenPaths = new Set<string>();
    const seenVersionedArtifacts = new Set<string>();

    value.entries.forEach((entry, index) => {
      if (seenPaths.has(entry.path)) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "path"],
          message: `duplicate snapshot path "${entry.path}"`,
        });
      }
      seenPaths.add(entry.path);

      const versionedKey = `${entry.kind}:${entry.packId}:${entry.packVersion}`;
      if (seenVersionedArtifacts.has(versionedKey)) {
        context.addIssue({
          code: "custom",
          path: ["entries", index],
          message: `duplicate ${entry.kind} for ${entry.packId} version ${entry.packVersion}`,
        });
      }
      seenVersionedArtifacts.add(versionedKey);
    });
  });

export type SnapshotIndex = z.infer<typeof snapshotIndexSchema>;
export type SnapshotIndexEntry = z.infer<typeof snapshotIndexEntrySchema>;
