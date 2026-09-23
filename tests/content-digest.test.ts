import assert from "node:assert/strict";
import { test } from "node:test";
import {
  StrictValidationError,
  canonicalJson,
  contentDigest,
  sha256Hex,
} from "../content/index.js";

function expectCanonicalFailure(run: () => unknown, fragment: string): void {
  try {
    run();
  } catch (error) {
    assert.ok(
      error instanceof StrictValidationError,
      `expected StrictValidationError, received ${error instanceof Error ? error.message : String(error)}`,
    );
    assert.ok(
      error.message.includes(fragment),
      `expected error to include "${fragment}", received: ${error.message}`,
    );
    return;
  }
  assert.fail("expected canonicalization to fail, but it succeeded");
}

test("canonicalJson sorts object keys deterministically", () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(canonicalJson({ a: 1, b: 2 }), canonicalJson({ b: 2, a: 1 }));
});

test("canonicalJson sorts nested keys at every depth", () => {
  const left = { z: { y: 1, x: 2 }, a: [{ c: 3, b: 4 }] };
  const right = { a: [{ b: 4, c: 3 }], z: { x: 2, y: 1 } };
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(canonicalJson(left), '{"a":[{"b":4,"c":3}],"z":{"x":2,"y":1}}');
});

test("canonicalJson preserves array order", () => {
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
  assert.equal(canonicalJson([1, 2]), "[1,2]");
});

test("canonicalJson serializes null, booleans, and strings like JSON", () => {
  assert.equal(canonicalJson(null), "null");
  assert.equal(canonicalJson(true), "true");
  assert.equal(canonicalJson(false), "false");
  assert.equal(canonicalJson("hello"), '"hello"');
  assert.equal(canonicalJson(""), '""');
  assert.equal(canonicalJson('quote " and \\'), '"quote \\" and \\\\"');
});

test("contentDigest golden vectors match SHA-256 of canonical bytes", () => {
  assert.equal(sha256Hex("{}"), "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
  assert.equal(
    sha256Hex('{"a":1,"b":2}'),
    "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
  );
  assert.equal(contentDigest({ b: 2, a: 1 }), contentDigest({ a: 1, b: 2 }));
  assert.equal(
    contentDigest({ b: 2, a: 1 }),
    "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
  );
  assert.equal(contentDigest({}), sha256Hex("{}"));
});

test("canonical digests differ from naive JSON.stringify order", () => {
  const naive = sha256Hex(JSON.stringify({ b: 2, a: 1 }));
  const canonical = contentDigest({ b: 2, a: 1 });
  assert.equal(naive, "3fb75453225c732a76b7899ea2096dda1455189c89817239732182f73fe5a09f");
  assert.notEqual(naive, canonical);
});

test("contentDigest is stable across repeated computation", () => {
  const value = {
    title: "Try being a local guide",
    version: 1,
    occupations: ["local-guide", "tour-guide"],
    flags: { fixtureOnly: true, aiAssisted: false },
  };
  assert.equal(contentDigest(value), contentDigest(structuredClone(value)));
  assert.match(contentDigest(value), /^[0-9a-f]{64}$/);
});

test("contentDigest is sensitive to any field change", () => {
  const base = { title: "A", version: 1, nested: { flag: true } };
  const changedTitle = { ...base, title: "B" };
  const changedVersion = { ...base, version: 2 };
  const changedNested = { ...base, nested: { flag: false } };
  const digests = new Set([
    contentDigest(base),
    contentDigest(changedTitle),
    contentDigest(changedVersion),
    contentDigest(changedNested),
  ]);
  assert.equal(digests.size, 4);
});

test("contentDigest handles Unicode content deterministically", () => {
  const left = { t: "ကခ", s: "မြန်မာ" };
  const right = { s: "မြန်မာ", t: "ကခ" };
  assert.equal(contentDigest(left), contentDigest(right));
  assert.equal(contentDigest({ t: "ကခ" }), sha256Hex('{"t":"ကခ"}'));
});

test("contentDigest treats -0 and 0 identically", () => {
  assert.equal(contentDigest({ n: -0 }), contentDigest({ n: 0 }));
});

test("canonicalJson rejects non-finite numbers", () => {
  expectCanonicalFailure(() => canonicalJson({ n: Number.NaN }), "non-finite");
  expectCanonicalFailure(() => canonicalJson({ n: Number.POSITIVE_INFINITY }), "non-finite");
  expectCanonicalFailure(() => canonicalJson({ n: Number.NEGATIVE_INFINITY }), "non-finite");
});

test("canonicalJson rejects undefined values", () => {
  expectCanonicalFailure(() => canonicalJson({ a: undefined }), "undefined");
  expectCanonicalFailure(() => canonicalJson([1, undefined]), "undefined");
});

test("canonicalJson rejects sparse arrays", () => {
  const sparse: unknown[] = [];
  sparse[1] = 1;
  expectCanonicalFailure(() => canonicalJson(sparse), "sparse");
});

test("canonicalJson rejects circular references", () => {
  const value: Record<string, unknown> = { a: 1 };
  value["self"] = value;
  expectCanonicalFailure(() => canonicalJson(value), "circular");
});

test("canonicalJson rejects non-plain objects", () => {
  expectCanonicalFailure(() => canonicalJson({ at: new Date() }), "plain objects");
  expectCanonicalFailure(() => canonicalJson({ re: /x/ }), "plain objects");
  expectCanonicalFailure(() => canonicalJson({ buf: new Uint8Array([1]) }), "plain objects");
});

test("canonicalJson rejects bigint, function, and symbol values", () => {
  expectCanonicalFailure(() => canonicalJson({ n: BigInt(1) }), "not canonicalizable");
  expectCanonicalFailure(() => canonicalJson({ f: () => 1 }), "not canonicalizable");
  expectCanonicalFailure(() => canonicalJson({ s: Symbol("x") }), "not canonicalizable");
});

test("canonicalJson rejects top-level undefined", () => {
  expectCanonicalFailure(() => canonicalJson(undefined), "undefined");
});
