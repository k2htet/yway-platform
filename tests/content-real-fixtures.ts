import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatRecord,
  localizedContentSchema,
  localizedContentPath as repositoryLocalizedContentPath,
  packSourceSchema,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  strictParse,
  type AttestationKind,
  type CommandResult,
  type LocalizedContent,
  type PackSource,
  type ProvenanceEventLog,
} from "../content/index.js";
import {
  commandClock,
  commandOptions,
  expectExit,
  readProvenanceLog,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
} from "./content-cli-fixtures.js";

/**
 * Synthetic records for exercising the real (non-fixture) release path.
 *
 * **What these fixtures are not.** Every record here is written by this test file,
 * in a temporary directory, with opaque handles invented for the test. No real
 * practitioner reviewed anything, no real qualification was verified, no real
 * Burmese reviewer assessed fluency, and no owner-held private record exists. The
 * `owner-record:` references point at nothing. A passing test here proves that the
 * real-classification *mechanism* works end to end; it does not establish a
 * genuine reviewer, a real qualification, or pilot eligibility for any content.
 *
 * The handles are deliberately not derivable from a person, which is also the
 * rule the real path enforces: an owner-issued opaque handle, never a name, a
 * transliteration, a workplace, or a contact route.
 */

export const realPackId = "retail-assistant";

export const realReviewActors: Readonly<Record<AttestationKind, string>> = {
  "founder-review": "founder-handle-c2",
  "practitioner-review": "reviewer-handle-a7",
  "localization-review": "burmese-handle-d3",
  "accessibility-review": "accessibility-handle-e4",
  "sponsorship-disclosure": "sponsorship-handle-e5",
};

/** The synthetic author and release identities; neither is a `fixture-` identity. */
export const realAuthorActor = "author-handle-b1";
export const realReleaseActor = "release-handle-f5";

export const realOccupation = "retail-assistant";

/** An opaque reference into the owner-held private record. It resolves to nothing. */
export const realEvidenceReference = "owner-record:vetting-2026-001";

export function realPackObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: realPackId,
    version: 1,
    fixtureOnly: false,
    canonicalLanguage: "en-simple",
    aiAssisted: true,
    title: "Try being a shop assistant",
    summary:
      "A short exploration of working behind a shop counter, written for this test repository only.",
    occupations: [realOccupation],
    preview: {
      headline: "Try one short counter task",
      description: "Spend an hour helping in a shop and notice what the work really asks of you.",
    },
    limitations: [
      "This Pack is written for an automated test and describes no real shop, employer, sponsor, or job offer.",
      "Trying a task is not practice, a verified assessment, or evidence for a portfolio.",
      "This Pack does not say which work suits you and does not rank, score, or compare careers.",
    ],
    accessibility: {
      scope: "content",
      readingOrder: ["summary", "preview", "limitations", "exp-help-a-customer"],
      media: [],
    },
    experiments: [
      {
        id: "exp-help-a-customer",
        title: "Help one customer",
        question: "What is actually hard about helping a customer at a counter all day?",
        action: "Ask to spend one hour working alongside someone who does this work.",
        timebox: "One hour this week.",
        whatToNotice: "Which moments felt easier and which felt harder, and why.",
        reflection: "Write three sentences about what you noticed.",
        nextFork: "Shadow the same work for another half day before any course or application.",
      },
    ],
    authoredAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

export function makeRealPack(overrides: Record<string, unknown> = {}): PackSource {
  return strictParse(packSourceSchema, realPackObject(overrides));
}

