import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const canonicalRepositoryRoot = realpathSync(repositoryRoot);

const validStageStatuses = new Set(["COMPLETE", "ACTIVE", "NEXT", "PLANNED", "BLOCKED"]);

const roadmapPath = resolve(repositoryRoot, "docs/roadmap/ROADMAP.md");
const stageIndexPath = resolve(repositoryRoot, "docs/roadmap/STAGE-INDEX.md");
const activePlansDirectory = resolve(repositoryRoot, "docs/exec-plans/active");
const completedPlansDirectory = resolve(repositoryRoot, "docs/exec-plans/completed");

const rootMarkdownFiles = ["AGENTS.md", "CONTRIBUTING.md", "README.md"];
const markdownScanDirectories = ["docs", ".github"];
const maximumMarkdownFileBytes = 2 * 1024 * 1024;
const maximumMarkdownTotalBytes = 32 * 1024 * 1024;
const maximumMarkdownFiles = 1_000;
const maximumMarkdownDepth = 32;
const maximumTraversalEntries = 10_000;

type PlanPlacement = "active" | "completed";
type PlanStatus = "ACTIVE" | "COMPLETE";

interface MarkdownTarget {
  line: number;
  target: string;
}

interface TextRange {
  start: number;
  end: number;
}

function findInlineCodeRanges(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "`") {
      index += 1;
      continue;
    }

    let openLength = 0;
    while (text[index + openLength] === "`") {
      openLength += 1;
    }

    let cursor = index + openLength;
    let closingIndex = -1;
    while (cursor < text.length) {
      if (text[cursor] !== "`") {
        cursor += 1;
        continue;
      }
      let closeLength = 0;
      while (text[cursor + closeLength] === "`") {
        closeLength += 1;
      }
      if (closeLength === openLength) {
        closingIndex = cursor;
        break;
      }
      cursor += closeLength;
    }

    if (closingIndex === -1) {
      index += openLength;
    } else {
      ranges.push({ start: index, end: closingIndex + openLength });
      index = closingIndex + openLength;
    }
  }

  return ranges;
}

function stripInlineCodeRuns(text: string): string {
  const characters = text.split("");
  for (const range of findInlineCodeRanges(text)) {
    for (let index = range.start; index < range.end; index += 1) {
      if (characters[index] !== "\n") {
        characters[index] = " ";
      }
    }
  }
  return characters.join("");
}

