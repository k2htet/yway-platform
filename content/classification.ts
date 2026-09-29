import { z } from "zod";
import { StrictValidationError, type StrictValidationIssue } from "./schemas/common.js";

/**
 * Content classification and the rules that keep fixture and real content apart.
 *
 * This module is the single home for the classification rules under `YWAY-D003`
 * and `YWAY-D005`. Two independent facts are kept separate on purpose, because
 * collapsing them is how pilot eligibility would start to read as public-release
 * authority:
 *
 * - **Classification** (`fixture` or `real`) is a statement about whether the
 *   content, its provenance, and its recorded reviews are synthetic or genuine.
 * - **Release authorization scope** (`pilot`) is a separate owner-granted
 *   statement about where the content may be shown. `public` is not grantable:
 *   its `YWAY-P023` comprehension gates, its `YWAY-P024` runtime accessibility
 *   evidence, and a separate owner authorization do not exist yet.
 *
 * The rules are expressed as pure functions returning issues so that schemas,
 * repository commands, the artifact boundary, and the artifact-only consumer can
 * all enforce the same rule without restating it.
 */

/** Synthetic identities are namespaced so they can never be read as a person. */
export const fixtureIdentityPrefix = "fixture-";

/** Synthetic evidence carries the same marker: it never describes a real check. */
export const fixtureEvidencePrefix = "fixture:";

