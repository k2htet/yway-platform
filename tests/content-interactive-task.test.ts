import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { stringify } from "yaml";
import {
  StrictValidationError,
  collectExperimentParityIssues,
  contentDigest,
  eligibilityPath,
  evaluateReleaseGates,
  loadPackState,
  loadVersionAttestations,
  localizedContentSchema,
  packSourceSchema,
  practitionerEligibilitySchema,
  releaseBundleSchema,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  runStatusCommand,
  strictParse,
  type AttestationKind,
  type LocalizedContent,
  type PackSource,
  type ReleaseGateInput,
} from "../content/index.js";
import {
  commandOptions,
  expectExit,
  expectFailureMessage,
  fixtureReviewArgs,
  fixtureReviewOrder,
  localizedContentObject,
  makeRoot,
  packSourceObject,
  releaseBundlePath,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
} from "./content-cli-fixtures.js";

function options(root: string): { repositoryRoot: string; now: () => string } {
  return commandOptions(root);
}

/**
 * The canonical-language task. Every string is synthetic, and each feedback line
 * describes the situation the choice creates rather than judging the person who
 * made it.
 */
function canonicalTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scenario: "A synthetic queue has reached the counter and one customer is waiting.",
    actionPrompt: "Choose what you say first.",
    choices: [
      {
        id: "greet-and-check-stock",
        text: "Greet the customer and check the shelf for what they asked for.",
        feedback: "Checking first can take longer, and the customer sees that you noticed.",
      },
      {
        id: "explain-the-wait",
        text: "Tell the customer there is a wait and ask what they need.",
        feedback: "Asking what they need first keeps the wait short and moves the queue on.",
      },
    ],
    ...overrides,
  };
}

/** The same task in the other language: same choice IDs, same order, its own text. */
function localizedTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scenario: "သရုပ်ဖွဲ့စည်းမှု အခြေအနေဖြစ်ပါသည်။",
    actionPrompt: "သင့်အလိုတိုင်း ပြောမယ်ကို ရွေးပါ။",
    choices: [
      {
        id: "greet-and-check-stock",
        text: "ကြိုဆိုပြီး ပစ္စည်းရှိမှာ စစ်ပါ။",
        feedback: "သရုပ်ဖွဲ့စည်းမှု ဖြစ်ပါသည်။",
      },
      {
        id: "explain-the-wait",
        text: "စောင့်ရှိကြောင်း ပြောပြီး လိုအပ်ချင်း မေးပါ။",
        feedback: "သရုပ်ဖွဲ့စည်းမှု ဖြစ်ပါသည်။",
      },
    ],
    ...overrides,
  };
}

const canonicalExperimentBase = (
  packSourceObject()["experiments"] as Record<string, unknown>[]
)[0]!;
const firstChoice = (canonicalTask()["choices"] as Record<string, unknown>[])[0]!;
const secondChoice = (canonicalTask()["choices"] as Record<string, unknown>[])[1]!;

function canonicalExperiment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...canonicalExperimentBase, interactiveTask: canonicalTask(), ...overrides };
}

/**
 * The Burmese side of the pair.
 *
 * The six required parts deliberately reuse the English base here: these tests
 * are about identifier and order parity, which is blind to prose, and the
 * per-language text difference is asserted on the task itself. Real localized
 * content is authored in Burmese, as the worked template in the operations
 * guide shows.
 */
function localizedExperiment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...canonicalExperimentBase, interactiveTask: localizedTask(), ...overrides };
}

function makeTaskPack(overrides: Record<string, unknown> = {}): PackSource {
  return strictParse(
    packSourceSchema,
    packSourceObject({ experiments: [canonicalExperiment()], ...overrides }),
  );
}

function makeTaskLocalization(
  pack: PackSource,
  overrides: Record<string, unknown> = {},
): LocalizedContent {
  return strictParse(
    localizedContentSchema,
    localizedContentObject(pack, { experiments: [localizedExperiment()], ...overrides }),
  );
}

