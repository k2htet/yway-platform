import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test, type TestContext } from "node:test";
import {
  computeProvenanceEventDigest,
  loadReleasedBundle,
  requireFullCommitSha,
  runRetireCommand,
  runVerifyCommand,
  sha256Hex,
  snapshotIndexBytes,
  verifyArtifactSnapshot,
} from "../content/index.js";
import { compareArtifactPaths } from "../content/snapshot-index.js";
import { inspectSnapshotVersion } from "../content/snapshot-verify.js";
import { releaseBundlePath } from "../content/store.js";
import {
  commandOptions,
  expectExit,
  expectFailureMessage,
  releaseFixturePack,
  snapshotIndexPath,
  type ReleasedFixture,
} from "./content-cli-fixtures.js";

/**
 * Hermetic git invocation for the temporary repositories.
 *
 * Global and system git configuration, hooks, and templates are neutralized so a
 * developer's or CI runner's own settings cannot make these tests fail or change
 * their meaning.
 */
const emptyGitConfig = join(tmpdir(), "yway-empty-git-config");
const emptyHooks = join(tmpdir(), "yway-empty-git-hooks");

function gitEnv(): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: emptyGitConfig,
    GIT_CONFIG_SYSTEM: emptyGitConfig,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_DATE: "2026-09-24T00:00:00Z",
    GIT_COMMITTER_DATE: "2026-09-24T00:00:00Z",
  };
}

function git(root: string, ...args: string[]): string {
  return execFileSync(
    "git",
    [
      "-c",
      `core.hooksPath=${emptyHooks}`,
      "-c",
      "commit.gpgsign=false",
      "-c",
      "init.templateDir=",
      ...args,
    ],
    { cwd: root, encoding: "utf8", env: gitEnv() },
  ).trim();
}

function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { encoding: "utf8", env: gitEnv() });
    return true;
  } catch {
    return false;
  }
}

const temporaryRoots: string[] = [];

after(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function commitAll(root: string, message: string): string {
  git(root, "add", "-A");
  git(root, "commit", "-qm", message);
  return git(root, "rev-parse", "HEAD");
}

function initRepository(root: string): void {
  git(root, "init", "-q", "--template=");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "user.name", "Fixture Operator");
}

function pinnedRepository(): { root: string; fixture: ReleasedFixture; commit: string } {
  const root = makeSnapshotRoot();
  const fixture = releaseFixturePack(root);
  initRepository(root);
  const commit = commitAll(root, "release fixture pack");
  return { root, fixture, commit };
}

function makeSnapshotRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "yway-snapshot-"));
  temporaryRoots.push(root);
  return root;
}

function retireFixture(root: string, fixture: ReleasedFixture): void {
  expectExit(
    runRetireCommand(
      [
        "--pack",
        fixture.pack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "synthetic retirement for snapshot coverage",
      ],
      commandOptions(root),
    ),
    0,
  );
}

// Git-backed tests need a real Git executable and permission to spawn it. When
// that is unavailable they are reported as skipped, never as passed.
type GitTestFn = (t: TestContext) => void | Promise<void>;
const gitTest: (name: string, run: GitTestFn) => void = gitAvailable()
  ? (test as unknown as (name: string, run: GitTestFn) => void)
  : (name, run) => test.skip(`${name} (git unavailable)`, run as () => void);

gitTest(
  "a trusted snapshot verifies the complete artifact inventory against the pinned tree",
  () => {
    const { root, fixture, commit } = pinnedRepository();
    const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
    assert.deepEqual([...snapshot.files.keys()].sort(), [
      "bundles/fixture-local-guide/1/bundle.json",
      "manifests/fixture-local-guide/1/manifest.json",
      "snapshot-index.json",
    ]);
    assert.equal(snapshot.index.entries.length, 2);
    assert.equal(snapshot.trustedCommit, commit);
    assert.equal(fixture.bundleDigest.length, 64);
  },
);