function stripCodeFences(text: string): string {
  let activeFence: { character: "`" | "~"; length: number } | undefined;

  return text
    .split("\n")
    .map((line) => {
      if (activeFence !== undefined) {
        const closing = /^( {0,3})(`{3,}|~{3,})[ \t]*$/.exec(line);
        if (
          closing?.[2]?.[0] === activeFence.character &&
          closing[2].length >= activeFence.length
        ) {
          activeFence = undefined;
        }
        return "";
      }

      const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
      const fenceRun = opening?.[2];
      if (fenceRun !== undefined) {
        const character = fenceRun[0] as "`" | "~";
        const info = opening?.[3] ?? "";
        if (character === "~" || !info.includes("`")) {
          activeFence = { character, length: fenceRun.length };
          return "";
        }
      }

      if (/^(?: {4}|\t)/.test(line)) {
        return "";
      }

      return line;
    })
    .join("\n");
}

function stripCodeSegments(text: string): string {
  return stripInlineCodeRuns(stripCodeFences(text));
}

function pathIsInside(basePath: string, targetPath: string, allowBase = false): boolean {
  const relativePath = relative(basePath, targetPath);
  return (
    (allowBase || relativePath.length > 0) &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function requireAtMost(value: number, limit: number, label: string): void {
  if (value > limit) {
    throw new Error(`${label} exceeds ${limit}`);
  }
}

function readBoundedUtf8(
  filePath: string,
  label: string,
  maximumBytes = maximumMarkdownFileBytes,
): string {
  const statistics = statSync(filePath);
  if (!statistics.isFile()) {
    throw new Error(`${label} is not a regular file`);
  }
  requireAtMost(statistics.size, maximumBytes, `${label} size`);
  return readFileSync(filePath, "utf8");
}

function canonicalGovernedFile(filePath: string, label: string): string {
  if (lstatSync(filePath).isSymbolicLink()) {
    throw new Error(`${label} must not be a symbolic link`);
  }
  const canonicalPath = realpathSync(filePath);
  if (!pathIsInside(canonicalRepositoryRoot, canonicalPath)) {
    throw new Error(`${label} resolves outside the repository`);
  }
  if (!statSync(canonicalPath).isFile()) {
    throw new Error(`${label} is not a regular file`);
  }
  return canonicalPath;
}

function canonicalGovernedDirectory(directoryPath: string, label: string): string {
  if (lstatSync(directoryPath).isSymbolicLink()) {
    throw new Error(`${label} must not be a symbolic link`);
  }
  const canonicalPath = realpathSync(directoryPath);
  if (!pathIsInside(canonicalRepositoryRoot, canonicalPath)) {
    throw new Error(`${label} resolves outside the repository`);
  }
  if (!statSync(canonicalPath).isDirectory()) {
    throw new Error(`${label} is not a directory`);
  }
  return canonicalPath;
}

function extractMarkdownTargets(text: string): MarkdownTarget[] {
  const stripped = stripCodeSegments(text);
  const targets: MarkdownTarget[] = [];

  stripped.split("\n").forEach((line, index) => {
    for (let cursor = 0; cursor < line.length - 1; cursor += 1) {
      if (line[cursor] !== "]" || line[cursor + 1] !== "(") {
        continue;
      }
      const parsed = parseInlineLinkDestination(line, cursor + 2);
      if (parsed !== undefined) {
        targets.push({ line: index + 1, target: parsed.target });
        cursor = parsed.end;
      }
    }

    const definition = /^\[[^\]]+\]:\s+(?:<([^>]+)>|(\S+))/.exec(line);
    const definitionTarget = definition?.[1] ?? definition?.[2];
    if (definitionTarget !== undefined) {
      targets.push({ line: index + 1, target: definitionTarget });
    }
  });

  return targets;
}

function parseInlineLinkDestination(
  line: string,
  start: number,
): { target: string; end: number } | undefined {
  let cursor = start;
  while (line[cursor] === " " || line[cursor] === "\t") {
    cursor += 1;
  }

  let target = "";
  if (line[cursor] === "<") {
    cursor += 1;
    while (cursor < line.length && line[cursor] !== ">") {
      if (line[cursor] === "]" && line[cursor + 1] === "(") {
        return undefined;
      }
      target += line[cursor];
      cursor += 1;
    }
    if (line[cursor] !== ">") {
      return undefined;
    }
    cursor += 1;
  } else {
    let depth = 0;
    while (cursor < line.length) {
      const character = line[cursor];
      if (character === "\\" && cursor + 1 < line.length) {
        target += line[cursor + 1];
        cursor += 2;
        continue;
      }
      if (character === "(") {
        depth += 1;
        if (depth > 16) {
          return undefined;
        }
      } else if (character === ")") {
        if (depth === 0) {
          break;
        }
        depth -= 1;
      } else if ((character === " " || character === "\t") && depth === 0) {
        break;
      }
      target += character;
      cursor += 1;
    }
    if (depth !== 0) {
      return undefined;
    }
  }

  if (target.length === 0) {
    return undefined;
  }
  while (line[cursor] === " " || line[cursor] === "\t") {
    cursor += 1;
  }
  if (line[cursor] === '"' || line[cursor] === "'") {
    const quote = line[cursor];
    cursor += 1;
    while (cursor < line.length && line[cursor] !== quote) {
      cursor += 1;
    }
    if (line[cursor] !== quote) {
      return undefined;
    }
    cursor += 1;
    while (line[cursor] === " " || line[cursor] === "\t") {
      cursor += 1;
    }
  }
  return line[cursor] === ")" ? { target, end: cursor } : undefined;
}

function checkMarkdownLinkTarget(
  sourcePath: string,
  line: number,
  target: string,
  repositoryBase = repositoryRoot,
  canonicalBase = canonicalRepositoryRoot,
): string | undefined {
  if (target.startsWith("#")) {
    return undefined;
  }
  if (/^(?:https?:|mailto:|tel:)/i.test(target)) {
    return undefined;
  }

  const pathPart = target.split("#")[0] ?? "";
  if (pathPart.length === 0) {
    return undefined;
  }

  let decodedPath = pathPart;
  try {
    decodedPath = decodeURIComponent(pathPart);
  } catch {
    // Keep the raw path when it is not valid percent-encoding.
  }

  const resolvedTarget = resolve(dirname(sourcePath), decodedPath);
  const relativeToRoot = relative(repositoryBase, resolvedTarget);
  if (
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${sep}`) ||
    isAbsolute(relativeToRoot)
  ) {
    const displayPath = relative(repositoryBase, sourcePath).split("\\").join("/");
    return `${displayPath}:${line}: link target "${target}" resolves outside the repository`;
  }
  if (!existsSync(resolvedTarget)) {
    const displayPath = relative(repositoryBase, sourcePath).split("\\").join("/");
    return `${displayPath}:${line}: broken in-repository link target "${target}"`;
  }
  if (!pathIsInside(canonicalBase, realpathSync(resolvedTarget), true)) {
    const displayPath = relative(repositoryBase, sourcePath).split("\\").join("/");
    return `${displayPath}:${line}: link target "${target}" resolves outside the repository through a symlink`;
  }

  return undefined;
}

function collectMarkdownFiles(root: string, canonicalRoot = canonicalRepositoryRoot): string[] {
  const files: string[] = [];
  let traversalEntries = 0;

  function addFile(filePath: string): void {
    files.push(filePath);
    requireAtMost(files.length, maximumMarkdownFiles, "governed Markdown file count");
  }

  function walk(directory: string, depth: number): void {
    requireAtMost(depth, maximumMarkdownDepth, "governed Markdown traversal depth");
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      traversalEntries += 1;
      requireAtMost(
        traversalEntries,
        maximumTraversalEntries,
        "governed Markdown traversal entries",
      );
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          walk(entryPath, depth + 1);
        }
      } else if (entry.isSymbolicLink()) {
        const canonicalEntry = realpathSync(entryPath);
        if (statSync(canonicalEntry).isDirectory()) {
          throw new Error(
            `${relative(repositoryRoot, entryPath)} is a symlinked governed directory`,
          );
        }
        if (entry.name.endsWith(".md")) {
          addFile(entryPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        addFile(entryPath);
      }
    }
  }

  for (const relativeDirectory of markdownScanDirectories) {
    const directory = resolve(root, relativeDirectory);
    if (lstatSync(directory, { throwIfNoEntry: false }) !== undefined) {
      if (lstatSync(directory).isSymbolicLink()) {
        throw new Error(`${relativeDirectory}/ must not be a symbolic link`);
      }
      if (!statSync(directory).isDirectory()) {
        throw new Error(`${relativeDirectory}/ is not a directory`);
      }
      if (!pathIsInside(canonicalRoot, realpathSync(directory))) {
        throw new Error(`${relativeDirectory}/ resolves outside the repository through a symlink`);
      }
      walk(directory, 0);
    }
  }

  for (const relativeFile of rootMarkdownFiles) {
    const filePath = resolve(root, relativeFile);
    if (lstatSync(filePath, { throwIfNoEntry: false }) !== undefined) {
      addFile(filePath);
    }
  }

  return files.sort();
}

function checkMarkdownLinks(
  files: readonly string[],
  repositoryBase = repositoryRoot,
  canonicalBase = canonicalRepositoryRoot,
): string[] {
  const failures: string[] = [];
  let totalBytes = 0;

  for (const filePath of files) {
    const displayPath = relative(repositoryBase, filePath).split("\\").join("/");
    let canonicalPath: string;
    try {
      canonicalPath = realpathSync(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${displayPath}: source file cannot be resolved (${message})`);
      continue;
    }
    if (!pathIsInside(canonicalBase, canonicalPath)) {
      failures.push(
        `${displayPath}: source file resolves outside the repository through a symlink`,
      );
      continue;
    }
    totalBytes += statSync(canonicalPath).size;
    try {
      requireAtMost(totalBytes, maximumMarkdownTotalBytes, "governed Markdown total size");
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      break;
    }
    const text = readBoundedUtf8(canonicalPath, displayPath);
    for (const { line, target } of extractMarkdownTargets(text)) {
      const failure = checkMarkdownLinkTarget(
        filePath,
        line,
        target,
        repositoryBase,
        canonicalBase,
      );
      if (failure !== undefined) {
        failures.push(failure);
      }
    }
  }

  return failures;
}

interface ParsedStageStatuses {
  statuses: Map<number, string>;
  duplicates: number[];
  duplicateStatuses: number[];
}

function parseStageIndexStatuses(text: string): ParsedStageStatuses {
  const statuses = new Map<number, string>();
  const duplicates: number[] = [];
  const duplicateStatuses: number[] = [];

  for (const line of text.split("\n")) {
    const row = /^\|\s*(\d+)\s*\|[^|\n]*\|\s*([^|\n]*)\|/.exec(line);
    if (row?.[1] !== undefined && row[2] !== undefined) {
      const stageNumber = Number(row[1]);
      if (statuses.has(stageNumber)) {
        duplicates.push(stageNumber);
      } else {
        statuses.set(stageNumber, row[2].trim().toUpperCase());
      }
    }
  }

  return { statuses, duplicates, duplicateStatuses };
}