export function realLocalizedObject(
  pack: PackSource,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: pack.id,
    packVersion: pack.version,
    locale: "my",
    fixtureOnly: false,
    preview: {
      headline: "မရွေးခင် ဆိုင်ကောင်မှာ အလုပ်တစ်ခု စမ်းကြည့်ခြင်း",
      description: "ဆိုင်တစ်ခုတွင် တစ်နာရီ အကူအညီပေးပြီး အလုပ်က လိုအပ်ချက်ကို သတိထားပါ။",
    },
    title: "ဆိုင်ကောင်အလုပ်ကို စမ်းကြည့်ခြင်း",
    summary: "ဆိုင်ကောင်အလုပ်ကို ရွေးချယ်ခြင်း မဟုတ်ဘဲ စမ်းကြည့်ရန် တစ်နာရီစာ သုံးပါ။",
    limitations: [
      "ဤထုပ်ပိုးမှုကို အမှန်တကယ် ဆိုင်၊ အလုပ်ရှင်၊ ပံ့ပိုးသူ သို့မဟုတ် အလုပ်ခေါ်ချင်း မပါဝင်ပါ။",
      "ဤထုပ်ပိုးမှုကို ပံ့ပိုးသည်ဟု မဆိုထားပါ။",
      "ဘယ်အလုပ်ကို ဦးစားပေး၊ နှိုင်းယှဉ်ချက်၊ အမှတ်အသား မပေးပါ။",
    ],
    experiments: [
      {
        id: "exp-help-a-customer",
        title: "ဖောက်သူတစ်ယောက်ကို ကူညီခြင်း",
        question: "ဖောက်သူကို နေ့စဉ် ကူညီပေးရခက်ခဲမှုက ဘာလဲဆိုတာ သတိထားပါ။",
        action: "ဤအလုပ်ကိုလုပ်သူတစ်ယောက်နှင့် တစ်နာရီ အတူလုပ်ရန် တောင်းပါ။",
        timebox: "အပတ်ရက်နေ့တစ်ခါ၌ တစ်နာရီသာ။",
        whatToNotice: "ဘာတွေက လွတ်လပ်ပြီး ဘာတွေက ခက်ခဲခဲ့လဲဟု သတိထားပါ။",
        reflection: "သင်းကြည့်ခဲ့သည့် အချက်ကို သုံးကြောင်း ရေးသားပါ။",
        nextFork:
          "အတူလုပ်ခဲ့သော အလုပ်ကို ထပ်မံကြည့်ပြီးမှ သင်တန်း၊ လျှောက်ထားမှု ဆိုင်ရာ မဆက်သွားပါ။",
      },
    ],
    accessibility: pack.accessibility,
    ...overrides,
  };
}

export function makeRealLocalizedContent(
  pack: PackSource,
  overrides: Record<string, unknown> = {},
): LocalizedContent {
  return strictParse(localizedContentSchema, realLocalizedObject(pack, overrides));
}

/** Writes the real eligibility record: an opaque actor and an opaque evidence reference. */
export function writeRealEligibility(
  repositoryRoot: string,
  overrides: Record<string, unknown> = {},
): void {
  writeEligibility(repositoryRoot, realReviewActors["practitioner-review"], {
    actorId: realReviewActors["practitioner-review"],
    fixtureOnly: false,
    occupations: [realOccupation],
    evidenceReferences: [realEvidenceReference],
    ...overrides,
  });
}

export function realAttestArgs(input: {
  readonly packId: string;
  readonly version: number;
  readonly kind: AttestationKind;
  readonly outcome?: "approved" | "changes-requested";
  readonly note?: string;
  readonly fluentReviewEvidence?: string;
  readonly actorId?: string;
}): string[] {
  const args = [
    "--pack",
    input.packId,
    "--version",
    String(input.version),
    "--kind",
    input.kind,
    "--actor",
    input.actorId ?? realReviewActors[input.kind],
    "--outcome",
    input.outcome ?? "approved",
  ];
  if (input.kind === "founder-review" || input.kind === "practitioner-review") {
    args.push("--six-part-confirmed", "true", "--exposure-before-commitment-confirmed", "true");
  }
  if (input.kind === "localization-review") {
    args.push(
      "--locale",
      "my",
      "--fluent-burmese-confirmed",
      "true",
      "--fluent-review-evidence",
      input.fluentReviewEvidence ?? realEvidenceReference,
    );
  }
  if (input.kind === "accessibility-review") {
    args.push(
      "--reading-order-confirmed",
      "true",
      "--media-alternatives-confirmed",
      "true",
      "--runtime-validation-deferred",
    );
  }
  if (input.kind === "sponsorship-disclosure") {
    args.push(
      "--disclosure-confirmed",
      "true",
      "--editorial-control-preserved",
      "true",
      "--ordering-influence",
      "none",
    );
  }
  if (input.note !== undefined) {
    args.push("--note", input.note);
  }
  return args;
}