gitTest("a released bundle loads from a trusted snapshot without any authoring source", () => {
  const { root, fixture, commit } = pinnedRepository();
  rmSync(join(root, "content"), { recursive: true, force: true });

  const loaded = loadReleasedBundle({
    repositoryRoot: root,
    trustedCommit: commit,
    packId: fixture.pack.id,
    packVersion: 1,
  });
  assert.equal(loaded.trustedCommit, commit);
  assert.equal(loaded.entry.bundle.packId, fixture.pack.id);
  assert.equal(loaded.entry.bundle.provenance.events.at(-1)!.type, "artifact-released");
  assert.equal(loaded.entry.manifest.classification, "fixture");
  assert.equal(loaded.entry.retired, false);
  assert.equal(existsSync(join(root, "content")), false);
});

gitTest("content:verify --trusted-commit validates the artifact-only snapshot", () => {
  const { root, commit } = pinnedRepository();
  const result = expectExit(
    runVerifyCommand(["--trusted-commit", commit], commandOptions(root)),
    0,
  );
  const report = JSON.parse(result.stdout ?? "{}") as {
    mode: string;
    trustedCommit: string;
    artifacts: string[];
    indexEntries: number;
  };
  assert.equal(report.mode, "trusted-snapshot");
  assert.equal(report.trustedCommit, commit);
  assert.equal(report.indexEntries, 2);
  assert.equal(report.artifacts.length, 3);
});

gitTest("trusted snapshot verification refuses invalid pins and never infers trust", () => {
  const { root, commit } = pinnedRepository();
  for (const pin of ["HEAD", "main", commit.slice(0, 12), "z".repeat(40), ""]) {
    assert.throws(
      () => verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: pin }),
      /must be a full immutable commit SHA/,
    );
  }
  // A full but unresolvable SHA is refused rather than silently downgraded.
  for (const unresolvable of ["0".repeat(40), "1".repeat(40)]) {
    assert.throws(
      () => verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: unresolvable }),
      /is not a resolvable commit/,
    );
    const missing = runVerifyCommand(["--trusted-commit", unresolvable], commandOptions(root));
    expectExit(missing, 1);
    expectFailureMessage(missing, "is not a resolvable commit");
  }

  // Local digest agreement alone is not trust: a commit that does not contain the
  // artifacts is refused.
  const withoutArtifacts = makeSnapshotRoot();
  writeFileSync(join(withoutArtifacts, "README.md"), "no artifacts here\n", "utf8");
  initRepository(withoutArtifacts);
  const emptyCommit = commitAll(withoutArtifacts, "initial commit without artifacts");
  const refused = runVerifyCommand(
    ["--trusted-commit", emptyCommit],
    commandOptions(withoutArtifacts),
  );
  expectExit(refused, 1);
  expectFailureMessage(refused, "is missing from the trusted snapshot");
});

test("snapshot index ordering is locale-independent", () => {
  // The comparator must be code-unit based: a host collation that sorts "10" before
  // "2", or ignores punctuation, would change the committed index bytes.
  const paths = [
    "bundles/fixture-local-guide/1/bundle.json",
    "bundles/fixture-local-guide/10/bundle.json",
    "bundles/fixture-local-guide/2/bundle.json",
    "manifests/fixture-local-guide/1/manifest.json",
    "retirements/fixture-local-guide/1.json",
  ];
  const underDefaultLocale = [...paths].sort(compareArtifactPaths);
  const previousLocale = process.env["LC_ALL"];
  process.env["LC_ALL"] = "C";
  try {
    assert.deepEqual([...paths].sort(compareArtifactPaths), underDefaultLocale);
  } finally {
    if (previousLocale === undefined) {
      delete process.env["LC_ALL"];
    } else {
      process.env["LC_ALL"] = previousLocale;
    }
  }
  assert.deepEqual(
    underDefaultLocale,
    [...paths].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
  );
});

