import type { StrictValidationIssue } from "./common.js";

/**
 * The part of an experiment that must match across two languages.
 *
 * This is deliberately structural rather than a `PackSource`/`LocalizedContent`
 * pair: every paired-content boundary — the source loader, the release gates,
 * and the release bundle schema — hands the same experiment lists to the same
 * check, so the rules cannot drift apart per boundary.
 */
export interface ParityExperiment {
  readonly id: string;
  readonly interactiveTask?: {
    readonly choices: readonly { readonly id: string }[];
  };
}

function sameOrderedValues<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Collects every way a canonical document and its localization can disagree
 * about the identity and authored reading order of an experiment and of its
 * optional interactive task.
 *
 * A single document's schema cannot express any of this: comparing identifiers
 * across two documents is not a property of either one. The runtime check is
 * therefore the only place the rule is enforced, which is why it is shared
 * rather than reimplemented at each boundary.
 *
 * Text and feedback are language-specific by design and are never compared
 * here. What must agree is which experiments exist, in what order, and which
 * task choices each carries in what order. Choice order is authored display
 * order, so a reordered or dropped choice would silently change which response
 * a recorded selection refers to.
 *
 * `label` names the localized side of the comparison, so one rule reads
 * correctly from the source loader, the release gate, and the release bundle.
 */
export function collectExperimentParityIssues(
  canonicalExperiments: readonly ParityExperiment[],
  localizedExperiments: readonly ParityExperiment[],
  label: string,
  path: readonly (string | number)[] = [],
): StrictValidationIssue[] {
  const canonicalIds = canonicalExperiments.map((experiment) => experiment.id);
  const localizedIds = localizedExperiments.map((experiment) => experiment.id);
  const issues: StrictValidationIssue[] = [];

  if (!sameOrderedValues(canonicalIds, localizedIds)) {
    issues.push({
      path: [...path],
      message: `${label} must cover the same ordered experiment IDs as the canonical source (canonical: ${canonicalIds.join(", ") || "none"}; localized: ${localizedIds.join(", ") || "none"})`,
    });
  }

  for (const [index, canonical] of canonicalExperiments.entries()) {
    const localized = localizedExperiments[index];
    if (localized === undefined || localized.id !== canonical.id) {
      continue;
    }
    const canonicalTask = canonical.interactiveTask;
    const localizedTask = localized.interactiveTask;
    if ((canonicalTask === undefined) !== (localizedTask === undefined)) {
      issues.push({
        path: [...path, index, "interactiveTask"],
        message:
          canonicalTask === undefined
            ? `${label} experiment "${canonical.id}" adds an interactive task that the canonical source does not have; an interactive task must be present in both languages or in neither`
            : `${label} experiment "${canonical.id}" is missing the interactive task the canonical source carries; an interactive task must be present in both languages or in neither`,
      });
      continue;
    }
    if (canonicalTask === undefined || localizedTask === undefined) {
      continue;
    }
    const canonicalChoiceIds = canonicalTask.choices.map((choice) => choice.id);
    const localizedChoiceIds = localizedTask.choices.map((choice) => choice.id);
    if (!sameOrderedValues(canonicalChoiceIds, localizedChoiceIds)) {
      issues.push({
        path: [...path, index, "interactiveTask", "choices"],
        message: `${label} experiment "${canonical.id}" must carry the same ordered interactive task choice IDs as the canonical source (canonical: ${canonicalChoiceIds.join(", ")}; localized: ${localizedChoiceIds.join(", ")})`,
      });
    }
  }

  return issues;
}
