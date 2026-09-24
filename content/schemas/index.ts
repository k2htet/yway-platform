import type { z } from "zod";
import { packSourceSchema } from "./pack-source.js";
import { localizedContentSchema } from "./localized-content.js";
import { practitionerEligibilitySchema } from "./practitioner-eligibility.js";
import { reviewAttestationSchema } from "./review-attestation.js";
import { provenanceEventSchema, provenanceEventLogSchema } from "./provenance-event.js";
import { releaseManifestSchema } from "./release-manifest.js";
import { snapshotIndexSchema } from "./snapshot-index.js";
import { retirementRecordSchema } from "./retirement-record.js";
import { retirementNoticeSchema } from "./retirement-notice.js";

export * from "./common.js";
export * from "./yaml.js";
export * from "./pack-source.js";
export * from "./localized-content.js";
export * from "./practitioner-eligibility.js";
export * from "./review-attestation.js";
export * from "./provenance-event.js";
export * from "./release-manifest.js";
export * from "./snapshot-index.js";
export * from "./retirement-record.js";
export * from "./retirement-notice.js";

export interface GeneratedSchema {
  readonly name: string;
  readonly schema: z.ZodType;
}

export const generatedSchemas: readonly GeneratedSchema[] = [
  { name: "pack-source", schema: packSourceSchema },
  { name: "localized-content", schema: localizedContentSchema },
  { name: "practitioner-eligibility", schema: practitionerEligibilitySchema },
  { name: "review-attestation", schema: reviewAttestationSchema },
  { name: "provenance-event", schema: provenanceEventSchema },
  { name: "provenance-event-log", schema: provenanceEventLogSchema },
  { name: "release-manifest", schema: releaseManifestSchema },
  { name: "snapshot-index", schema: snapshotIndexSchema },
  { name: "retirement-record", schema: retirementRecordSchema },
  { name: "retirement-notice", schema: retirementNoticeSchema },
];