/** The one shape a synthetic evidence reference may take, used by every record that carries one. */
export const fixtureEvidencePattern = /^fixture:[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * The opaque-reference class a real record's evidence must match.
 *
 * It is the same class the qualification `evidenceReferences` field has always used,
 * applied to Burmese-fluency evidence as well. It forbids whitespace, `@`, `.`, `/`,
 * and non-Latin script, so a name with a space, a contact route, and a document path
 * cannot be recorded. It does **not** forbid a transliterated name or a numeric
 * identifier, so it is necessary and not sufficient; owner issuance of the reference
 * remains the control, exactly as for qualification evidence.
 */
export const opaqueReferencePattern = /^[a-z0-9][a-z0-9:_-]*$/;

/**
 * The permanently reserved Pack-ID namespace.
 *
 * `YWAY-D005` requires every fixture Pack to be authored under this prefix and no
 * real Pack ever to be. It is deliberately a rule over the *identifier* and not
 * over a record flag: relabelling every `fixtureOnly` field in a consistent
 * fixture record set does not change the identifier, so the refusal survives a
 * relabelling and the rule covers fixture Packs added later as well.
 */
export const fixturePackIdPrefix = fixtureIdentityPrefix;

/** A real retirement records an opaque reference to the owner-held record, not prose. */
export const realRetirementReasonPattern = /^owner-record:[a-z0-9][a-z0-9:_-]*$/;

export type ContentClassification = "fixture" | "real";

export type ReleaseAuthorizationScope = "pilot";

/**
 * Content classification. The `production` value that Stage 2 once carried is
 * retired: classification is a synthetic-versus-genuine statement, and reloading
 * it with a release-readiness meaning would produce the single mutually exclusive
 * lifecycle label `YWAY-P019` forbids.
 */
export const contentClassificationSchema = z.enum(["fixture", "real"]);

/**
 * Release authorization scope, stored separately from classification and read at
 * build time.
 *
 * Only `pilot` is grantable. `public` is absent from the domain on purpose:
 * public release additionally requires the `YWAY-P023` fluent-Burmese-review and
 * target-user-comprehension gates, the `YWAY-P024` runtime accessibility evidence
 * from #66, and a separate owner authorization, none of which exist. Omitting the
 * value makes it impossible to serialize or read a manifest as `public`.
 */
export const releaseAuthorizationScopeSchema = z.enum(["pilot"]);

/** Accepted on the command line so the refusal can name what is missing. */
export const requestedAuthorizationScopeSchema = z.enum(["pilot", "public"]);

export function contentClassification(fixtureOnly: boolean): ContentClassification {
  return fixtureOnly ? "fixture" : "real";
}

export function isFixturePackId(packId: string): boolean {
  return packId.startsWith(fixturePackIdPrefix);
}

function classificationForPackId(packId: string): ContentClassification {
  return isFixturePackId(packId) ? "fixture" : "real";
}

/**
 * Resolves the classification a Pack ID permits, and refuses any content whose
 * recorded classification disagrees with its identifier.
 *
 * The two directions are both refusals: a real Pack may not occupy the reserved
 * `fixture-` namespace, and a `fixture-` Pack may not be recorded as real.
 */
export function packIdClassificationIssue(
  packId: string,
  fixtureOnly: boolean,
  path: readonly (string | number)[] = ["id"],
  label = `pack "${packId}"`,
): StrictValidationIssue | undefined {
  const required = contentClassification(fixtureOnly);
  const reserved = classificationForPackId(packId);
  if (required === reserved) {
    return undefined;
  }
  // Branch on the identifier, not on the record: the rule is about the namespace,
  // so the message must attribute it to whichever side the identifier is on.
  return {
    path: [...path],
    message:
      reserved === "fixture"
        ? `pack id "${packId}" is reserved for synthetic content by the permanent "${fixturePackIdPrefix}" Pack-ID rule; a real Pack must be authored under a new identifier with its own provenance genesis`
        : `${label} is synthetic content and must be authored under a reserved "${fixturePackIdPrefix}" Pack ID; the reserved namespace is how a synthetic Pack is identifiable after every other marker is gone`,
  };
}

/**
 * Inverse actor rule. Fixture content must be acted on only by a `fixture-`
 * identity, and real content must never be attributed to one, so a synthetic
 * identity cannot appear in a real person's review record.
 */
export function actorClassificationIssue(
  fixtureOnly: boolean,
  actorId: string,
  path: readonly (string | number)[] = ["actorId"],
  label = `actor "${actorId}"`,
): StrictValidationIssue | undefined {
  if (actorId.startsWith(fixtureIdentityPrefix) === fixtureOnly) {
    return undefined;
  }
  return {
    path: [...path],
    message: fixtureOnly
      ? `${label} must be a ${fixtureIdentityPrefix} identity for fixture-only content (synthetic actor identities only)`
      : `${label} must not be a ${fixtureIdentityPrefix} identity on real content (a synthetic identity cannot be attributed to a real reviewer); use the owner-issued opaque handle for the reviewer`,
  };
}

/** Inverse evidence rule, applied to qualification and Burmese-fluency evidence. */
export function evidenceReferenceClassificationIssue(
  fixtureOnly: boolean,
  reference: string,
  path: readonly (string | number)[] = ["evidenceReferences"],
  label = "evidence reference",
): StrictValidationIssue | undefined {
  if (isFixtureEvidenceReference(reference) === fixtureOnly) {
    return undefined;
  }
  return {
    path: [...path],
    message: fixtureOnly
      ? `${label} must use a ${fixtureEvidencePrefix} reference for fixture-only content (synthetic evidence only)`
      : `${label} must not use a ${fixtureEvidencePrefix} reference on real content; cite the opaque reference to the owner-held private review record instead`,
  };
}

/** Whether a reference is a well-formed synthetic evidence reference. */
export function isFixtureEvidenceReference(reference: string): boolean {
  return fixtureEvidencePattern.test(reference);
}

/**
 * An attestation `note` is unbounded free text that no digest binds, so once
 * notes are real a note-only edit would be detected by nothing. The opaque owner
 * record already carries what a note would, so real attestations carry none.
 */
export function attestationNoteIssue(
  fixtureOnly: boolean,
  note: string | undefined,
  path: readonly (string | number)[] = ["note"],
): StrictValidationIssue | undefined {
  if (fixtureOnly || note === undefined) {
    return undefined;
  }
  return {
    path: [...path],
    message:
      "real-content attestations must not carry a free-text note; the note is excluded from the artifact boundary and bound by no digest, so cite the owner-held private review record instead",
  };
}

/**
 * A retirement reason is likewise free text outside the artifact boundary, so a
 * real retirement records only an opaque `owner-record:<id>` pointer and keeps
 * the reason itself in the owner-held record.
 */
export function retirementReasonIssue(
  fixtureOnly: boolean,
  reason: string,
  path: readonly (string | number)[] = ["reason"],
): StrictValidationIssue | undefined {
  if (fixtureOnly || realRetirementReasonPattern.test(reason)) {
    return undefined;
  }
  return {
    path: [...path],
    message:
      'a real-content retirement reason must be an opaque "owner-record:<id>" reference to the owner-held record; the reason itself is kept outside the repository',
  };
}

export interface ClassifiedRecord {
  readonly id: string;
  readonly version: number;
  readonly fixtureOnly: boolean;
}

/**
 * Classification and authorization scope are separate fields, and neither may
 * stand in for the other. Real content always carries the `pilot` scope the owner
 * granted at release; fixture content carries none, which is also what keeps the
 * historical fixture manifests byte-identical.
 */
export function authorizationScopeIssue(
  fixtureOnly: boolean,
  scope: string | undefined,
  path: readonly (string | number)[] = ["authorizationScope"],
): StrictValidationIssue | undefined {
  if (fixtureOnly) {
    return scope === undefined
      ? undefined
      : {
          path: [...path],
          message:
            "fixture-classified content must not carry a release authorization scope; only real content is released under an owner-granted scope",
        };
  }
  return scope === "pilot"
    ? undefined
    : {
        path: [...path],
        message:
          'real-classified content must record authorizationScope "pilot" (pilot eligibility is a separate statement from public-release authorization, and "public" requires gates and an owner authorization that do not exist yet)',
      };
}

/**
 * The classification guard every mutating repository command applies.
 *
 * It replaces the Stage 2 fixture-only guard. The Pack-ID rule is checked first so
 * that a reserved identifier is refused for the reason that actually holds, even
 * when the record's own flags say otherwise.
 */
export function requireClassificationIsolation(
  record: ClassifiedRecord,
  actorId?: string,
  path: readonly (string | number)[] = [],
): void {
  const issues: StrictValidationIssue[] = [];
  const packIdIssue = packIdClassificationIssue(record.id, record.fixtureOnly, [...path, "id"]);
  if (packIdIssue !== undefined) {
    issues.push(packIdIssue);
  }
  if (actorId !== undefined) {
    const actorIssue = actorClassificationIssue(
      record.fixtureOnly,
      actorId,
      [...path, "actorId"],
      `actor "${actorId}"`,
    );
    if (actorIssue !== undefined) {
      issues.push(actorIssue);
    }
  }
  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }
}