/**
 * A canonical document and its localization that are in full task parity.
 *
 * `experiments` overrides the experiment list on both sides, which is how a
 * multi-experiment pack is built for the index-alignment tests.
 */
function validPairOf(
  version: number,
  experiments: {
    readonly canonical: readonly Record<string, unknown>[];
    readonly localized: readonly Record<string, unknown>[];
  },
): ContentPair {
  const pack = strictParse(
    packSourceSchema,
    packSourceObject({ version, experiments: [...experiments.canonical] }),
  );
  return {
    pack,
    localized: strictParse(
      localizedContentSchema,
      localizedContentObject(pack, { experiments: [...experiments.localized] }),
    ),
  };
}

interface ContentPair {
  readonly pack: PackSource;
  readonly localized: LocalizedContent;
}

/** A canonical document and its localization that are in full task parity. */
function validPair(version = 1): ContentPair {
  const pack = makeTaskPack({ version });
  return { pack, localized: makeTaskLocalization(pack) };
}

/** One way a canonical document and its localization can disagree. */
interface ParityViolation {
  readonly label: string;
  readonly fragment: string;
  readonly mutate: (pair: ContentPair) => ContentPair;
}

/** Replaces one experiment by its position, leaving every other position alone. */
function withLocalizedExperiment(
  pair: ContentPair,
  experiment: Record<string, unknown>,
  index = 0,
): ContentPair {
  const experiments = [...pair.localized.experiments];
  experiments[index] = experiment as LocalizedContent["experiments"][number];
  return { ...pair, localized: { ...pair.localized, experiments } };
}

/** Replaces one experiment by its position, leaving every other position alone. */
function withCanonicalExperiment(
  pair: ContentPair,
  experiment: Record<string, unknown>,
  index = 0,
): ContentPair {
  const experiments = [...pair.pack.experiments];
  experiments[index] = experiment as PackSource["experiments"][number];
  return { ...pair, pack: { ...pair.pack, experiments } };
}

/** Swaps two experiments, which is an ordering defect rather than a membership one. */
function withReorderedLocalizedExperiments(pair: ContentPair): ContentPair {
  const [first, second] = pair.localized.experiments;
  return {
    ...pair,
    localized: { ...pair.localized, experiments: [second!, first!] } as LocalizedContent,
  };
}

/** Removes a key so the document stays canonicalizable, as a real edit would be. */
function omitKey(record: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}

function localizedTaskWithChoices(choices: readonly Record<string, unknown>[]): unknown {
  return { ...localizedTask(), choices };
}

const parityViolations: readonly ParityViolation[] = [
  {
    label: "a task only the canonical source carries",
    fragment: "is missing the interactive task the canonical source carries",
    mutate: (pair) =>
      withLocalizedExperiment(pair, omitKey(localizedExperiment(), "interactiveTask")),
  },
  {
    label: "a task only the localization carries",
    fragment: "adds an interactive task that the canonical source does not have",
    mutate: (pair) =>
      withCanonicalExperiment(pair, omitKey(canonicalExperiment(), "interactiveTask")),
  },
  {
    label: "an extra choice in one language",
    fragment: "same ordered interactive task choice IDs",
    mutate: (pair) =>
      withLocalizedExperiment(
        pair,
        localizedExperiment({
          interactiveTask: localizedTaskWithChoices([
            (localizedTask()["choices"] as Record<string, unknown>[])[0]!,
            (localizedTask()["choices"] as Record<string, unknown>[])[1]!,
            { id: "ask-a-manager", text: "Synthetic third choice.", feedback: "Synthetic." },
          ]),
        }),
      ),
  },
  {
    label: "a renamed choice ID in one language",
    fragment: "same ordered interactive task choice IDs",
    mutate: (pair) =>
      withLocalizedExperiment(
        pair,
        localizedExperiment({
          interactiveTask: localizedTaskWithChoices([
            (localizedTask()["choices"] as Record<string, unknown>[])[0]!,
            {
              ...(localizedTask()["choices"] as Record<string, unknown>[])[1]!,
              id: "explain-the-delay",
            },
          ]),
        }),
      ),
  },
  {
    label: "reordered choices in one language",
    fragment: "same ordered interactive task choice IDs",
    mutate: (pair) =>
      withLocalizedExperiment(
        pair,
        localizedExperiment({
          interactiveTask: localizedTaskWithChoices([
            (localizedTask()["choices"] as Record<string, unknown>[])[1]!,
            (localizedTask()["choices"] as Record<string, unknown>[])[0]!,
          ]),
        }),
      ),
  },
  {
    label: "a different experiment in the localization",
    fragment: "same ordered experiment IDs",
    mutate: (pair) => withLocalizedExperiment(pair, { ...localizedExperiment(), id: "exp-other" }),
  },
];