test("requireFullCommitSha accepts only full lowercase hex commit ids", () => {
  assert.equal(requireFullCommitSha("a".repeat(40)), "a".repeat(40));
  assert.equal(requireFullCommitSha("b".repeat(64)), "b".repeat(64));
  for (const bad of ["A".repeat(40), "a".repeat(39), "a".repeat(41), "a".repeat(63), "main"]) {
    assert.throws(() => requireFullCommitSha(bad), /must be a full immutable commit SHA/);
  }
});

gitTest("a retired snapshot still passes integrity verification but cannot be loaded", () => {
  const { root, fixture, commit } = pinnedRepository();
  retireFixture(root, fixture);
  const retiredCommit = commitAll(root, "retire the released fixture pack");

  const snapshot = verifyArtifactSnapshot({
    repositoryRoot: root,
    trustedCommit: retiredCommit,
  });
  const entry = inspectSnapshotVersion(snapshot, fixture.pack.id, 1);
  assert.equal(entry.retired, true);
  assert.equal(entry.notice?.releaseManifestDigest !== undefined, true);

  assert.throws(
    () =>
      loadReleasedBundle({
        repositoryRoot: root,
        trustedCommit: retiredCommit,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /a retired version must not be loaded/,
  );
  assert.notEqual(commit, retiredCommit);
});

gitTest("deleting only a retirement notice is detected against the trusted snapshot", () => {
  const { root, fixture } = pinnedRepository();
  retireFixture(root, fixture);
  const retiredCommit = commitAll(root, "retire the released fixture pack");
  expectExit(runVerifyCommand(["--trusted-commit", retiredCommit], commandOptions(root)), 0);

  unlinkSync(join(root, "artifacts", "retirements", fixture.pack.id, "1.json"));
  const missing = runVerifyCommand(["--trusted-commit", retiredCommit], commandOptions(root));
  expectExit(missing, 1);
  expectFailureMessage(missing, "pinned by trusted commit");
  assert.throws(
    () =>
      loadReleasedBundle({
        repositoryRoot: root,
        trustedCommit: retiredCommit,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /is missing locally/,
  );
});

gitTest(
  "deleting a retirement notice and rewriting the index is detected against the trusted snapshot",
  () => {
    const { root, fixture } = pinnedRepository();
    retireFixture(root, fixture);
    const retiredCommit = commitAll(root, "retire the released fixture pack");

    // An attacker deletes the notice and rewrites the index so the omission is
    // self-consistent, then commits. The caller's trusted commit is unchanged.
    unlinkSync(join(root, "artifacts", "retirements", fixture.pack.id, "1.json"));
    const indexPath = snapshotIndexPath(root);
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      schemaVersion: number;
      entries: Record<string, unknown>[];
    };
    index.entries = index.entries.filter((entry) => entry["kind"] !== "retirement-notice");
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    const rewrittenCommit = commitAll(root, "hide the retirement notice");

    // Against the rewritten tree the snapshot is internally consistent...
    expectExit(runVerifyCommand(["--trusted-commit", rewrittenCommit], commandOptions(root)), 0);
    // ...but it is not the snapshot the caller trusts.
    const detected = runVerifyCommand(["--trusted-commit", retiredCommit], commandOptions(root));
    expectExit(detected, 1);
    expectFailureMessage(detected, "pinned by trusted commit");
    assert.throws(
      () =>
        loadReleasedBundle({
          repositoryRoot: root,
          trustedCommit: retiredCommit,
          packId: fixture.pack.id,
          packVersion: 1,
        }),
      /pinned by trusted commit/,
    );
    // The historical bundle bytes are unchanged by any of this; only the trusted
    // root distinguishes the two trees, which is exactly why trust acquisition and
    // snapshot refresh stay out of Stage 2 scope.
    const loaded = loadReleasedBundle({
      repositoryRoot: root,
      trustedCommit: rewrittenCommit,
      packId: fixture.pack.id,
      packVersion: 1,
    });
    assert.equal(loaded.entry.bundle.releasedAt, "2026-09-24T00:00:00Z");
    assert.equal(loaded.entry.retired, false);
  },
);

gitTest("a trusted snapshot refuses a symlink planted in the local artifact root", () => {
  const { root, fixture, commit } = pinnedRepository();
  const stray = join(root, "artifacts", "bundles", "fixture-other", "1", "bundle.json");
  mkdirSync(join(stray, ".."), { recursive: true });
  symlinkSync(join(root, "artifacts", "bundles", fixture.pack.id, "1", "bundle.json"), stray);
  const result = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "must not contain symbolic links");
});

gitTest("a trusted snapshot refuses a regular file absent from the pinned commit", () => {
  const { root, commit } = pinnedRepository();
  const stray = join(root, "artifacts", "bundles", "fixture-local-guide", "2", "bundle.json");
  mkdirSync(join(stray, ".."), { recursive: true });
  writeFileSync(stray, "{}\n", "utf8");
  const result = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "is not present in trusted commit");
  assert.throws(
    () => verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit }),
    /is not present in trusted commit/,
  );
});

