import { existsSync, readdirSync, readFileSync } from "node:fs";
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

type ContractClassification =
  "DIRECT_PRODUCT_CONTRACT" | "OWNER_AUTHORIZED_PRODUCT_CONTRACT" | "DERIVED_ENFORCEMENT_INVARIANT";

interface ProductContractSection {
  id: string;
  headingIsWellFormed: boolean;
  classification?: string;
  source?: string;
  derivedFrom?: string;
}

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const checkerPath = resolve(repositoryRoot, "scripts/check-product-invariants.ts");
const productContractsPath = resolve(repositoryRoot, "docs/product/PRODUCT_CONTRACTS.md");

const knownContractClassifications = new Set<ContractClassification>([
  "DIRECT_PRODUCT_CONTRACT",
  "OWNER_AUTHORIZED_PRODUCT_CONTRACT",
  "DERIVED_ENFORCEMENT_INVARIANT",
]);

const ownerAuthorizedContracts = new Map([
  ["YWAY-P002", "docs/audits/STAGE-1-S1-02-CAREER-EXPERIMENT-SEMANTICS.md"],
  ["YWAY-P003", "docs/audits/STAGE-1-S1-02-CAREER-EXPERIMENT-SEMANTICS.md"],
  ["YWAY-P008", "docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md"],
  ["YWAY-P011", "docs/audits/STAGE-1-S1-02-CAREER-EXPERIMENT-SEMANTICS.md"],
  ["YWAY-P013", "docs/audits/STAGE-1-S1-02-CAREER-EXPERIMENT-SEMANTICS.md"],
  ["YWAY-P019", "docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md"],
]);