function expectStrictFailure(
  run: () => unknown,
  fragment: string,
  label?: string,
): StrictValidationError {
  try {
    run();
  } catch (error) {
    assert.ok(
      error instanceof StrictValidationError,
      `expected StrictValidationError, received ${error instanceof Error ? error.message : String(error)}`,
    );
    assert.ok(
      error.message.includes(fragment),
      `${label === undefined ? "" : `${label}: `}expected error to include "${fragment}", received: ${error.message}`,
    );
    return error;
  }
  assert.fail(
    `${label === undefined ? "" : `${label}: `}expected validation to fail, but it succeeded`,
  );
}

function approveReleaseReviews(root: string, packId: string, version: number): void {
  writeEligibility(root, "fixture-practitioner-one");
  for (const kind of fixtureReviewOrder) {
    if (kind === ("sponsorship-disclosure" satisfies AttestationKind)) {
      continue;
    }
    expectExit(
      runAttestCommand(
        fixtureReviewArgs({ packId, version, kind, outcome: "approved" }),
        options(root),
      ),
      0,
    );
  }
}

function registerPair(root: string, pair: ContentPair): void {
  writePackSource(root, pair.pack);
  writeLocalizedContent(root, pair.localized);
}

test("a task-bearing Pack and its localization load with identical choice IDs", () => {
  const root = makeRoot();
  const pair = validPair();
  registerPair(root, pair);
  expectExit(
    runNewVersionCommand(["--pack", pair.pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );

  const loaded = loadPackState(root, pair.pack.id).localizedContentByVersion.get(pair.pack.version);
  assert.equal(
    loaded?.experiments[0]?.interactiveTask?.choices.map((choice) => choice.id).join(","),
    "greet-and-check-stock,explain-the-wait",
  );
  assert.notEqual(
    loaded?.experiments[0]?.interactiveTask?.scenario,
    pair.pack.experiments[0]?.interactiveTask?.scenario,
    "each language supplies its own scenario text",
  );
  assert.notEqual(
    loaded?.experiments[0]?.interactiveTask?.choices[0]?.text,
    pair.pack.experiments[0]?.interactiveTask?.choices[0]?.text,
    "each language supplies its own choice text",
  );
});

test("the source loader refuses every task-parity violation", () => {
  for (const violation of parityViolations) {
    const root = makeRoot();
    const pair = violation.mutate(validPair());
    registerPair(root, pair);

    expectStrictFailure(
      () => loadPackState(root, pair.pack.id),
      violation.fragment,
      violation.label,
    );
    const registered = runNewVersionCommand(
      ["--pack", pair.pack.id, "--actor", "fixture-author-one"],
      options(root),
    );
    expectExit(registered, 1);
    expectFailureMessage(registered, violation.fragment);
  }
});

test("parity aligns experiments by position, not by search", () => {
  const taskFree = { ...canonicalExperimentBase, id: "exp-watch", title: "Watch a shift" };
  const experiments = {
    canonical: [taskFree, canonicalExperiment()],
    localized: [{ ...taskFree, title: "Watch a shift (Myanmar)" }, localizedExperiment()],
  };
  const valid = validPairOf(1, experiments);
  const root = makeRoot();
  registerPair(root, valid);
  expectExit(
    runNewVersionCommand(["--pack", valid.pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );

  // Both experiments are present in both languages, so only their order differs.
  const reordered = withReorderedLocalizedExperiments(valid);
  assert.deepEqual(
    reordered.localized.experiments.map((experiment) => experiment.id),
    ["exp-talk-to-worker", "exp-watch"],
    "the fixture must differ from the source by order alone",
  );
  const reorderedRoot = makeRoot();
  registerPair(reorderedRoot, reordered);
  expectStrictFailure(
    () => loadPackState(reorderedRoot, reordered.pack.id),
    "same ordered experiment IDs",
    "reordered experiments",
  );

  // A task defect on the second experiment is caught even though the first is
  // clean, which an implementation that only inspected position 0 would miss.
  const secondOnly = withLocalizedExperiment(
    valid,
    omitKey(localizedExperiment(), "interactiveTask"),
    1,
  );
  const issues = collectExperimentParityIssues(
    secondOnly.pack.experiments,
    secondOnly.localized.experiments,
    "localized content",
  );
  assert.equal(issues.length, 1, "exactly the second experiment's task is reported");
  assert.equal(JSON.stringify(issues[0]?.path), JSON.stringify([1, "interactiveTask"]));
  assert.ok(
    (issues[0]?.message ?? "").includes(
      'experiment "exp-talk-to-worker" is missing the interactive task',
    ),
    `expected the second experiment's defect, received: ${issues[0]?.message ?? "no issue"}`,
  );
  assert.deepEqual(
    collectExperimentParityIssues(
      valid.pack.experiments,
      valid.localized.experiments,
      "localized content",
    ),
    [],
    "the in-parity multi-experiment pair reports nothing",
  );
});

test("the release gate refuses a directly supplied pair that is not in task parity", () => {
  const root = makeRoot();
  const pair = validPair();
  registerPair(root, pair);
  expectExit(
    runNewVersionCommand(["--pack", pair.pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  approveReleaseReviews(root, pair.pack.id, pair.pack.version);

  const state = loadPackState(root, pair.pack.id);
  const valid: ReleaseGateInput = {
    pack: pair.pack,
    localizedContent: state.localizedContentByVersion.get(pair.pack.version)!,
    provenanceLog: state.provenanceLog!,
    attestations: loadVersionAttestations(root, pair.pack.id, pair.pack.version),
    practitionerEligibility: strictParse(
      practitionerEligibilitySchema,
      JSON.parse(
        readFileSync(eligibilityPath(root, "fixture-practitioner-one"), "utf8"),
      ) as unknown,
    ),
    evaluateAt: "2026-09-24T00:00:00Z",
  };
  assert.equal(evaluateReleaseGates(valid).localizationApproved, true);
  for (const violation of parityViolations) {
    const mutated = violation.mutate(pair);
    expectStrictFailure(
      () =>
        evaluateReleaseGates({
          ...valid,
          pack: mutated.pack,
          localizedContent: mutated.localized,
        }),
      violation.fragment,
      violation.label,
    );
  }
});

test("the release bundle schema refuses a bundle whose two documents are not in task parity", () => {
  const root = makeRoot();
  const pair = validPair();
  registerPair(root, pair);
  expectExit(
    runNewVersionCommand(["--pack", pair.pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  approveReleaseReviews(root, pair.pack.id, pair.pack.version);
  expectExit(
    runReleaseCommand(
      [
        "--pack",
        pair.pack.id,
        "--version",
        String(pair.pack.version),
        "--actor",
        "fixture-operator-one",
      ],
      options(root),
    ),
    0,
  );

  const bundle = JSON.parse(
    readFileSync(releaseBundlePath(root, pair.pack.id, pair.pack.version), "utf8"),
  ) as { pack: PackSource; localizedContent: LocalizedContent } & Record<string, unknown>;
  const validated = strictParse(releaseBundleSchema, bundle);
  assert.equal(
    validated.pack.experiments[0]?.interactiveTask?.choices.length,
    2,
    "the released bundle carries the canonical task",
  );
  assert.equal(
    validated.localizedContent.experiments[0]?.interactiveTask?.choices.length,
    2,
    "the released bundle carries the Burmese task",
  );

  for (const violation of parityViolations) {
    const mutated = violation.mutate({
      pack: bundle.pack,
      localized: bundle.localizedContent,
    });
    expectStrictFailure(
      () =>
        strictParse(releaseBundleSchema, {
          ...bundle,
          pack: mutated.pack,
          localizedContent: mutated.localized,
        }),
      violation.fragment,
      violation.label,
    );
  }
});

const canonicalTaskEdits: readonly { readonly label: string; readonly task: () => unknown }[] = [
  {
    label: "the scenario",
    task: () => canonicalTask({ scenario: "A different synthetic situation entirely." }),
  },
  {
    label: "the action prompt",
    task: () => canonicalTask({ actionPrompt: "Choose something else." }),
  },
  {
    label: "a choice's text",
    task: () => ({
      ...canonicalTask(),
      choices: [{ ...firstChoice, text: "Greet and wait." }, secondChoice],
    }),
  },
  {
    label: "a choice's feedback",
    task: () => ({
      ...canonicalTask(),
      choices: [{ ...firstChoice, feedback: "A different synthetic observation." }, secondChoice],
    }),
  },
];

test("editing a task under a registered version fails the source digest check", () => {
  for (const edit of canonicalTaskEdits) {
    const root = makeRoot();
    const pair = validPair();
    registerPair(root, pair);
    expectExit(
      runNewVersionCommand(
        ["--pack", pair.pack.id, "--actor", "fixture-author-one"],
        options(root),
      ),
      0,
    );

    const edited = makeTaskPack({
      version: 1,
      experiments: [canonicalExperiment({ interactiveTask: edit.task() })],
    });
    assert.notEqual(
      contentDigest(edited),
      contentDigest(pair.pack),
      `editing ${edit.label} must change the canonical digest`,
    );
    writeFileSync(
      join(root, "content", "packs", pair.pack.id, "1.yaml"),
      stringify(edited),
      "utf8",
    );
    writeFileSync(
      join(root, "content", "packs", pair.pack.id, "2.yaml"),
      stringify(makeTaskPack({ version: 2 })),
      "utf8",
    );

    const result = runNewVersionCommand(
      ["--pack", pair.pack.id, "--actor", "fixture-author-one", "--from", "1"],
      options(root),
    );
    expectExit(result, 1);
    expectFailureMessage(result, "does not match the source-derived digest");
  }
});

test("editing a task under a registered version fails the localized digest check", () => {
  const localizedChoices = localizedTask()["choices"] as Record<string, unknown>[];
  const localizedEdits: readonly { readonly label: string; readonly task: () => unknown }[] = [
    { label: "the scenario", task: () => localizedTask({ scenario: "အခြေအနေတစ်မျိုး။" }) },
    { label: "the action prompt", task: () => localizedTask({ actionPrompt: "အခြားတစ်ခု။" }) },
    {
      label: "a choice's text",
      task: () => ({
        ...localizedTask(),
        choices: [{ ...localizedChoices[0]!, text: "အခြား။" }, localizedChoices[1]!],
      }),
    },
    {
      label: "a choice's feedback",
      task: () => ({
        ...localizedTask(),
        choices: [{ ...localizedChoices[0]!, feedback: "အခြား အဖြေပါသည်။" }, localizedChoices[1]!],
      }),
    },
  ];

  for (const edit of localizedEdits) {
    const root = makeRoot();
    const pair = validPair();
    registerPair(root, pair);
    expectExit(
      runNewVersionCommand(
        ["--pack", pair.pack.id, "--actor", "fixture-author-one"],
        options(root),
      ),
      0,
    );

    const edited = makeTaskLocalization(pair.pack, {
      experiments: [localizedExperiment({ interactiveTask: edit.task() })],
    });
    assert.notEqual(
      contentDigest(edited),
      contentDigest(pair.localized),
      `editing ${edit.label} must change the localized digest`,
    );
    writeLocalizedContent(root, edited);

    const result = runStatusCommand(
      ["--pack", pair.pack.id, "--version", String(pair.pack.version)],
      options(root),
    );
    expectExit(result, 1);
    expectFailureMessage(result, "localization was tampered with or events bind stale content");
  }
});

test("a new version cannot reuse the previous version's task reviews, and fresh ones can pass", () => {
  const root = makeRoot();
  const first = validPair(1);
  registerPair(root, first);
  expectExit(
    runNewVersionCommand(["--pack", first.pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  approveReleaseReviews(root, first.pack.id, 1);

  // Version 2 carries its own task text, so the released artifact can be shown
  // to be the version 2 task under fresh review rather than version 1's.
  const versionTwoFeedback = "A synthetic observation that only version 2 carries.";
  const secondTask = canonicalTask({
    choices: [{ ...firstChoice, feedback: versionTwoFeedback }, secondChoice],
  });
  const secondTaskBurmese = localizedTask({
    choices: [
      {
        ...(localizedTask()["choices"] as Record<string, unknown>[])[0]!,
        feedback: "ဒီသရုပ်မှတ်တမ်းသည် မူတန်း ၂ တွင်သာ ရှိပါသည်။",
      },
      (localizedTask()["choices"] as Record<string, unknown>[])[1]!,
    ],
  });
  const secondPack = makeTaskPack({
    version: 2,
    summary: "The same synthetic pack with revised prose.",
    experiments: [canonicalExperiment({ interactiveTask: secondTask })],
  });
  const secondLocalized = makeTaskLocalization(secondPack, {
    experiments: [localizedExperiment({ interactiveTask: secondTaskBurmese })],
  });
  registerPair(root, { pack: secondPack, localized: secondLocalized });
  expectExit(
    runNewVersionCommand(
      ["--pack", first.pack.id, "--actor", "fixture-author-one", "--from", "1"],
      options(root),
    ),
    0,
  );

  assert.equal(
    loadVersionAttestations(root, first.pack.id, 2).length,
    0,
    "the version 1 reviews are not filed under version 2",
  );
  const reused = runReleaseCommand(
    ["--pack", first.pack.id, "--version", "2", "--actor", "fixture-operator-one"],
    options(root),
  );
  expectExit(reused, 1);
  expectFailureMessage(
    reused,
    "release requires standing practitioner-reviewed or artifact-eligible status",
  );

  const state = loadPackState(root, first.pack.id);
  expectStrictFailure(
    () =>
      evaluateReleaseGates({
        pack: secondPack,
        localizedContent: state.localizedContentByVersion.get(2)!,
        provenanceLog: state.provenanceLog!,
        attestations: loadVersionAttestations(root, first.pack.id, 1),
        practitionerEligibility: strictParse(
          practitionerEligibilitySchema,
          JSON.parse(
            readFileSync(eligibilityPath(root, "fixture-practitioner-one"), "utf8"),
          ) as unknown,
        ),
        evaluateAt: "2026-09-24T00:00:00Z",
      }),
    "does not cover exact version scope",
  );

  approveReleaseReviews(root, first.pack.id, 2);
  expectExit(
    runReleaseCommand(
      ["--pack", first.pack.id, "--version", "2", "--actor", "fixture-operator-one"],
      options(root),
    ),
    0,
  );

  const bundle = JSON.parse(readFileSync(releaseBundlePath(root, first.pack.id, 2), "utf8")) as {
    pack: PackSource;
    localizedContent: LocalizedContent;
  };
  assert.equal(
    bundle.pack.experiments[0]?.interactiveTask?.choices[0]?.feedback,
    versionTwoFeedback,
    "the released canonical task is the version 2 task under fresh review",
  );
  assert.equal(
    bundle.localizedContent.experiments[0]?.interactiveTask?.choices[0]?.feedback,
    "ဒီသရုပ်မှတ်တမ်းသည် မူတန်း ၂ တွင်သာ ရှိပါသည်။",
    "the released Burmese task is the version 2 task, in its own language",
  );
});