gitTest("a trusted snapshot refuses a symlink committed inside the artifact root", () => {
  const { root } = pinnedRepository();
  const stray = join(root, "artifacts", "bundles", "fixture-local-guide", "2");
  mkdirSync(stray, { recursive: true });
  symlinkSync("../../../manifests/fixture-local-guide/1/manifest.json", join(stray, "bundle.json"));
  const commit = commitAll(root, "commit a symlinked bundle");
  const result = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "the artifact inventory must contain regular files only");
});

gitTest("a trusted snapshot refuses an index entry at a non-canonical path", () => {
  const { root, fixture, commit } = pinnedRepository();
  const indexPath = snapshotIndexPath(root);

  // Move the bundle to a legal-looking but non-canonical artifact path and rewrite
  // every digest so the snapshot is internally consistent apart from the path.
  const moved = join(root, "artifacts", "bundles", "moved", "bundle.json");
  mkdirSync(join(moved, ".."), { recursive: true });
  renameSync(releaseBundlePath(root, fixture.pack.id, 1), moved);
  const manifestFile = join(root, "artifacts", "manifests", fixture.pack.id, "1", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
  (manifest["bundle"] as Record<string, string>)["path"] = "bundles/moved/bundle.json";
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const bundleBytes = readFileSync(moved);
  const manifestBytes = readFileSync(manifestFile);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.map((entry) =>
    entry["kind"] === "bundle"
      ? { ...entry, path: "bundles/moved/bundle.json", digest: sha256Hex(bundleBytes) }
      : { ...entry, digest: sha256Hex(manifestBytes) },
  );
  writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");
  const movedCommit = commitAll(root, "move the bundle to a non-canonical path");

  // The snapshot is internally consistent, so only the consumer's canonical-path
  // requirement refuses to resolve this version.
  expectExit(runVerifyCommand(["--trusted-commit", movedCommit], commandOptions(root)), 0);
  assert.throws(
    () =>
      loadReleasedBundle({
        repositoryRoot: root,
        trustedCommit: movedCommit,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /not the canonical bundles\/fixture-local-guide\/1\/bundle.json/,
  );
  assert.notEqual(movedCommit, commit);
});

gitTest("a trusted snapshot refuses an out-of-order pinned index", () => {
  const { root } = pinnedRepository();
  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  // Write the reversed order as raw bytes: the digests are unchanged, so only the
  // canonical-rendering requirement can catch this.
  const reversedBytes = `${JSON.stringify(
    { schemaVersion: index.schemaVersion, entries: [...index.entries].reverse() },
    null,
    2,
  )}\n`;
  assert.notEqual(reversedBytes, readFileSync(indexPath, "utf8"));
  writeFileSync(indexPath, reversedBytes, "utf8");
  const commit = commitAll(root, "reorder the snapshot index");
  const result = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "not the canonical deterministic rendering");
});

gitTest("a consumer refuses a version whose release-manifest entry is absent", () => {
  const { root, fixture, commit } = pinnedRepository();
  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  rmSync(join(root, "artifacts", "manifests", fixture.pack.id, "1", "manifest.json"));
  writeFileSync(
    indexPath,
    snapshotIndexBytes(
      index.entries.filter((entry) => entry["kind"] !== "release-manifest") as never,
    ),
    "utf8",
  );
  const trimmedCommit = commitAll(root, "remove the release manifest and its index entry");
  assert.throws(
    () =>
      loadReleasedBundle({
        repositoryRoot: root,
        trustedCommit: trimmedCommit,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /has no release-manifest entry/,
  );
  assert.notEqual(trimmedCommit, commit);
});

gitTest("a trusted snapshot ignores a local git replace ref for the trusted commit", () => {
  const { root, commit } = pinnedRepository();

  // Build a commit whose tree has no `artifacts/` directory at all, then register
  // it as `refs/replace/<trustedCommit>`. Plain Git resolves the replacement, so a
  // verifier that honoured replace refs would read an empty artifact root for the
  // commit the caller named.
  const artifacts = join(root, "artifacts");
  const parked = join(root, "parked-artifacts");
  renameSync(artifacts, parked);
  writeFileSync(join(root, "unrelated.txt"), "no artifacts here\n", "utf8");
  const emptyCommit = commitAll(root, "a commit whose tree has no artifacts");
  renameSync(parked, artifacts);
  git(root, "replace", commit, emptyCommit);

  // Plain Git now substitutes the replacement for the caller's pin...
  assert.equal(
    git(root, "rev-parse", `${commit}^{tree}`),
    git(root, "rev-parse", `${emptyCommit}^{tree}`),
  );
  // ...but the verifier still reads the real pinned tree.
  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
  assert.deepEqual([...snapshot.files.keys()].sort(), [
    "bundles/fixture-local-guide/1/bundle.json",
    "manifests/fixture-local-guide/1/manifest.json",
    "snapshot-index.json",
  ]);
  // And the artifact-free commit genuinely has no snapshot to verify, which is the
  // failure a replace-ref-respecting verifier would have reported for the real pin.
  const refused = runVerifyCommand(["--trusted-commit", emptyCommit], commandOptions(root));
  expectExit(refused, 1);
  expectFailureMessage(refused, "is not present in trusted commit");
});

gitTest("a committed artifact cannot be substituted in the working tree", () => {
  const { root, fixture, commit } = pinnedRepository();
  // The local index is rewritten to agree with the substituted bundle, so only the
  // pinned-tree byte comparison can catch the substitution.
  const path = releaseBundlePath(root, fixture.pack.id, 1);
  const bundle = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  (bundle["summary"] as string) = "A substituted summary that no release ever reviewed.";
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const manifestFile = join(root, "artifacts", "manifests", fixture.pack.id, "1", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
  (manifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(readFileSync(path));
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.map((entry) => {
    if (entry["kind"] === "bundle") {
      return { ...entry, digest: sha256Hex(readFileSync(path)) };
    }
    return { ...entry, digest: sha256Hex(readFileSync(manifestFile)) };
  });
  writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");

  // git records the substitution...
  const substituted = commitAll(root, "substitute a released bundle");
  assert.notEqual(substituted, commit);
  // ...and that tree verifies, because the caller chose to trust it.
  expectExit(runVerifyCommand(["--trusted-commit", substituted], commandOptions(root)), 0);
  // The caller's original pin does not: the committed bytes differ.
  const detected = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(detected, 1);
  expectFailureMessage(detected, "does not match the bytes pinned by trusted commit");
});

gitTest("a consumer refuses a retirement notice that does not bind its version", async (t) => {
  for (const field of ["contentDigest", "releaseManifestDigest", "packId"] as const) {
    await t.test(`altered ${field}`, () => {
      const { root, fixture } = pinnedRepository();
      retireFixture(root, fixture);
      const noticePath = join(root, "artifacts", "retirements", fixture.pack.id, "1.json");
      const notice = JSON.parse(readFileSync(noticePath, "utf8")) as Record<string, unknown>;
      notice[field] = field === "packId" ? "fixture-other-pack" : "0".repeat(64);
      writeFileSync(noticePath, `${JSON.stringify(notice, null, 2)}\n`, "utf8");

      // Keep the index agreeing so only the notice bindings can catch it.
      const indexPath = snapshotIndexPath(root);
      const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
        schemaVersion: number;
        entries: Record<string, unknown>[];
      };
      index.entries = index.entries.map((entry) =>
        entry["kind"] === "retirement-notice"
          ? { ...entry, digest: sha256Hex(readFileSync(noticePath)) }
          : entry,
      );
      writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");
      const tampered = commitAll(root, `alter the retirement notice ${field}`);

      const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: tampered });
      if (field === "packId") {
        assert.throws(
          () => inspectSnapshotVersion(snapshot, fixture.pack.id, 1),
          /does not identify/,
        );
        return;
      }
      assert.throws(
        () => inspectSnapshotVersion(snapshot, fixture.pack.id, 1),
        field === "contentDigest"
          ? /does not bind bundle content digest/
          : /does not bind the release manifest/,
      );
    });
  }
});

gitTest("a trusted snapshot refuses a symlinked artifact root", () => {
  const { root, commit } = pinnedRepository();
  const parked = join(root, "parked-artifacts");
  renameSync(join(root, "artifacts"), parked);
  symlinkSync(parked, join(root, "artifacts"));
  const result = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "the artifact root must be a real directory");
});

gitTest("a trusted snapshot refuses an artifact nested beyond the depth bound", () => {
  const { root, commit } = pinnedRepository();
  let deep = join(root, "artifacts");
  for (let level = 0; level < 40; level += 1) {
    deep = join(deep, `level-${level}`);
  }
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, "bundle.json"), "{}\n", "utf8");
  const result = runVerifyCommand(["--trusted-commit", commit], commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "nested deeper than");
});