export const realReleaseOrder = [
  "founder-review",
  "practitioner-review",
  "localization-review",
  "accessibility-review",
] as const satisfies readonly AttestationKind[];

export function realReleaseArgs(
  packId: string,
  version: number,
  authorizationScope: string | null = "pilot",
  actorId = realReleaseActor,
): string[] {
  return [
    "--pack",
    packId,
    "--version",
    String(version),
    "--actor",
    actorId,
    ...(authorizationScope === null ? [] : ["--authorization-scope", authorizationScope]),
  ];
}

export interface RealPackSetup {
  readonly root: string;
  readonly pack: PackSource;
  readonly version: number;
  readonly registered: CommandResult;
}

/** Authors, registers, and gives the real Pack its own provenance genesis. */
export function registerRealPack(root: string, pack: PackSource = makeRealPack()): RealPackSetup {
  writePackSource(root, pack);
  writeLocalizedContent(root, makeRealLocalizedContent(pack));
  const registered = expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", realAuthorActor], commandOptions(root)),
    0,
  );
  writeRealEligibility(root);
  return { root, pack, version: pack.version, registered };
}

/** Records every release-readiness review the shared gates require. */
export function recordRealReviews(
  root: string,
  pack: PackSource,
  kinds: readonly AttestationKind[] = realReleaseOrder,
): void {
  for (const kind of kinds) {
    expectExit(
      runAttestCommand(
        realAttestArgs({ packId: pack.id, version: pack.version, kind }),
        commandOptions(root),
      ),
      0,
    );
  }
}

/** Drives a real Pack all the way to a released, pilot-authorized artifact. */
export function releaseRealPack(
  root: string,
  options_: { readonly pack?: PackSource } = {},
): { readonly pack: PackSource; readonly version: number; readonly release: CommandResult } {
  const pack = options_.pack ?? makeRealPack();
  const setup = registerRealPack(root, pack);
  recordRealReviews(root, setup.pack);
  const release = expectExit(
    runReleaseCommand(realReleaseArgs(pack.id, pack.version), commandOptions(root)),
    0,
  );
  return { pack: setup.pack, version: setup.version, release };
}

export function realRetireArgs(
  packId: string,
  version: number,
  reason = "owner-record:retirement-2026-001",
): string[] {
  return [
    "--pack",
    packId,
    "--version",
    String(version),
    "--actor",
    realReleaseActor,
    "--reason",
    reason,
  ];
}

export function readRealManifest(
  root: string,
  packId: string,
  version: number,
): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      join(root, "artifacts", "manifests", packId, String(version), "manifest.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
}

export function readRealBundle(
  root: string,
  packId: string,
  version: number,
): Record<string, unknown> {
  return JSON.parse(
    readFileSync(
      join(root, "artifacts", "bundles", packId, String(version), "bundle.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
}

export function writeRealBundleBytes(
  root: string,
  packId: string,
  version: number,
  bytes: string,
): void {
  const path = join(root, "artifacts", "bundles", packId, String(version), "bundle.json");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, bytes, "utf8");
}

export function writeRealManifestBytes(
  root: string,
  packId: string,
  version: number,
  bytes: string,
): void {
  const path = join(root, "artifacts", "manifests", packId, String(version), "manifest.json");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, bytes, "utf8");
}

export function realBundleRelativePath(packId: string, version: number): string {
  return `bundles/${packId}/${version}/bundle.json`;
}

export function realLocalizedPath(root: string, packId: string, version: number): string {
  return repositoryLocalizedContentPath(root, packId, version);
}

export function readRealProvenance(root: string, packId: string): ProvenanceEventLog {
  return readProvenanceLog(root, packId);
}

export function writeRealProvenance(root: string, packId: string, log: ProvenanceEventLog): void {
  writeFileSync(
    join(root, "content", "packs", packId, "provenance.json"),
    formatRecord(log),
    "utf8",
  );
}

export { commandClock, commandOptions };
