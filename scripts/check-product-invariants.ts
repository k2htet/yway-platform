import { readdirSync, readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

interface InvariantRule {
  id: string;
  identifiers: ReadonlySet<string>;
  contracts: readonly string[];
  reason: string;
}

interface Finding {
  rule: InvariantRule;
  path: string;
  line: number;
  column: number;
  identifier: string;
}

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const checkerPath = resolve(repositoryRoot, "scripts/check-product-invariants.ts");

const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const excludedDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "docs",
  "generated",
  "node_modules",
  "out",
]);

const rules: readonly InvariantRule[] = [
  {
    id: "YINV-SCORE-001",
    identifiers: new Set([
      "careerScore",
      "careerFitScore",
      "careerFitPercentage",
      "employabilityScore",
      "candidateScore",
      "candidateRanking",
      "hiddenScore",
      "suitabilityScore",
    ]),
    contracts: ["YWAY-P005", "YWAY-E006"],
    reason: "clear prohibited career, employability, or candidate scoring identifier",
  },
  {
    id: "YINV-CANDIDATE-001",
    identifiers: new Set([
      "autoCreateCandidate",
      "createCandidateFromQuest",
      "autoApplyFromQuest",
      "questCreatesApplication",
    ]),
    contracts: ["YWAY-P017", "YWAY-P030"],
    reason: "clear automatic Quest-to-candidate or application identifier",
  },
  {
    id: "YINV-PORTFOLIO-001",
    identifiers: new Set(["publicPortfolioUrl", "publicPortfolioSlug", "makePortfolioPublic"]),
    contracts: ["YWAY-P014"],
    reason: "clear public-portfolio implementation identifier",
  },
];

function scriptKindFor(filePath: string): ts.ScriptKind {
  switch (extname(filePath)) {
    case ".ts":
      return ts.ScriptKind.TS;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    default:
      return ts.ScriptKind.JS;
  }
}

function inspectSource(sourceText: string, displayPath: string): Finding[] {
  const sourceFile = ts.createSourceFile(
    displayPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(displayPath),
  );
  const findings: Finding[] = [];

  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
      const identifierName = ts.isPrivateIdentifier(node) ? node.text.slice(1) : node.text;

      for (const rule of rules) {
        if (rule.identifiers.has(identifierName)) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          findings.push({
            rule,
            path: displayPath,
            line: position.line + 1,
            column: position.character + 1,
            identifier: node.text,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function collectCodeFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...collectCodeFiles(entryPath));
      }
      continue;
    }

    if (entry.isFile() && codeExtensions.has(extname(entry.name)) && entryPath !== checkerPath) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function runSelfTest(): void {
  const forbidden = inspectSource("const careerScore = 90;", "forbidden.ts");
  const forbiddenPrivate = inspectSource(
    "class Profile { #careerScore = 90; read() { return this.#careerScore; } }",
    "forbidden-private.ts",
  );
  const allowed = inspectSource("const reflectionScore = 90;", "allowed.ts");
  const proseOnly = inspectSource(
    '// careerScore\nconst message = "careerScore";\nconst template = `careerScore`;',
    "prose-only.ts",
  );

  const failures: string[] = [];
  if (forbidden.length !== 1 || forbidden[0]?.rule.id !== "YINV-SCORE-001") {
    failures.push("forbidden identifier was not detected exactly once");
  }
  if (
    forbiddenPrivate.length !== 2 ||
    forbiddenPrivate.some((finding) => finding.rule.id !== "YINV-SCORE-001")
  ) {
    failures.push("forbidden private identifier declaration and access were not detected");
  }
  if (allowed.length !== 0) {
    failures.push("normal identifier was rejected");
  }
  if (proseOnly.length !== 0) {
    failures.push("comment or string mention caused a false positive");
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL  self-test: ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS  structural product invariant self-test");
  console.log(
    "INFO  Forbidden identifiers, including private identifiers, are caught; normal identifiers, comments, and strings are allowed.",
  );
}

function runRepositoryCheck(): void {
  const findings = collectCodeFiles(repositoryRoot).flatMap((filePath) => {
    const displayPath = relative(repositoryRoot, filePath).split("\\").join("/");
    return inspectSource(readFileSync(filePath, "utf8"), displayPath);
  });

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`FAIL  ${finding.rule.id}`);
      console.error(`      ${finding.path}:${finding.line}:${finding.column}`);
      console.error(`      identifier: ${finding.identifier}`);
      console.error(`      contract: ${finding.rule.contracts.join(", ")}`);
      console.error(`      reason: ${finding.rule.reason}`);
    }
    process.exit(1);
  }

  console.log("PASS  structural product invariant checks");
  console.log(
    "INFO  Structural checks are guardrails, not proof of semantic/security/privacy correctness.",
  );
}

const arguments_ = process.argv.slice(2);
if (arguments_.length === 0) {
  runRepositoryCheck();
} else if (arguments_.length === 1 && arguments_[0] === "--self-test") {
  runSelfTest();
} else {
  console.error("Usage: tsx scripts/check-product-invariants.ts [--self-test]");
  process.exit(2);
}