gitTest("a trusted snapshot ignores inherited git environment redirection", () => {
  const { root, commit } = pinnedRepository();
  const other = makeSnapshotRoot();
  initRepository(other);
  writeFileSync(join(other, "README.md"), "elsewhere\n", "utf8");
  commitAll(other, "unrelated history elsewhere");

  // Point every repository-redirecting variable at a different repository. The
  // verifier must still read the tree pinned in its own repository root.
  const variables = [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  ];
  for (const variable of variables) {
    process.env[variable] = join(other, ".git");
  }
  try {
    const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
    assert.deepEqual([...snapshot.files.keys()].sort(), [
      "bundles/fixture-local-guide/1/bundle.json",
      "manifests/fixture-local-guide/1/manifest.json",
      "snapshot-index.json",
    ]);
  } finally {
    for (const variable of variables) {
      delete process.env[variable];
    }
  }
});

gitTest(
  "a consumer refuses a bundle whose provenance head disagrees with the release manifest",
  () => {
    const { root, fixture, commit } = pinnedRepository();
    const path = releaseBundlePath(root, fixture.pack.id, 1);
    const bundle = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const provenance = bundle["provenance"] as { events: Record<string, unknown>[] };

    // Reseal the whole chain at a different release instant, keeping everything else
    // internally valid. Only the manifest's `releasedAt` anchor can catch this.
    const resealed: Record<string, unknown>[] = [];
    for (const [position, event] of provenance.events.entries()) {
      const fields: Record<string, unknown> = {
        ...event,
        previousEventDigest:
          resealed[position - 1]?.["eventDigest"] ?? event["previousEventDigest"],
      };
      if (position === provenance.events.length - 1) {
        fields["recordedAt"] = "2026-09-23T23:59:59Z";
      }
      const preImage = { ...fields };
      delete preImage["eventDigest"];
      resealed.push({ ...fields, eventDigest: computeProvenanceEventDigest(preImage as never) });
    }
    provenance.events = resealed;
    writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

    const manifestFile = join(
      root,
      "artifacts",
      "manifests",
      fixture.pack.id,
      "1",
      "manifest.json",
    );
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
    (manifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(readFileSync(path));
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const indexPath = snapshotIndexPath(root);
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      schemaVersion: number;
      entries: Record<string, unknown>[];
    };
    index.entries = index.entries.map((entry) => {
      if (entry["kind"] === "bundle") {
        return { ...entry, digest: sha256Hex(readFileSync(path)) };
      }
      return { ...entry, digest: sha256Hex(readFileSync(manifestFile)) };
    });
    writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");
    const resealedCommit = commitAll(root, "reseal the bundle at a different release instant");

    // The snapshot itself is internally consistent and verifies; the consumer's
    // manifest anchor is what refuses it.
    expectExit(runVerifyCommand(["--trusted-commit", resealedCommit], commandOptions(root)), 0);
    assert.throws(
      () =>
        loadReleasedBundle({
          repositoryRoot: root,
          trustedCommit: resealedCommit,
          packId: fixture.pack.id,
          packVersion: 1,
        }),
      /does not end at the release event the release manifest records/,
    );
    assert.notEqual(resealedCommit, commit);
  },
);