const expectedProductContractIds = new Set([
  ...Array.from({ length: 30 }, (_, index) => `YWAY-P${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `YWAY-E${String(index + 1).padStart(3, "0")}`),
]);

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

function parseProductContractSections(sourceText: string): ProductContractSection[] {
  const headings = [...sourceText.matchAll(/^## (YWAY-\S+)(?::[^\n]*)?$/gm)];

  return headings.map((heading, index) => {
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? sourceText.length;
    const body = sourceText.slice(start, end);

    return {
      id: heading[1] ?? "",
      headingIsWellFormed: /^## YWAY-[PE]\d{3}:[^\n]+$/.test(heading[0]),
      classification: /^- \*\*Classification:\*\* ([A-Z_]+)$/m.exec(body)?.[1],
      source: /^- \*\*Source:\*\* (.+)$/m.exec(body)?.[1],
      derivedFrom: /^- \*\*Derived from:\*\* (.+)$/m.exec(body)?.[1],
    };
  });
}

function inspectProductContractStructure(sourceText: string): string[] {
  const sections = parseProductContractSections(sourceText);
  const failures: string[] = [];

  if (sections.length === 0) {
    return ["no Product Contract sections were found"];
  }

  const sectionCounts = new Map<string, number>();
  for (const section of sections) {
    sectionCounts.set(section.id, (sectionCounts.get(section.id) ?? 0) + 1);
  }

  for (const contractId of expectedProductContractIds) {
    const count = sectionCounts.get(contractId) ?? 0;
    if (count === 0) {
      failures.push(`${contractId}: expected stable contract ID is missing`);
    } else if (count > 1) {
      failures.push(`${contractId}: stable contract ID appears ${count} times`);
    }
  }

  for (const section of sections) {
    if (!section.headingIsWellFormed) {
      failures.push(`${section.id}: malformed Product Contract heading`);
    }
    if (!expectedProductContractIds.has(section.id)) {
      failures.push(`${section.id}: unexpected Product Contract ID`);
    }

    if (
      !section.classification ||
      !knownContractClassifications.has(section.classification as ContractClassification)
    ) {
      failures.push(
        `${section.id}: unknown or missing classification "${section.classification ?? "missing"}"`,
      );
      continue;
    }

    if (section.id.startsWith("YWAY-P")) {
      if (section.classification === "DERIVED_ENFORCEMENT_INVARIANT") {
        failures.push(
          `${section.id}: product contract cannot use derived-invariant classification`,
        );
      }
      if (!section.source) {
        failures.push(`${section.id}: product contract is missing a Source field`);
      }
    }

    if (section.id.startsWith("YWAY-E")) {
      if (section.classification !== "DERIVED_ENFORCEMENT_INVARIANT") {
        failures.push(`${section.id}: enforcement invariant must use derived classification`);
      }
      if (!section.derivedFrom) {
        failures.push(`${section.id}: enforcement invariant is missing a Derived from field`);
      }
    }

    if (section.classification === "OWNER_AUTHORIZED_PRODUCT_CONTRACT") {
      const ownerRecord = ownerAuthorizedContracts.get(section.id);

      if (!section.source?.includes("§")) {
        failures.push(`${section.id}: owner-authorized contract source lacks a Vision boundary`);
      }
      if (!ownerRecord) {
        failures.push(
          `${section.id}: owner-authorized contract has no registered owner-decision record`,
        );
      } else {
        if (!section.source?.includes(ownerRecord)) {
          failures.push(`${section.id}: source must cite owner record ${ownerRecord}`);
        }
        if (!existsSync(resolve(repositoryRoot, ownerRecord))) {
          failures.push(`${section.id}: owner record does not exist at ${ownerRecord}`);
        }
      }
    }
  }

  for (const [contractId, ownerRecord] of ownerAuthorizedContracts) {
    const section = sections.find((candidate) => candidate.id === contractId);

    if (!section) {
      failures.push(`${contractId}: expected owner-authorized contract is missing`);
      continue;
    }

    if (section.classification !== "OWNER_AUTHORIZED_PRODUCT_CONTRACT") {
      failures.push(
        `${contractId}: expected OWNER_AUTHORIZED_PRODUCT_CONTRACT, found ${section.classification ?? "missing"}`,
      );
    }
    if (!section.source?.includes("§")) {
      failures.push(`${contractId}: source must retain the Product Vision boundary`);
    }
    if (!section.source?.includes(ownerRecord)) {
      failures.push(`${contractId}: source must cite owner record ${ownerRecord}`);
    }
  }

  return failures;
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

  const validContractStructure = [...expectedProductContractIds]
    .map((contractId) => {
      if (contractId.startsWith("YWAY-E")) {
        return `## ${contractId}: Fixture invariant
- **Derived from:** YWAY-P001
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT`;
      }

      const classification = ownerAuthorizedContracts.has(contractId)
        ? "OWNER_AUTHORIZED_PRODUCT_CONTRACT"
        : "DIRECT_PRODUCT_CONTRACT";
      const ownerRecord = ownerAuthorizedContracts.get(contractId);
      const source = ownerRecord ? `§7; \`${ownerRecord}\`` : "§7";

      return `## ${contractId}: Fixture contract
- **Source:** ${source}
- **Classification:** ${classification}`;
    })
    .join("\n\n");

  if (inspectProductContractStructure(validContractStructure).length !== 0) {
    failures.push("valid Product Contract authority structure was rejected");
  }

  const misclassifiedOwnerContract = validContractStructure.replace(
    "## YWAY-P008: Fixture contract\n- **Source:** §7; `docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md`\n- **Classification:** OWNER_AUTHORIZED_PRODUCT_CONTRACT",
    "## YWAY-P008: Fixture contract\n- **Source:** §7; `docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md`\n- **Classification:** DIRECT_PRODUCT_CONTRACT",
  );
  if (
    !inspectProductContractStructure(misclassifiedOwnerContract).some((failure) =>
      failure.includes("YWAY-P008: expected OWNER_AUTHORIZED_PRODUCT_CONTRACT"),
    )
  ) {
    failures.push("owner-authorized contract misclassification was not detected");
  }

  const missingOwnerRecord = validContractStructure.replace(
    "## YWAY-P019: Fixture contract\n- **Source:** §7; `docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md`",
    "## YWAY-P019: Fixture contract\n- **Source:** §7",
  );
  if (
    !inspectProductContractStructure(missingOwnerRecord).some((failure) =>
      failure.includes("YWAY-P019: source must cite owner record"),
    )
  ) {
    failures.push("missing owner-decision source was not detected");
  }

  const malformedContractId = validContractStructure.replace("## YWAY-P010:", "## YWAY-P10:");
  const malformedContractFailures = inspectProductContractStructure(malformedContractId);
  if (
    !malformedContractFailures.some((failure) =>
      failure.includes("YWAY-P010: expected stable contract ID is missing"),
    ) ||
    !malformedContractFailures.some((failure) =>
      failure.includes("YWAY-P10: unexpected Product Contract ID"),
    )
  ) {
    failures.push("missing or malformed stable Product Contract ID was not detected");
  }

  const duplicateContractId = `${validContractStructure}\n\n${validContractStructure.slice(
    validContractStructure.indexOf("## YWAY-P010:"),
    validContractStructure.indexOf("## YWAY-P011:"),
  )}`;
  if (
    !inspectProductContractStructure(duplicateContractId).some((failure) =>
      failure.includes("YWAY-P010: stable contract ID appears 2 times"),
    )
  ) {
    failures.push("duplicate stable Product Contract ID was not detected");
  }

  const unsupportedOwnerContract = validContractStructure
    .replace(
      "## YWAY-P010: Fixture contract\n- **Source:** §7",
      "## YWAY-P010: Fixture contract\n- **Source:** §7; `docs/audits/DOES-NOT-EXIST.md`",
    )
    .replace(
      "## YWAY-P010: Fixture contract\n- **Source:** §7; `docs/audits/DOES-NOT-EXIST.md`\n- **Classification:** DIRECT_PRODUCT_CONTRACT",
      "## YWAY-P010: Fixture contract\n- **Source:** §7; `docs/audits/DOES-NOT-EXIST.md`\n- **Classification:** OWNER_AUTHORIZED_PRODUCT_CONTRACT",
    );
  if (
    !inspectProductContractStructure(unsupportedOwnerContract).some((failure) =>
      failure.includes(
        "YWAY-P010: owner-authorized contract has no registered owner-decision record",
      ),
    )
  ) {
    failures.push("unsupported owner-authorized contract was not detected");
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
  const contractFailures = inspectProductContractStructure(
    readFileSync(productContractsPath, "utf8"),
  );

  if (contractFailures.length > 0) {
    for (const failure of contractFailures) {
      console.error("FAIL  YINV-CONTRACT-STRUCTURE-001");
      console.error(`      ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS  Product Contract authority and classification structure");

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
  runSelfTest();
  runRepositoryCheck();
} else if (arguments_.length === 1 && arguments_[0] === "--self-test") {
  runSelfTest();
} else {
  console.error("Usage: node --import tsx scripts/check-product-invariants.ts [--self-test]");
  process.exit(2);
}