function extractRoadmapStatusDeclarations(section: string): string[] {
  return [...section.matchAll(/^- \*\*Status:\*\*\s*(.*?)\s*$/gm)].map((match) =>
    (match[1] ?? "").trim().replace(/\.$/, "").trim().toUpperCase(),
  );
}

function parseRoadmapStatuses(text: string): ParsedStageStatuses {
  const statuses = new Map<number, string>();
  const duplicates: number[] = [];
  const duplicateStatuses: number[] = [];
  const headings = [...text.matchAll(/^## Stage (\d+) — .*$/gm)];
  const headingCounts = new Map<number, number>();

  for (const heading of headings) {
    const stageNumber = heading[1];
    if (stageNumber !== undefined) {
      const stage = Number(stageNumber);
      headingCounts.set(stage, (headingCounts.get(stage) ?? 0) + 1);
    }
  }

  for (const [stage, count] of headingCounts) {
    if (count > 1) {
      duplicates.push(stage);
    }
  }

  headings.forEach((heading, index) => {
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? text.length;
    const section = text.slice(start, end);
    const statusDeclarations = extractRoadmapStatusDeclarations(section);
    const status = statusDeclarations[0];
    const stageNumber = heading[1];

    if (stageNumber !== undefined && statusDeclarations.length > 1) {
      duplicateStatuses.push(Number(stageNumber));
    }
    if (stageNumber !== undefined && status !== undefined) {
      const parsedStage = Number(stageNumber);
      if (!statuses.has(parsedStage)) {
        statuses.set(parsedStage, status);
      }
    }
  });

  return { statuses, duplicates, duplicateStatuses };
}

function checkRoadmapConsistency(rawRoadmapText: string, rawStageIndexText: string): string[] {
  const failures: string[] = [];
  const roadmapParsed = parseRoadmapStatuses(stripCodeSegments(rawRoadmapText));
  const stageIndexParsed = parseStageIndexStatuses(stripCodeSegments(rawStageIndexText));
  const roadmapStatuses = roadmapParsed.statuses;
  const stageIndexStatuses = stageIndexParsed.statuses;

  for (const stage of roadmapParsed.duplicates) {
    failures.push(`Stage ${stage}: duplicate stage declaration in ROADMAP.md`);
  }
  for (const stage of stageIndexParsed.duplicates) {
    failures.push(`Stage ${stage}: duplicate stage row in STAGE-INDEX.md`);
  }
  for (const stage of roadmapParsed.duplicateStatuses) {
    failures.push(`Stage ${stage}: duplicate status declarations in ROADMAP.md`);
  }

  const stageNumbers = [...new Set([...roadmapStatuses.keys(), ...stageIndexStatuses.keys()])].sort(
    (left, right) => left - right,
  );

  if (stageNumbers.length === 0) {
    failures.push("no stages were parsed from ROADMAP.md or STAGE-INDEX.md");
    return failures;
  }

  for (const stage of stageNumbers) {
    const roadmapStatus = roadmapStatuses.get(stage);
    const stageIndexStatus = stageIndexStatuses.get(stage);

    if (roadmapStatus === undefined) {
      failures.push(`Stage ${stage}: present in STAGE-INDEX.md but missing from ROADMAP.md`);
      continue;
    }
    if (stageIndexStatus === undefined) {
      failures.push(`Stage ${stage}: present in ROADMAP.md but missing from STAGE-INDEX.md`);
      continue;
    }
    if (!validStageStatuses.has(roadmapStatus)) {
      failures.push(`Stage ${stage}: ROADMAP.md status "${roadmapStatus}" is not a known status`);
    }
    if (!validStageStatuses.has(stageIndexStatus)) {
      failures.push(
        `Stage ${stage}: STAGE-INDEX.md status "${stageIndexStatus}" is not a known status`,
      );
    }
    if (roadmapStatus !== stageIndexStatus) {
      failures.push(
        `Stage ${stage}: ROADMAP.md status "${roadmapStatus}" disagrees with STAGE-INDEX.md status "${stageIndexStatus}"`,
      );
    }
  }

  return failures;
}

function classifyPlanStatusWord(word: string): PlanStatus | undefined {
  if (/^active/i.test(word)) {
    return "ACTIVE";
  }
  if (/^complete/i.test(word)) {
    return "COMPLETE";
  }
  return undefined;
}

interface DeclaredPlanStatuses {
  statuses: PlanStatus[];
  declarationCount: number;
}

function extractDeclaredPlanStatuses(rawText: string): DeclaredPlanStatuses {
  const text = stripCodeSegments(rawText);
  const statuses: PlanStatus[] = [];
  const statusHeadings = [...text.matchAll(/^## Status[ \t]*$/gm)];
  const firstSectionHeading = /^## /m.exec(text);
  const preamble =
    firstSectionHeading?.index !== undefined ? text.slice(0, firstSectionHeading.index) : text;
  let declarationCount = statusHeadings.length;

  for (const statusHeading of statusHeadings) {
    if (statusHeading.index === undefined) {
      continue;
    }
    const afterHeading = text.slice(statusHeading.index + statusHeading[0].length);
    const nextHeading = /^## /m.exec(afterHeading);
    const block =
      nextHeading?.index !== undefined ? afterHeading.slice(0, nextHeading.index) : afterHeading;
    const firstLine = block
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (firstLine !== undefined) {
      const status = classifyPlanStatusWord(firstLine);
      if (status !== undefined) {
        statuses.push(status);
      }
    }
  }

  for (const match of preamble.matchAll(/\*\*Status:\*\*[^A-Za-z]*([A-Za-z]+)/g)) {
    declarationCount += 1;
    const status = classifyPlanStatusWord(match[1] ?? "");
    if (status !== undefined) {
      statuses.push(status);
    }
  }

  const completedDeclarations = [...preamble.matchAll(/\*\*Completed:\*\*/g)];
  statuses.push(...completedDeclarations.map(() => "COMPLETE" as const));
  declarationCount += completedDeclarations.length;

  return { statuses, declarationCount };
}

function checkExecPlanPlacement(placement: PlanPlacement, text: string): string[] {
  const declared = extractDeclaredPlanStatuses(text);
  const failures: string[] = [];

  if (declared.declarationCount > 1) {
    failures.push(`plan declares ${declared.declarationCount} status declarations; expected one`);
  }
  if (declared.statuses.length < declared.declarationCount) {
    failures.push("plan contains an unrecognized status declaration");
  }

  if (placement === "active") {
    if (declared.statuses.length === 0) {
      failures.push("active plan declares no status; expected ACTIVE");
    } else if (!declared.statuses.includes("ACTIVE")) {
      failures.push(`active plan declares ${declared.statuses.join("/")}; expected ACTIVE`);
    }
    if (declared.statuses.includes("COMPLETE")) {
      failures.push("active plan must not claim COMPLETE or Completed");
    }
    return failures;
  }

  if (declared.statuses.includes("ACTIVE")) {
    failures.push("completed plan must not claim ACTIVE");
  }
  return failures;
}

function listPlanFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  canonicalGovernedDirectory(directory, relative(repositoryRoot, directory));

  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".md"))
    .map((entry) => join(directory, entry.name))
    .sort();
  requireAtMost(files.length, maximumMarkdownFiles, "ExecPlan file count");
  return files;
}

function checkExecPlanDirectories(): string[] {
  const failures: string[] = [];
  let totalBytes = 0;
  const canonicalActiveDirectory = canonicalGovernedDirectory(
    activePlansDirectory,
    "docs/exec-plans/active/",
  );
  const canonicalCompletedDirectory = canonicalGovernedDirectory(
    completedPlansDirectory,
    "docs/exec-plans/completed/",
  );

  for (const filePath of listPlanFiles(activePlansDirectory)) {
    const displayPath = relative(repositoryRoot, filePath).split("\\").join("/");
    const canonicalPath = realpathSync(filePath);
    if (!pathIsInside(canonicalRepositoryRoot, canonicalPath)) {
      failures.push(`${displayPath}: plan resolves outside the repository through a symlink`);
      continue;
    }
    if (!pathIsInside(canonicalActiveDirectory, canonicalPath)) {
      failures.push(`${displayPath}: active plan resolves outside active/ through a symlink`);
      continue;
    }
    totalBytes += statSync(canonicalPath).size;
    try {
      requireAtMost(totalBytes, maximumMarkdownTotalBytes, "ExecPlan total size");
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      break;
    }
    for (const failure of checkExecPlanPlacement(
      "active",
      readBoundedUtf8(canonicalPath, displayPath),
    )) {
      failures.push(`${displayPath}: ${failure}`);
    }
  }

  for (const filePath of listPlanFiles(completedPlansDirectory)) {
    const displayPath = relative(repositoryRoot, filePath).split("\\").join("/");
    const canonicalPath = realpathSync(filePath);
    if (!pathIsInside(canonicalRepositoryRoot, canonicalPath)) {
      failures.push(`${displayPath}: plan resolves outside the repository through a symlink`);
      continue;
    }
    if (!pathIsInside(canonicalCompletedDirectory, canonicalPath)) {
      failures.push(`${displayPath}: completed plan resolves outside completed/ through a symlink`);
      continue;
    }
    totalBytes += statSync(canonicalPath).size;
    try {
      requireAtMost(totalBytes, maximumMarkdownTotalBytes, "ExecPlan total size");
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      break;
    }
    for (const failure of checkExecPlanPlacement(
      "completed",
      readBoundedUtf8(canonicalPath, displayPath),
    )) {
      failures.push(`${displayPath}: ${failure}`);
    }
  }

  return failures;
}

function extractActiveExecPlanReferences(section: string): string[] {
  const references: string[] = [];
  const inlineCodeRanges = findInlineCodeRanges(section);
  let lineStart = 0;

  for (const line of section.split("\n")) {
    const match = /^\s*-\s+\*\*Active ExecPlan:\*\*\s+`([^`]+)`[.,]?[ \t]*$/.exec(line);
    const firstContentOffset = line.search(/\S/);
    const metadataOffset = lineStart + Math.max(firstContentOffset, 0);
    const insideOuterCodeSpan = inlineCodeRanges.some(
      (range) => metadataOffset >= range.start && metadataOffset < range.end,
    );
    if (match?.[1] !== undefined && !insideOuterCodeSpan) {
      references.push(match[1]);
    }
    lineStart += line.length + 1;
  }
  return references;
}

function checkRoadmapActiveExecPlanReferences(rawRoadmapText: string): string[] {
  const failures: string[] = [];
  const text = stripCodeFences(rawRoadmapText);
  const headings = [...text.matchAll(/^## Stage (\d+) — .*$/gm)];
  const planPlacementCache = new Map<string, string[]>();
  let totalReferencedPlanBytes = 0;
  const canonicalActiveDirectory = canonicalGovernedDirectory(
    activePlansDirectory,
    "docs/exec-plans/active/",
  );

  headings.forEach((heading, index) => {
    const stageNumber = heading[1];
    if (stageNumber === undefined) {
      return;
    }
    const stage = Number(stageNumber);
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? text.length;
    const section = text.slice(start, end);
    const status = extractRoadmapStatusDeclarations(section)[0];
    const references = extractActiveExecPlanReferences(section);

    if (references.length > 1) {
      failures.push(
        `Stage ${stage}: duplicate **Active ExecPlan:** declarations; expected exactly one`,
      );
      return;
    }

    if (references.length > 0) {
      for (const reference of references) {
        const planPath = resolve(repositoryRoot, reference);
        const relativeToRoot = relative(repositoryRoot, planPath);
        const insideRepository =
          relativeToRoot.length > 0 &&
          relativeToRoot !== ".." &&
          !relativeToRoot.startsWith(`..${sep}`) &&
          !isAbsolute(relativeToRoot);

        if (!insideRepository) {
          failures.push(`Stage ${stage}: ExecPlan "${reference}" resolves outside the repository`);
        } else if (!existsSync(planPath)) {
          failures.push(`Stage ${stage}: ROADMAP.md cites missing active ExecPlan "${reference}"`);
        } else if (!statSync(planPath).isFile()) {
          failures.push(`Stage ${stage}: ExecPlan "${reference}" is not a plan file`);
        } else {
          const canonicalPlanPath = realpathSync(planPath);
          if (!pathIsInside(canonicalRepositoryRoot, canonicalPlanPath)) {
            failures.push(
              `Stage ${stage}: ExecPlan "${reference}" resolves outside the repository through a symlink`,
            );
            continue;
          }
          let placementFailures = planPlacementCache.get(canonicalPlanPath);
          if (placementFailures === undefined) {
            totalReferencedPlanBytes += statSync(canonicalPlanPath).size;
            try {
              requireAtMost(
                totalReferencedPlanBytes,
                maximumMarkdownTotalBytes,
                "referenced ExecPlan total size",
              );
            } catch (error) {
              failures.push(error instanceof Error ? error.message : String(error));
              continue;
            }
            placementFailures = checkExecPlanPlacement(
              "active",
              readBoundedUtf8(canonicalPlanPath, reference),
            );
            planPlacementCache.set(canonicalPlanPath, placementFailures);
          }
          for (const placementFailure of placementFailures) {
            failures.push(`Stage ${stage}: ExecPlan "${reference}": ${placementFailure}`);
          }
        }

        if (status === "ACTIVE") {
          const canonicalPlanPath = existsSync(planPath) ? realpathSync(planPath) : planPath;
          const insideActive = pathIsInside(canonicalActiveDirectory, canonicalPlanPath);
          if (!insideActive) {
            failures.push(
              `Stage ${stage}: ACTIVE stage ExecPlan must live under docs/exec-plans/active/ ("${reference}")`,
            );
          }
        }
      }
    } else if (status === "ACTIVE") {
      failures.push(
        `Stage ${stage}: ACTIVE stage must cite an **Active ExecPlan:** path under docs/exec-plans/active/`,
      );
    }
  });

  return failures;
}

function runSelfTest(): void {
  const failures: string[] = [];

  const fixtureText = [
    "[ok](AGENTS.md)",
    "[broken](does-not-exist.md)",
    "[external](https://example.com/x)",
    "[fragment](#local-heading)",
    "[anchor](AGENTS.md#sources-of-truth)",
    "[parenthesized](docs/guide(v2).md)",
    "[nested](docs/guide(v2)(draft).md)",
    "[angle path](<docs/guide(v2).md>)",
    "[reference definition]: missing-reference-target.md",
    '[angle reference]: <AGENTS.md> "title"',
    '[missing angle reference]: <docs/guide(v2).md> "title"',
    "    [indented](indented-only.md)",
    "\t[tab-indented](tab-indented-only.md)",
    "```",
    "[fenced](fenced-only.md)",
    "```",
    "Inline `[code](code-span-only.md)` stays hidden.",
    "``Double `[code](double-span-only.md)` span also hidden.``",
    "`[multiline](multiline-span-only.md)",
    "code span also hidden.`",
    "~~~markdown",
    "```text",
    "[mixed fence](mixed-fence-only.md)",
    "```",
    "~~~",
    "````markdown",
    "```",
    "[long backtick fence](long-backtick-fence-only.md)",
    "```",
    "````",
    "~~~~markdown",
    "~~~",
    "[long tilde fence](long-tilde-fence-only.md)",
    "~~~",
    "~~~~",
    "",
  ].join("\n");

  const targets = extractMarkdownTargets(fixtureText);
  const extractedValues = targets.map((entry) => entry.target);
  for (const expected of [
    "AGENTS.md",
    "does-not-exist.md",
    "https://example.com/x",
    "#local-heading",
    "AGENTS.md#sources-of-truth",
    "docs/guide(v2).md",
    "docs/guide(v2)(draft).md",
    "missing-reference-target.md",
    "AGENTS.md",
  ]) {
    if (!extractedValues.includes(expected)) {
      failures.push(`link extraction missed "${expected}"`);
    }
  }
  if (
    extractedValues.includes("fenced-only.md") ||
    extractedValues.includes("code-span-only.md") ||
    extractedValues.includes("double-span-only.md") ||
    extractedValues.includes("multiline-span-only.md") ||
    extractedValues.includes("mixed-fence-only.md") ||
    extractedValues.includes("long-backtick-fence-only.md") ||
    extractedValues.includes("long-tilde-fence-only.md") ||
    extractedValues.includes("indented-only.md") ||
    extractedValues.includes("tab-indented-only.md")
  ) {
    failures.push("link extraction did not ignore code fences or inline code");
  }

  const readmePath = resolve(repositoryRoot, "README.md");
  if (checkMarkdownLinkTarget(readmePath, 1, "AGENTS.md") !== undefined) {
    failures.push("existing in-repository link target was rejected");
  }
  if (checkMarkdownLinkTarget(readmePath, 1, "does-not-exist.md") === undefined) {
    failures.push("broken in-repository link target was not detected");
  }
  if (
    !targets.some((entry) => entry.target === "docs/guide(v2).md") ||
    checkMarkdownLinkTarget(readmePath, 1, "docs/guide(v2).md") === undefined
  ) {
    failures.push("missing parenthesized Markdown destination was not detected");
  }
  if (
    !targets.some(
      (entry) =>
        entry.target === "AGENTS.md" &&
        fixtureText.split("\n")[entry.line - 1]?.startsWith("[angle reference]:"),
    ) ||
    checkMarkdownLinkTarget(readmePath, 1, "AGENTS.md") !== undefined
  ) {
    failures.push("angle-wrapped reference destination was not normalized");
  }
  const missingAngleReference = targets.find((entry) =>
    fixtureText.split("\n")[entry.line - 1]?.startsWith("[missing angle reference]:"),
  );
  if (
    missingAngleReference?.target !== "docs/guide(v2).md" ||
    checkMarkdownLinkTarget(
      readmePath,
      missingAngleReference.line,
      missingAngleReference.target,
    ) === undefined
  ) {
    failures.push("missing angle-wrapped reference destination was not rejected");
  }
  const pathologicalTargets = extractMarkdownTargets(
    "](".repeat(8_000) + "\n" + "](<".repeat(8_000) + "\n[ok](AGENTS.md)",
  );
  if (pathologicalTargets.length !== 1 || pathologicalTargets[0]?.target !== "AGENTS.md") {
    failures.push("malformed repeated link openers interfered with later links");
  }
  if (checkMarkdownLinkTarget(readmePath, 1, "https://example.com/x") !== undefined) {
    failures.push("external URL was not skipped");
  }
  if (checkMarkdownLinkTarget(readmePath, 1, "#local-heading") !== undefined) {
    failures.push("fragment-only link was not skipped");
  }
  if (checkMarkdownLinkTarget(readmePath, 1, "AGENTS.md#sources-of-truth") !== undefined) {
    failures.push("valid path with fragment was rejected");
  }
  if (
    checkMarkdownLinkTarget(readmePath, 1, "/etc/passwd") === undefined ||
    !checkMarkdownLinkTarget(readmePath, 1, "/etc/passwd")?.includes("outside the repository")
  ) {
    failures.push("absolute link target outside the repository was not rejected");
  }
  if (
    checkMarkdownLinkTarget(readmePath, 1, "../../outside-repo.md") === undefined ||
    !checkMarkdownLinkTarget(readmePath, 1, "../../outside-repo.md")?.includes(
      "outside the repository",
    )
  ) {
    failures.push("relative link target escaping the repository was not rejected");
  }

  if (process.platform !== "win32") {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "yway-doc-check-"));
    try {
      const symlinkPath = join(temporaryDirectory, "outside.md");
      symlinkSync("/etc/passwd", symlinkPath);
      if (pathIsInside(realpathSync(temporaryDirectory), realpathSync(symlinkPath), true)) {
        failures.push("canonical containment accepted a symlink escaping its root");
      }
      try {
        canonicalGovernedFile(symlinkPath, "symlink fixture");
        failures.push("canonical governed-file validation accepted a symlink");
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("symbolic link")) {
          failures.push("canonical governed-file validation produced the wrong symlink failure");
        }
      }

      const directorySymlink = join(temporaryDirectory, "redirected-root");
      symlinkSync(repositoryRoot, directorySymlink, "dir");
      try {
        canonicalGovernedDirectory(directorySymlink, "directory symlink fixture");
        failures.push("canonical governed-directory validation accepted a symlink");
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("symbolic link")) {
          failures.push(
            "canonical governed-directory validation produced the wrong symlink failure",
          );
        }
      }

      const oversizedPath = join(temporaryDirectory, "oversized.md");
      writeFileSync(oversizedPath, Buffer.alloc(maximumMarkdownFileBytes + 1));
      try {
        readBoundedUtf8(oversizedPath, "oversized fixture");
        failures.push("bounded reader accepted an oversized Markdown file");
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("exceeds")) {
          failures.push("bounded reader produced the wrong oversized-file failure");
        }
      }

      const scanRoot = join(temporaryDirectory, "scan-root");
      const scanDocs = join(scanRoot, "docs");
      mkdirSync(scanDocs, { recursive: true });
      symlinkSync(join(temporaryDirectory, "missing.md"), join(scanRoot, "AGENTS.md"));
      symlinkSync("/etc/passwd", join(scanDocs, "outside.md"));
      const canonicalScanRoot = realpathSync(scanRoot);
      const scanFailures = checkMarkdownLinks(
        collectMarkdownFiles(scanRoot, canonicalScanRoot),
        scanRoot,
        canonicalScanRoot,
      );
      if (!scanFailures.some((failure) => failure.includes("cannot be resolved"))) {
        failures.push("dangling governed root Markdown symlink was not rejected end to end");
      }
      if (!scanFailures.some((failure) => failure.includes("outside the repository"))) {
        failures.push("nested outside-root Markdown symlink was not rejected end to end");
      }

      symlinkSync(join(temporaryDirectory, "missing-directory"), join(scanRoot, ".github"), "dir");
      try {
        collectMarkdownFiles(scanRoot, canonicalScanRoot);
        failures.push("dangling governed directory symlink was silently skipped");
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("symbolic link")) {
          failures.push("dangling governed directory symlink produced the wrong failure");
        }
      }
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  }

  for (const [label, limit] of [
    ["file bytes", maximumMarkdownFileBytes],
    ["aggregate bytes", maximumMarkdownTotalBytes],
    ["file count", maximumMarkdownFiles],
    ["traversal depth", maximumMarkdownDepth],
    ["traversal entries", maximumTraversalEntries],
    ["ExecPlan count", maximumMarkdownFiles],
    ["ExecPlan aggregate bytes", maximumMarkdownTotalBytes],
    ["referenced ExecPlan aggregate bytes", maximumMarkdownTotalBytes],
  ] as const) {
    try {
      requireAtMost(limit, limit, label);
    } catch {
      failures.push(`${label} rejected its inclusive boundary`);
    }
    try {
      requireAtMost(limit + 1, limit, label);
      failures.push(`${label} accepted limit plus one`);
    } catch {
      // Expected.
    }
  }

  const matchingRoadmap = [
    "## Stage 0 — Zero",
    "- **Status:** COMPLETE.",
    "## Stage 1 — One",
    "- **Status:** ACTIVE.",
    "",
  ].join("\n");
  const matchingIndex = [
    "| Stage | Name | Status |",
    "| ---: | --- | --- |",
    "| 0 | Zero | COMPLETE |",
    "| 1 | One | ACTIVE |",
    "",
  ].join("\n");
  if (checkRoadmapConsistency(matchingRoadmap, matchingIndex).length !== 0) {
    failures.push("matching roadmap and stage-index statuses were rejected");
  }

  const mismatchedIndex = matchingIndex.replace("| 1 | One | ACTIVE |", "| 1 | One | PLANNED |");
  const mismatchFailures = checkRoadmapConsistency(matchingRoadmap, mismatchedIndex);
  if (
    !mismatchFailures.some((failure) =>
      failure.includes(
        'Stage 1: ROADMAP.md status "ACTIVE" disagrees with STAGE-INDEX.md status "PLANNED"',
      ),
    )
  ) {
    failures.push("roadmap/stage-index status disagreement was not detected");
  }

  const missingStageFailures = checkRoadmapConsistency(
    matchingRoadmap,
    "| Stage | Name | Status |\n| ---: | --- | --- |\n| 0 | Zero | COMPLETE |\n",
  );
  if (
    !missingStageFailures.some((failure) =>
      failure.includes("Stage 1: present in ROADMAP.md but missing from STAGE-INDEX.md"),
    )
  ) {
    failures.push("stage present in only one status source was not detected");
  }

  const unknownStatusFailures = checkRoadmapConsistency(
    "## Stage 0 — Zero\n- **Status:** SUSPENDED.\n",
    "| 0 | Zero | SUSPENDED |\n",
  );
  if (
    !unknownStatusFailures.some((failure) =>
      failure.includes('ROADMAP.md status "SUSPENDED" is not a known status'),
    ) ||
    !unknownStatusFailures.some((failure) =>
      failure.includes('STAGE-INDEX.md status "SUSPENDED" is not a known status'),
    )
  ) {
    failures.push("unknown stage status value was not detected");
  }

  const suffixedStatusFailures = checkRoadmapConsistency(
    "## Stage 0 — Zero\n- **Status:** ACTIVE_PENDING.\n",
    "| 0 | Zero | ACTIVE_PENDING |\n",
  );
  if (
    !suffixedStatusFailures.some((failure) =>
      failure.includes('ROADMAP.md status "ACTIVE_PENDING" is not a known status'),
    ) ||
    !suffixedStatusFailures.some((failure) =>
      failure.includes('STAGE-INDEX.md status "ACTIVE_PENDING" is not a known status'),
    )
  ) {
    failures.push("complete stage status values were not validated");
  }

  const reverseMissingFailures = checkRoadmapConsistency(
    "## Stage 0 — Zero\n- **Status:** COMPLETE.\n",
    matchingIndex,
  );
  if (
    !reverseMissingFailures.some((failure) =>
      failure.includes("Stage 1: present in STAGE-INDEX.md but missing from ROADMAP.md"),
    )
  ) {
    failures.push("stage present only in STAGE-INDEX.md was not detected");
  }

  const fencedIndex = ["```", "| 9 | Ghost | ACTIVE |", "```", matchingIndex].join("\n");
  if (checkRoadmapConsistency(matchingRoadmap, fencedIndex).length !== 0) {
    failures.push("roadmap or stage-index check parsed a row inside a code fence");
  }

  const duplicateRoadmapFailures = checkRoadmapConsistency(
    `${matchingRoadmap}\n## Stage 1 — One again\n- **Status:** PLANNED.\n`,
    matchingIndex,
  );
  if (
    !duplicateRoadmapFailures.some((failure) =>
      failure.includes("Stage 1: duplicate stage declaration in ROADMAP.md"),
    )
  ) {
    failures.push("duplicate stage heading in ROADMAP.md was not detected");
  }

  const duplicateRoadmapMissingStatusFailures = checkRoadmapConsistency(
    `${matchingRoadmap}\n## Stage 1 — Duplicate without status\nNo status metadata here.\n`,
    matchingIndex,
  );
  if (
    !duplicateRoadmapMissingStatusFailures.some((failure) =>
      failure.includes("Stage 1: duplicate stage declaration in ROADMAP.md"),
    )
  ) {
    failures.push("duplicate ROADMAP stage without status metadata was not detected");
  }

  const duplicateRoadmapStatusFailures = checkRoadmapConsistency(
    ["## Stage 1 — One", "- **Status:** ACTIVE.", "- **Status:** PLANNED.", ""].join("\n"),
    "| 1 | One | ACTIVE |\n",
  );
  if (
    !duplicateRoadmapStatusFailures.some((failure) =>
      failure.includes("Stage 1: duplicate status declarations in ROADMAP.md"),
    )
  ) {
    failures.push("duplicate ROADMAP status declarations were not detected");
  }

  const duplicateIndexFailures = checkRoadmapConsistency(
    matchingRoadmap,
    `${matchingIndex}| 1 | One again | PLANNED |\n`,
  );
  if (
    !duplicateIndexFailures.some((failure) =>
      failure.includes("Stage 1: duplicate stage row in STAGE-INDEX.md"),
    )
  ) {
    failures.push("duplicate stage row in STAGE-INDEX.md was not detected");
  }

  const validActivePlanPath =
    "docs/exec-plans/active/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md";
  const completedPlanPath =
    "docs/exec-plans/completed/STAGE-1-PRODUCT-CONTRACTS-DOMAIN-ARCHITECTURE.md";

  const existingPlanReference = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "",
    ].join("\n"),
  );
  if (existingPlanReference.length !== 0) {
    failures.push(
      `existing active ExecPlan reference was rejected (${existingPlanReference.join("; ")})`,
    );
  }

  const repeatedCanonicalPlanReference = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "## Stage 3 — Three",
      "- **Status:** PLANNED.",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "",
    ].join("\n"),
  );
  if (repeatedCanonicalPlanReference.length !== 0) {
    failures.push(
      `repeated canonical ExecPlan reference was rejected (${repeatedCanonicalPlanReference.join("; ")})`,
    );
  }

  const missingPlanReference = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      "- **Active ExecPlan:** `docs/exec-plans/active/does-not-exist.md`.",
      "",
    ].join("\n"),
  );
  if (
    !missingPlanReference.some((failure) =>
      failure.includes('cites missing active ExecPlan "docs/exec-plans/active/does-not-exist.md"'),
    )
  ) {
    failures.push("missing active ExecPlan reference was not detected");
  }

  const noReferenceFailures = checkRoadmapActiveExecPlanReferences(
    ["## Stage 2 — Two", "- **Status:** ACTIVE.", ""].join("\n"),
  );
  if (
    !noReferenceFailures.some((failure) =>
      failure.includes("Stage 2: ACTIVE stage must cite an **Active ExecPlan:** path"),
    )
  ) {
    failures.push("ACTIVE stage without an ExecPlan citation was not detected");
  }

  const wrongLocationFailures = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      `- **Active ExecPlan:** \`${completedPlanPath}\`.`,
      "",
    ].join("\n"),
  );
  if (
    !wrongLocationFailures.some((failure) =>
      failure.includes(
        `Stage 2: ACTIVE stage ExecPlan must live under docs/exec-plans/active/ ("${completedPlanPath}")`,
      ),
    ) ||
    !wrongLocationFailures.some((failure) => failure.includes("expected ACTIVE"))
  ) {
    failures.push(
      "ACTIVE stage citing a completed/ ExecPlan path was not rejected for location and declared status",
    );
  }

  const fencedExecPlanExample = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "```",
      "- **Active ExecPlan:** `docs/exec-plans/active/does-not-exist.md`.",
      "```",
      "",
    ].join("\n"),
  );
  if (fencedExecPlanExample.length !== 0) {
    failures.push(
      `fenced Active ExecPlan example was treated as live metadata (${fencedExecPlanExample.join("; ")})`,
    );
  }

  const inlineExecPlanExample = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      "``- **Active ExecPlan:** `docs/exec-plans/active/does-not-exist.md`.``",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "",
    ].join("\n"),
  );
  if (inlineExecPlanExample.length !== 0) {
    failures.push(
      `inline-code Active ExecPlan example was treated as live metadata (${inlineExecPlanExample.join("; ")})`,
    );
  }

  const multilineInlineExecPlanExample = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      "``",
      "- **Active ExecPlan:** `docs/exec-plans/active/does-not-exist.md`.",
      "``",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "",
    ].join("\n"),
  );
  if (multilineInlineExecPlanExample.length !== 0) {
    failures.push(
      `multiline inline-code Active ExecPlan example was treated as live metadata (${multilineInlineExecPlanExample.join("; ")})`,
    );
  }

  const duplicateExecPlanReferences = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      `- **Active ExecPlan:** \`${validActivePlanPath}\`.`,
      "",
    ].join("\n"),
  );
  if (
    !duplicateExecPlanReferences.some((failure) =>
      failure.includes("duplicate **Active ExecPlan:** declarations"),
    )
  ) {
    failures.push("duplicate Active ExecPlan declarations were not detected");
  }

  const outsideRepoReference = checkRoadmapActiveExecPlanReferences(
    [
      "## Stage 2 — Two",
      "- **Status:** ACTIVE.",
      "- **Active ExecPlan:** `../../outside-repo.md`.",
      "",
    ].join("\n"),
  );
  if (
    !outsideRepoReference.some((failure) =>
      failure.includes('ExecPlan "../../outside-repo.md" resolves outside the repository'),
    )
  ) {
    failures.push("ExecPlan reference escaping the repository was not detected");
  }

  const planCases: Array<[PlanPlacement, string, boolean, string]> = [
    ["active", "## Status\n\nACTIVE\n", false, "active plan with ACTIVE status rejected"],
    ["active", "## Status\n\nCOMPLETE\n", true, "active plan claiming COMPLETE was not rejected"],
    ["active", "# No status section here\n", true, "active plan without status was not rejected"],
    ["completed", "## Status\n\nCOMPLETE\n", false, "completed plan with COMPLETE rejected"],
    [
      "completed",
      "## Status\n\nCompleted — 2026-09-20.\n",
      false,
      "completed plan with Completed marker rejected",
    ],
    [
      "completed",
      "**Completed:** 2026-09-19\n",
      false,
      "completed plan with bold Completed marker rejected",
    ],
    ["completed", "## Status\n\nACTIVE\n", true, "completed plan claiming ACTIVE was not rejected"],
    [
      "completed",
      "# Legacy plan without a status declaration\n",
      false,
      "completed plan without status declaration rejected",
    ],
    [
      "active",
      "## Status\n\nACTIVE\n\nActivation date: 2026-09-21\n",
      false,
      "active plan with activation date rejected",
    ],
    [
      "active",
      "## Status\n\nACTIVE\n\nNotes may cite `**Completed:**` and `**Status:**` in code.\n",
      false,
      "active plan citing status markers inside inline code rejected",
    ],
    [
      "completed",
      "## Status\n\nCOMPLETE\n\n```text\nACTIVE\n```\n",
      false,
      "completed plan mentioning ACTIVE inside a code fence rejected",
    ],
    [
      "active",
      "## Status\n\nACTIVE\n\nFinal completion pending.\n",
      false,
      "active plan rejected because later status-block prose mentions completion",
    ],
    [
      "completed",
      "**Status:** ACTIVE\n",
      true,
      "completed plan with bold ACTIVE status not rejected",
    ],
    ["active", "**Status:** ACTIVE\n", false, "active plan with bold ACTIVE status rejected"],
    [
      "active",
      "## Status\n\nACTIVE\n\n## Status\n\nCOMPLETE\n",
      true,
      "active plan with duplicate conflicting status sections was not rejected",
    ],
    [
      "active",
      "# Plan\n\n**Status:** ACTIVE\n\n**Status:** ACTIVE\n\n## Work\n",
      true,
      "active plan with duplicate bold status declarations was not rejected",
    ],
    [
      "active",
      "# Plan\n\n**Status:** ACTIVE\n\n**Status:** PLANNED\n\n## Work\n",
      true,
      "active plan with a second unknown status declaration was not rejected",
    ],
    [
      "completed",
      "# Plan\n\n**Completed:** 2026-09-21\n\n**Completed:** 2026-09-22\n\n## Work\n",
      true,
      "completed plan with duplicate Completed declarations was not rejected",
    ],
    [
      "active",
      "# Plan\n\n**Status:** ACTIVE\n\n## Status\n\nCOMPLETE\n",
      true,
      "active plan with mixed-form conflicting status declarations was not rejected",
    ],
    [
      "completed",
      "# Plan\n\n**Completed:** 2026-09-22\n\n## Status\n\nCOMPLETE\n",
      true,
      "completed plan with mixed-form duplicate status declarations was not rejected",
    ],
  ];

  for (const [placement, text, shouldFail, message] of planCases) {
    const resultFailures = checkExecPlanPlacement(placement, text);
    if (shouldFail && resultFailures.length === 0) {
      failures.push(message);
    }
    if (!shouldFail && resultFailures.length > 0) {
      failures.push(`${message} (unexpected: ${resultFailures.join("; ")})`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL  self-test: ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS  documentation/status consistency self-test");
  console.log(
    "INFO  Link checks cover in-repository targets only; external URLs and fragments are not validated.",
  );
}

function runRepositoryCheck(): void {
  let failed = false;

  let linkFailures: string[];
  try {
    linkFailures = checkMarkdownLinks(collectMarkdownFiles(repositoryRoot));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    linkFailures = [`documentation scan failed: ${message}`];
  }
  if (linkFailures.length > 0) {
    failed = true;
    for (const failure of linkFailures) {
      console.error("FAIL  YINV-DOC-LINK-001");
      console.error(`      ${failure}`);
    }
  } else {
    console.log("PASS  markdown in-repository links");
  }

  if (!existsSync(roadmapPath) || !existsSync(stageIndexPath)) {
    failed = true;
    console.error("FAIL  YINV-ROADMAP-STATUS-001");
    console.error("      ROADMAP.md or STAGE-INDEX.md is missing");
  } else {
    let roadmapFailures: string[];
    try {
      const canonicalRoadmapPath = canonicalGovernedFile(roadmapPath, "ROADMAP.md");
      const canonicalStageIndexPath = canonicalGovernedFile(stageIndexPath, "STAGE-INDEX.md");
      const roadmapText = readBoundedUtf8(canonicalRoadmapPath, "ROADMAP.md");
      const stageIndexText = readBoundedUtf8(canonicalStageIndexPath, "STAGE-INDEX.md");
      roadmapFailures = [
        ...checkRoadmapConsistency(roadmapText, stageIndexText),
        ...checkRoadmapActiveExecPlanReferences(roadmapText),
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      roadmapFailures = [`status-source validation failed: ${message}`];
    }

    if (roadmapFailures.length > 0) {
      failed = true;
      for (const failure of roadmapFailures) {
        console.error("FAIL  YINV-ROADMAP-STATUS-001");
        console.error(`      ${failure}`);
      }
    } else {
      console.log("PASS  roadmap and stage-index status consistency");
    }
  }

  let planFailures: string[];
  try {
    planFailures = checkExecPlanDirectories();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    planFailures = [`ExecPlan scan failed: ${message}`];
  }
  if (planFailures.length > 0) {
    failed = true;
    for (const failure of planFailures) {
      console.error("FAIL  YINV-EXECPLAN-STATE-001");
      console.error(`      ${failure}`);
    }
  } else {
    console.log("PASS  ExecPlan active/completed placement");
  }

  console.log(
    "INFO  Documentation/status checks are structural guardrails, not proof of product meaning.",
  );

  if (failed) {
    process.exit(1);
  }
}

const arguments_ = process.argv.slice(2);
if (arguments_.length === 0) {
  runSelfTest();
  runRepositoryCheck();
} else if (arguments_.length === 1 && arguments_[0] === "--self-test") {
  runSelfTest();
} else {
  console.error("Usage: node --import tsx scripts/check-doc-consistency.ts [--self-test]");
  process.exit(2);
}