gitTest("a consumer refuses a bundle whose embedded provenance contradicts its own digest", () => {
  const { root, fixture, commit } = pinnedRepository();
  const path = releaseBundlePath(root, fixture.pack.id, 1);
  const bundle = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const provenance = bundle["provenance"] as { events: Record<string, unknown>[] };
  provenance.events[0]!["contentDigest"] = "0".repeat(64);
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  // Rebind the manifest and index to the edited bundle so only the provenance
  // cross-check against `bundle.contentDigest` can catch the contradiction.
  const manifestFile = join(root, "artifacts", "manifests", fixture.pack.id, "1", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
  (manifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(readFileSync(path));
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  rebindDigest(root, fixture.pack.id, 1, path, manifestFile);
  const tampered = commitAll(root, "reseal a bundle whose genesis binds another digest");

  expectExit(runVerifyCommand(["--trusted-commit", tampered], commandOptions(root)), 0);
  assert.throws(
    () =>
      loadReleasedBundle({
        repositoryRoot: root,
        trustedCommit: tampered,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /conflicting content digests|does not match the source-derived digest/,
  );
  assert.notEqual(tampered, commit);
});

gitTest(
  "a consumer refuses a manifest that overclaims classification or drops a deferral",
  async (t) => {
    for (const change of [
      {
        label: "production classification",
        mutate: (gates: Record<string, unknown>, manifest: Record<string, unknown>) => {
          manifest["classification"] = "production";
        },
      },
      {
        label: "no runtime-accessibility deferral",
        mutate: (gates: Record<string, unknown>) => {
          delete gates["runtimeAccessibilityDeferred"];
        },
      },
      {
        label: "no comprehension deferral",
        mutate: (gates: Record<string, unknown>) => {
          delete gates["targetUserComprehensionDeferred"];
        },
      },
    ]) {
      await t.test(change.label, () => {
        const { root, fixture, commit } = pinnedRepository();
        const manifestFile = join(
          root,
          "artifacts",
          "manifests",
          fixture.pack.id,
          "1",
          "manifest.json",
        );
        const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
        change.mutate(manifest["gates"] as Record<string, unknown>, manifest);
        writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
        rebindDigest(
          root,
          fixture.pack.id,
          1,
          releaseBundlePath(root, fixture.pack.id, 1),
          manifestFile,
        );
        const tampered = commitAll(root, `overclaim ${change.label}`);

        expectExit(runVerifyCommand(["--trusted-commit", tampered], commandOptions(root)), 0);
        assert.throws(
          () =>
            loadReleasedBundle({
              repositoryRoot: root,
              trustedCommit: tampered,
              packId: fixture.pack.id,
              packVersion: 1,
            }),
          /classification|deferred/,
        );
        assert.notEqual(tampered, commit);
      });
    }
  },
);

/** Rewrites the snapshot index so it agrees with locally edited artifact bytes. */
function rebindDigest(
  root: string,
  packId: string,
  version: number,
  bundleFile: string,
  manifestFile = join(root, "artifacts", "manifests", packId, String(version), "manifest.json"),
): void {
  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.map((entry) => {
    if (entry["kind"] === "bundle") {
      return { ...entry, digest: sha256Hex(readFileSync(bundleFile)) };
    }
    return { ...entry, digest: sha256Hex(readFileSync(manifestFile)) };
  });
  writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");
}

gitTest(
  "a trusted snapshot requires the bundle and release-manifest entries for the version",
  () => {
    const { root, fixture, commit } = pinnedRepository();
    const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
    assert.throws(
      () => inspectSnapshotVersion(snapshot, fixture.pack.id, 2),
      /has no bundle entry for fixture-local-guide version 2/,
    );
    assert.throws(
      () =>
        loadReleasedBundle({
          repositoryRoot: root,
          trustedCommit: commit,
          packId: fixture.pack.id,
          packVersion: 2,
        }),
      /has no bundle entry/,
    );
  },
);

gitTest("a shell metacharacter pin is refused as an invalid identifier, never executed", () => {
  const { root, commit } = pinnedRepository();
  for (const payload of [
    "$(touch pwned)",
    "`touch pwned`",
    "abc; touch pwned",
    "../../etc/passwd",
  ]) {
    const result = runVerifyCommand(["--trusted-commit", payload], commandOptions(root));
    expectExit(result, 1);
    expectFailureMessage(result, "must be a full immutable commit SHA");
  }
  assert.equal(existsSync(join(root, "pwned")), false);
  assert.equal(/^[0-9a-f]{40}$/.test(commit), true);
});

gitTest("a trusted snapshot refuses a non-fixture actor identity inside a bundle", () => {
  const { root, fixture, commit } = pinnedRepository();
  const path = releaseBundlePath(root, fixture.pack.id, 1);
  const bundle = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const provenance = bundle["provenance"] as { events: Record<string, unknown>[] };
  const actorId = provenance.events[3]!["actorId"];
  assert.equal(String(actorId).startsWith("fixture-"), true);

  // Reseal the whole chain with a real-looking practitioner identity, so the chain
  // is internally valid and only the fixture-identity rule can catch it.
  const resealed: Record<string, unknown>[] = [];
  for (const [position, event] of provenance.events.entries()) {
    const previous = resealed[position - 1];
    const fields =
      position === 3
        ? {
            ...event,
            actorId: "external-practitioner",
            previousEventDigest: previous?.["eventDigest"] ?? event["previousEventDigest"],
          }
        : {
            ...event,
            previousEventDigest: previous?.["eventDigest"] ?? event["previousEventDigest"],
          };
    const preImage: Record<string, unknown> = { ...fields };
    delete preImage["eventDigest"];
    resealed.push({ ...fields, eventDigest: computeProvenanceEventDigest(preImage as never) });
  }
  provenance.events = resealed;
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  // Keep the snapshot internally consistent so only the fixture-identity rule can
  // catch the substituted actor identity.
  const manifestFile = join(root, "artifacts", "manifests", fixture.pack.id, "1", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
  (manifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(readFileSync(path));
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.map((entry) => {
    if (entry["kind"] === "bundle") {
      return { ...entry, digest: sha256Hex(readFileSync(path)) };
    }
    return { ...entry, digest: sha256Hex(readFileSync(manifestFile)) };
  });
  writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");
  const tamperedCommit = commitAll(root, "reseal a bundle with a real-looking actor identity");

  expectExit(runVerifyCommand(["--trusted-commit", tamperedCommit], commandOptions(root)), 0);
  assert.throws(
    () =>
      loadReleasedBundle({
        repositoryRoot: root,
        trustedCommit: tamperedCommit,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /must use a fixture- actor identity/,
  );
  assert.notEqual(tamperedCommit, commit);
});
