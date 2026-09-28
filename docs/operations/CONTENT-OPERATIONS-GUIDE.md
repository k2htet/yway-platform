# Content operations guide

How a contributor authors, registers, and reviews a repository-native Career Experience Pack under
the Stage 2 content pipeline.

## Scope and authority

This guide is operational documentation. It is not product or architecture authority.

- Product meaning comes from [`docs/product/PRODUCT_VISION.md`](../product/PRODUCT_VISION.md) and
  [`docs/product/PRODUCT_CONTRACTS.md`](../product/PRODUCT_CONTRACTS.md).
- The repository-native pipeline is governed by the ACCEPTED decision
  [`docs/decisions/003-stage-2-content-pipeline.md`](../decisions/003-stage-2-content-pipeline.md)
  and the Content and Operations sections of
  [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).
- Stage 2 execution evidence is recorded in the completed plan
  [`STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md`](../exec-plans/completed/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md).

Contracts this pipeline touches: `YWAY-P002` (six-part experiment structure), `YWAY-P004`
(trial output is a clue, not a verdict), `YWAY-P005` and
`YWAY-E006` (no scoring or ranking), `YWAY-P019` and `YWAY-E005` (cumulative provenance plus
qualified-practitioner review over the exact content), `YWAY-P020` (sponsorship disclosure),
`YWAY-P023` (Simple English canonical content and Burmese release gates), and `YWAY-P024`
(content-level accessibility only). Stage 2 implements only the fixture-only, content-level subset of
each: `YWAY-P002`'s exposure-before-commitment rule is enforced through a reviewer's attested
confirmation rather than by reading the text, `YWAY-P023`'s target-user comprehension gate is
recorded as deferred, and `YWAY-P019`'s qualified-practitioner review is a fixture assertion rather
than a real qualification. Those limits are stated wherever they matter below, and none of them is
resolved by this pipeline.

Companion documents:

- [`PRACTITIONER-QUALIFICATION-POLICY.md`](PRACTITIONER-QUALIFICATION-POLICY.md) — who may approve
  content and which roles may overlap.
- [`CONTENT-LIFECYCLE-RUNBOOK.md`](CONTENT-LIFECYCLE-RUNBOOK.md) — review, release, recovery, and
  retirement procedures.

## What Stage 2 can and cannot do

Stage 2 operates a content-as-code pipeline over synthetic fixture content. It proves that the
lifecycle is governable and tamper-detectable. It proves nothing about real practitioner
endorsement, real qualification, real young-person comprehension, or public-release readiness.

| Stage 2 does                                                                               | Stage 2 does not                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Accept only `fixtureOnly: true` Packs and `fixture-` actor identities                      | Accept production-classified content, real identities, or public release       |
| Record who acted, when, and over which exact content digest                                | Authenticate who acted; identity and authorization are deferred                |
| Enforce founder-then-practitioner sequencing, occupation scope, and date-valid eligibility | Vet a real practitioner in the real world; that is a later decision            |
| Check content-level accessibility metadata and reading order                               | Claim runtime, screen-reader, device, or target-user comprehension conformance |
| Produce byte-deterministic artifacts bound to a protected Git commit                       | Select a distribution channel or a trusted-root acquisition mechanism          |

## Canonical schemas

Runtime validation is authoritative. The generated JSON Schema files are a portable rendering of the
expressible subset of the same rules, regenerated with `pnpm content:schemas` and drift-checked with
`pnpm content:schemas:check`. Each generated file carries a `$comment` naming the rules that only
runtime validation enforces — cross-array identifier uniqueness, cross-field equality, cross-document
identifier and order parity between a canonical document and its localization, date-window ordering,
and the recursive prohibited-key scan. A tool that validates against a generated schema alone is
therefore weaker than the pipeline; use the runtime schemas.

| Record                           | Runtime schema                                                                                     | Generated schema                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pack source                      | [`content/schemas/pack-source.ts`](../../content/schemas/pack-source.ts)                           | [`content/generated/pack-source.schema.json`](../../content/generated/pack-source.schema.json)                                                                                                                             |
| Burmese localization             | [`content/schemas/localized-content.ts`](../../content/schemas/localized-content.ts)               | [`content/generated/localized-content.schema.json`](../../content/generated/localized-content.schema.json)                                                                                                                 |
| Content accessibility            | [`content/schemas/accessibility.ts`](../../content/schemas/accessibility.ts)                       | [`content/generated/content-accessibility.schema.json`](../../content/generated/content-accessibility.schema.json), and inlined in the pack and localization schemas                                                       |
| Practitioner eligibility         | [`content/schemas/practitioner-eligibility.ts`](../../content/schemas/practitioner-eligibility.ts) | [`content/generated/practitioner-eligibility.schema.json`](../../content/generated/practitioner-eligibility.schema.json)                                                                                                   |
| Review attestation               | [`content/schemas/review-attestation.ts`](../../content/schemas/review-attestation.ts)             | [`content/generated/review-attestation.schema.json`](../../content/generated/review-attestation.schema.json)                                                                                                               |
| Provenance event and log         | [`content/schemas/provenance-event.ts`](../../content/schemas/provenance-event.ts)                 | [`content/generated/provenance-event.schema.json`](../../content/generated/provenance-event.schema.json), [`content/generated/provenance-event-log.schema.json`](../../content/generated/provenance-event-log.schema.json) |
| Release bundle                   | [`content/schemas/release-bundle.ts`](../../content/schemas/release-bundle.ts)                     | [`content/generated/release-bundle.schema.json`](../../content/generated/release-bundle.schema.json)                                                                                                                       |
| Release manifest and gate result | [`content/schemas/release-manifest.ts`](../../content/schemas/release-manifest.ts)                 | [`content/generated/release-manifest.schema.json`](../../content/generated/release-manifest.schema.json), [`content/generated/release-gate-result.schema.json`](../../content/generated/release-gate-result.schema.json)   |
| Retirement record                | [`content/schemas/retirement-record.ts`](../../content/schemas/retirement-record.ts)               | [`content/generated/retirement-record.schema.json`](../../content/generated/retirement-record.schema.json)                                                                                                                 |
| Retirement notice                | [`content/schemas/retirement-notice.ts`](../../content/schemas/retirement-notice.ts)               | [`content/generated/retirement-notice.schema.json`](../../content/generated/retirement-notice.schema.json)                                                                                                                 |
| Snapshot index                   | [`content/schemas/snapshot-index.ts`](../../content/schemas/snapshot-index.ts)                     | [`content/generated/snapshot-index.schema.json`](../../content/generated/snapshot-index.schema.json)                                                                                                                       |

Shared field rules live in [`content/schemas/common.ts`](../../content/schemas/common.ts) and YAML
parsing in [`content/schemas/yaml.ts`](../../content/schemas/yaml.ts). Every object schema is
strict: unknown fields are rejected, and a recursive scan rejects any key matching
`score`, `rank`, `percent`, `employability`, `suitability`, or `candidatequality`
(`YWAY-P005`, `YWAY-E006`).

## Repository layout

| Path                                                                    | Writer                                                                       | Mutability                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `content/packs/<pack-id>/<version>.yaml`                                | Author, by hand                                                              | Append only; a new version number is a new file             |
| `content/packs/<pack-id>/localizations/<version>.yaml`                  | Author, by hand                                                              | Append only, same rule                                      |
| `content/packs/<pack-id>/provenance.json`                               | `content:new-version`, `content:attest`, `content:release`, `content:retire` | Append only; events are never edited or removed             |
| `content/packs/<pack-id>/attestations/<version>/<sequence>-<kind>.json` | `content:attest`                                                             | Append only; one file per provenance sequence               |
| `content/packs/<pack-id>/retirements/<version>.json`                    | `content:retire`                                                             | Append only                                                 |
| `content/eligibility/<actor-id>.json`                                   | Author, by hand                                                              | Effectively frozen; see the qualification policy            |
| `artifacts/bundles/<pack-id>/<version>/bundle.json`                     | `content:release`                                                            | Immutable once written                                      |
| `artifacts/manifests/<pack-id>/<version>/manifest.json`                 | `content:release`                                                            | Immutable once written                                      |
| `artifacts/retirements/<pack-id>/<version>.json`                        | `content:retire`                                                             | Immutable once written                                      |
| `artifacts/snapshot-index.json`                                         | `content:release`, `content:retire`                                          | Deterministically re-rendered on each release or retirement |

`artifacts/`, `content/generated/`, `content/packs/**/*.json`, and `content/eligibility/` are
excluded from Prettier so a formatter cannot rewrite digest-sealed records away from the bytes that
produced them. The hand-authored YAML sources stay formatted; the content digest is computed over the
parsed object, not the file bytes.

## Author a Pack source

Author the file first, then register it. `content:new-version` validates the file, computes the
canonical content digest, and seals the genesis `authored` event; a version is not registered until
that command succeeds.

Canonical authoring language is Simple English. Every identified experiment carries the six-part
structure required by `YWAY-P002`: question, action, timebox, what to notice, reflection, and next
fork. Each next fork must increase real-world exposure before it increases commitment; that is a
human review obligation confirmed on the review attestation, not a text check the pipeline performs.
An experiment may additionally carry one optional interactive task; the six parts are still
required and the task never replaces one.

```yaml
# content/packs/<pack-id>/<version>.yaml
schemaVersion: 1
# Lowercase kebab-case, 64 characters maximum. Must equal the directory name.
id: fixture-example-pack
# Positive integer. Must equal the file name and must be new.
version: 1
# Stage 2 repository commands accept fixture-only content only.
fixtureOnly: true
# Simple English is the canonical authoring language.
canonicalLanguage: en-simple
# Record honestly; this is provenance, not a quality claim.
aiAssisted: true
title: "Try a short piece of work: a synthetic exploration pack"
summary: >-
  A clearly synthetic exploration pack. It helps a young person test the work by watching and asking
  questions before choosing it. It is not real career advice and it is not published to young
  people.
# Every occupation this pack covers. Practitioner eligibility must cover all of them.
occupations:
  - retail-assistant
# Preview metadata shown before someone opens the pack.
preview:
  headline: "Watch one worker before you decide"
  description: "Spend one hour watching someone do the job and notice what it asks of you."
# Mandatory, non-blank, and the right place for every deferral and boundary statement.
limitations:
  - "This is a synthetic fixture pack. No real practitioner wrote, reviewed, or endorsed it."
  - "It does not tell you whether the work suits you, and it does not score, rank, or compare careers."
  - "Choosing a response in a short task, and anything written in a reflection, are exploration. They are not practice evidence, not a verified assessment, and not a statement about what you are good at."
experiments:
  - # Lowercase kebab-case, 64 characters maximum, unique within the pack.
    id: exp-watch-a-busy-counter
    title: "Watch a busy counter"
    # 1 of 6: the question the experiment answers.
    question: "What is it really like to serve customers on a busy counter?"
    # 2 of 6: what the young person actually does.
    action: "Ask to spend one hour watching someone at a small shop or market stall."
    # 3 of 6: the time bound, stated in the young person's terms.
    timebox: "One hour, once, on a weekend."
    # 4 of 6: what to pay attention to while doing it.
    whatToNotice: "Which moments felt tiring, which felt calm, and which needed a skill you did not have."
    # 5 of 6: the reflection prompt.
    reflection: "Write three sentences about what you noticed and one thing you want to check."
    # 6 of 6: the next step, which must raise real-world exposure before commitment.
    nextFork: >-
      Watch a second workplace at a different time of day, then ask one worker what a first week is
      like. Do that before you pay for any course or promise any shifts.
    # Optional. One short interactive task, attached to this identified
    # experiment. It adds to the six parts above; it never replaces one. Each
    # language writes its own scenario, prompt, choice text, and feedback, so
    # the canonical and Burmese text differ by design — but the choice IDs and
    # their order must match exactly. See the interactive-task section below.
    interactiveTask:
      scenario: "One customer is waiting at the counter and the queue behind them is growing."
      # What the young person is being asked to do right now.
      actionPrompt: "Choose what you say first."
      # At least two choices. Array order is the authored display order, and the
      # IDs are the cross-language join key: safe, unique, and never edited
      # without a new version.
      choices:
        - id: check-the-shelf-first
          text: "Greet the customer and check the shelf for what they asked for."
          # Qualitative and contextual: what this choice creates in the
          # situation, not a verdict on the person or on the outcome.
          feedback: >-
            Checking first can take longer, and the customer can see that you noticed what they
            needed. Both are worth noticing about this part of the work.
        - id: ask-what-they-need
          text: "Tell the customer there is a wait and ask what they need."
          feedback: >-
            Asking what they need first keeps the wait short and moves the queue on. Notice how
            much of the job is deciding what to do before you act.
# Required before an accessibility approval and required for release. Content scope only.
accessibility:
  scope: content
  # Non-empty, unique content reference identifiers in reading order. See the limit below.
  readingOrder:
    - summary
    - preview
    - limitations
    - exp-watch-a-busy-counter
  # Optional. Every entry needs all four fields and its id must appear in readingOrder.
  media:
    - id: exp-watch-a-busy-counter
      reference: "Synthetic placeholder for a photograph. No real photograph is used."
      alternativeText: "A person stands behind a counter serving a waiting customer."
      transcript: "Synthetic text alternative written as part of this fixture only."
# Only present when the pack is sponsored. Omit the whole block when it is not.
# The two prose fields are real text in a real pack, not placeholders: a Burmese
# reader must be able to see the same disclosure in the localized limitations.
sponsorship:
  sponsorName: "Not A Real Sponsor Company (fictional fixture sponsor)"
  disclosure: >-
    This synthetic fixture pack is sponsored by a fictional company that does not exist. The
    disclosure exists only to exercise the sponsorship gate. No money, product, or service is
    involved, and no young person's data is shared with anyone.
  editorialIndependence: >-
    The fictional sponsor cannot add, remove, or rewrite any experiment, cannot change their order,
    and cannot see, request, or receive any young person's data. Editorial decisions stay with the
    content team and with the reviewing practitioner.
  # Both fields are literals; a sponsored pack that cannot assert them must not exist.
  editorialControl: independent
  orderingInfluence: none
# ISO-8601 instant with an explicit offset.
authoredAt: 2026-09-27T00:00:00Z
```

### Authoring rules

- Identifiers (`id`, experiment `id`, `occupations`, accessibility reading-order entries) are
  lowercase kebab-case, start with a letter, and are at most 64 characters (reading-order references
  allow 128). Pack ID, experiment IDs, and occupation IDs must be unique within their file.
- Text fields must contain at least one non-whitespace character. Blank strings are rejected.
- `version` must match the file name, and a Pack may not have two files for one version.
- `experiments`, `limitations`, and `occupations` need at least one entry.
- The content digest is computed over the parsed object with sorted keys. Value changes at an
  existing version number are refused, but comments, key order, and formatting changes are invisible
  to that digest. Keep every registered source and localization file unchanged, including its
  comments and formatting; make any edit in a new version with fresh review. This is a repository
  policy where the digest cannot enforce it.
- Do not add fields the schema does not define. Strict parsing rejects them, and a field named like a
  score or ranking concept is rejected even when the surrounding object is valid.

### Optional interactive task

An identified experiment may carry one optional `interactiveTask`: a short realistic situation, an
action prompt, and at least two ordered response choices. The task is an addition to the six-part
structure, never a replacement for it — `question`, `action`, `timebox`, `whatToNotice`,
`reflection`, and `nextFork` all stay required. An experiment without a task stays valid.

- `scenario`, `actionPrompt`, every `text`, and every `feedback` must contain at least one
  non-whitespace character. Unknown fields are rejected at the task level and at the choice level.
- `choices` needs at least two entries, and choice IDs must be unique, lowercase kebab-case, and at
  most 64 characters.
- There is no field for an answer key, a correct choice, a score, a rank, or a capability
  assessment, and no such field may be added: an unknown key is rejected, and a key named like a
  score or ranking concept is rejected by name as well (`YWAY-P005`, `YWAY-E006`).
- **Choice order is authored display order.** The array order is what a young person reads and the
  order a screen reader must traverse, so it is content, not presentation (`YWAY-P024`).
- **Choice IDs are the cross-language join key.** The canonical and Burmese documents must carry the
  same task on the same experiment, with the same choice IDs in the same order. Text and feedback
  are language-specific and always differ. A task present in only one language, a choice added or
  removed in one language, a renamed ID, or a reordered choice is refused at every paired-content
  boundary: `content:new-version` and `content:status` through the source loader, `evaluateReleaseGates`
  on a directly supplied pair, and the release bundle schema. See the limits below.
- **Feedback is qualitative and contextual.** It describes what the selected action created in the
  situation and what is worth noticing about that part of the work. It must not rank choices, declare
  a winner, tell a young person which choice reveals their strengths, or imply a career or
  capability verdict. No schema check can establish that meaning, so reviewers must read every
  feedback line: a founder, practitioner, and localization reviewer, in the language they review.
  The screen-reader behaviour of the task screen is not established by any check here.
- **A task or feedback edit requires a new version.** The scenario, prompt, choice text, and feedback
  are all part of the version's content digest, so changing any of them under a registered version
  number fails the digest check. Author the change in the next version and collect fresh
  version-scoped founder, practitioner, localization, and accessibility reviews; an earlier
  version's reviews cannot be reused. This is the same frozen-record rule as the rest of the source,
  not a separate mechanism.

Known limits: the generated JSON Schemas validate each document's own shape and cannot compare
identifiers across two documents, so a tool that validates one document against a generated schema
alone will not catch a parity defect — use the runtime validators. The pipeline cannot decide whether
a feedback line is genuinely contextual, so a green release gate is not evidence that the feedback
avoids a verdict. Parity also stops at identifiers and order: nothing binds the Burmese feedback for
a choice ID to the canonical feedback for that same ID, so the localization reviewer is asked about
fluency, not meaning, and must read the two languages' feedback for the same choice ID side by side.
Choice order is declared authored reading order, but `accessibility.readingOrder` can reference only
media identifiers and no schema or attestation field binds a task's choice order, so an approved
accessibility review can confirm an order that never mentions the task; screen-reader validation of
the task screen belongs to the youth-flow and device-validation issues. Recording what a young person
chose is part of the later youth flow and is not implemented here, and the content model encodes no
selection mode, so whether a task accepts one choice or several is an open owner product decision
rather than something this pipeline settles.

### Accessibility content

The accessibility gate checks content structure only, under `YWAY-P024`:

- `accessibility.scope` is always the literal `content`. There is no runtime or device scope.
- `readingOrder` is a non-empty list of unique content reference identifiers.
- Every `media` entry needs `id`, `reference`, `alternativeText`, and `transcript`, and its `id` must
  appear in `readingOrder`.
- An approved accessibility review must confirm the reading order and the media alternatives, and
  must record that runtime validation is deferred. That deferral is mandatory; it is not a
  concession.

Known limit: the gate does not require `readingOrder` to cover every authored section or experiment,
so an approval can confirm an order that silently omits an experiment. Authors should still list
every section and every experiment, and reviewers must check coverage themselves. See the runbook.

### Sponsorship disclosure

A sponsored pack carries `sponsorName`, `disclosure`, `editorialIndependence`,
`editorialControl: independent`, and `orderingInfluence: none`. A sponsored pack requires an approved
`sponsorship-disclosure` review before release. An unsponsored pack must not carry a disclosure event
at all.

Known limit: the Burmese localization schema has no sponsorship field, so the disclosure gate reads
the canonical source only. A sponsored pack whose disclosure lives only in the source reaches release
while a Burmese-reading young person sees no disclosure. Repeat the disclosure and the editorial
boundary in the Burmese `limitations` until the localization representation is decided.

## Author the Burmese localization

Burmese is release-required, so the localization file must exist before registration for a Pack that
will be released. `content:new-version` seals a `localized` provenance event when
`content/packs/<pack-id>/localizations/<version>.yaml` is present at registration time, and every
later review and release event inherits that `localizedContentDigest`.

The localization must cover the same ordered experiment IDs as the canonical source, and it must
carry the same optional interactive task: same choice IDs, same order, its own scenario, prompt,
choice text, and feedback. Its parsed values are bound to the registered version's digest; changes
to those values fail closed. The registered file, including comments and formatting, must remain
unchanged under the policy above.

```yaml
# content/packs/<pack-id>/localizations/<version>.yaml
schemaVersion: 1
# Must equal the source id.
packId: fixture-example-pack
# Must equal the source version.
packVersion: 1
# "my" is the only locale the Stage 2 gate accepts.
locale: my
# Must match the source classification.
fixtureOnly: true
# Required localized preview metadata.
preview:
  headline: "မရွေးခင် အလုပ်သမားတစ်ယောက်ကို ကြည့်ပါ"
  description: "အလုပ်က အမှန်တကယ် ဘာတောင်းလဲဆိုတာ သိရှိပါစေ။"
title: "အလုပ်တစ်မျိုးကို စမ်းကြည့်ခြင်း — သရုပ်ဖွဲ့စည်းမှု ထုပ်ပိုးမှု"
summary: "ရွေးချယ်မည်မှမဟုတ်ဘဲ ကြည့်ရှုခြင်းနှင့် မေးခြင်းဖြင့် စမ်းသပ်ရန်။"
# Every boundary and deferral belongs here, not only in the canonical source. A
# Burmese reader must see the synthetic marker, the no-scoring boundary, the
# exploration-only boundary, and — for a sponsored pack — the disclosure and the
# editorial boundary, because the disclosure gate reads the canonical source only.
limitations:
  - "ဤသရုပ်ဖွဲ့စည်းမှု ထုပ်ပိုးမှုသည် စနစ်ကို စမ်းသပ်ရန်သာ ဖြစ်ပါသည်။ အမှန်တကယ် အလုပ်သမားတစ်ယောက်ကလည်း မရေးသားပါ၊ အတည်ပြုခြင်းလည်း မလုပ်ထားပါ။ လူငယ်များထံ မဝေငှပါ။"
  - "ဤထုပ်ပိုးမှုတွင် အမှန်တကယ် ဆိုင်၊ အလုပ်ရှင်၊ ပံ့ပိုးသူ သို့မဟုတ် အလုပ်ခေါ်ချင်း မပါဝင်ပါ။"
  - "ဤထုပ်ပိုးမှုသည် အလုပ်က သင့်လားဆိုသည်ကို မပြောပါ။ ဘယ်အလုပ်ကို ဦးစားပေး၊ နှိုင်းယှဉ်ချက်၊ အမှတ်အသား မပေးပါ။"
  - "ဤနေရာတွင် တစ်ခုချင်းကို ရွေးခြင်းနှင့် ရေးသားသည့် အရာများသည် ရှာဖွေနေမှုသာ ဖြစ်ပါသည်။ လေ့ကျင့်ရေးကို သက်သေပြုသည့် အထောက်အပံ့ မဟုတ်ပါ၊ အတည်ပြုထားသော စမ်းသပ်မှုလည်း မဟုတ်ပါ၊ သင့်ရည်စွမ်းကို သိမှတ်စေသည့် အချက်လည်း မဟုတ်ပါ။"
  - "ဤထုပ်ပိုးမှုကို ပံ့ပိုးသည်ဟု ဆိုသော ကုန်ရှင်သည် လုံးဝမရှိသော ခေတ်မီတုံး သရုပ်ဖွဲ့လိုက်ပါသည်။ ပံ့ပိုးမှုအတွက် ငွေ၊ ပစ္စည်း၊ ဝန်ဆောင်မှု မရှိပါ၊ လူငယ်သူ၏ အချက်အလက်ကို မည်သူမျိး မရရှိနိုင်ပါ။ ပံ့ပိုးသူသည် ထုပ်ပိုးမှု၏ စာသားကို ပြောင်းလဲ၍ မရပါ၊ စမ်းသပ်ချက်များ၏ အစဉ်ကို ပြောင်းလဲ၍ မရပါ။"
  - "ဤမြန်မာဘာသာစကားသည် သရုပ်ဖွဲ့စည်းမှု ဘာသာပြန်ပါသည်။ မြန်မာစာ နားလည်သူ လူငယ်များနှင့် စမ်းသပ်ခြင်း မလုပ်ရသေးပါ။"
  - "မြန်မာစာ အကောင်းအစားရေးဖွံ့ဖြန်မှုသည် စာသားဖွဲ့စည်းပုံကိုသာ စစ်ဆေးပါသည်။ စက်ဖဝဲဖြင့် ဖတ်ခြင်း၊ စာလုံးအရွယ်အစား၊ မြန်မာစာ ကျော်လွှတ်ခြင်းနှင့် စက်ဖဝဲ အမူအနှစ်ကို သီးခြား မစမ်းသပ်ရသေးပါ။"
# Same ordered experiment IDs as the canonical source, same six parts, translated.
experiments:
  - id: exp-watch-a-busy-counter
    title: "ပျက်သိုင်းရှိသော ကောင်တစ်ခုကို ကြည့်ရှုခြင်း"
    question: "ပျက်သိုင်းရှိသော ကောင်တစ်ခုတွင် လူရှာသူများအား ဝန်ဆောင်ခြင်းသည် နေ့စဉ် လက်တွေ့တွင် ဘာလိုမှားလဲ။"
    action: "အလုပ်သမားတစ်ယောက်အား တစ်နာရီ ကြည့်ရှုရန် တောင်းပါ။ ပင်သေးဆိုင် သို့မဟုတ် စျေးချောင်းတစ်ခုတွင် လုပ်ပါ။"
    timebox: "အပတ်ရက်နေ့တစ်ခါ၌ တစ်နာရီသာ။"
    whatToNotice: "မည်သည့်အချိန်များတွင် ပင်ပန်မှု ရှိသလဲ၊ မည်သည့်အချိန်များတွင် စိတ်ပြေသလဲ၊ မိမိမသိသော ကျွမ်းကျင်မှု လိုအပ်ခဲ့သလဲ သတိထားပါ။"
    reflection: "မိမိကြည့်ခဲ့သည့် အချက်သုံးချက်ကို ရေးသားပါ။"
    nextFork: "ကျောက်ချိန်နှင့် မတူညီသည့် အချိန်တွင် ဆိုင်တစ်ခုကို ထပ်မံကြည့်ရှုပါ။ ပြီးလျှင် အလုပ်သမားတစ်ယောက်အား ပထမဆုတ် အလုပ်အခါအခဲ့ကို မေးမြန်းပါ။ လေ့ကျင့်ကို မဝယယူခင်၊ အလုပ်ခေါ်ချင်းမပေးခင် ဒီအတွေကို လုပ်ပါ။"
    # Optional, and the same task the canonical source carries: the same choice
    # IDs in the same order, every field written in Burmese. The prose differs
    # from the canonical file by design; the IDs and their order do not.
    interactiveTask:
      scenario: "ကောင်းတစ်ခုတွင် လူရှာသူတစ်ယောက် စောင့်နေပြီး နောက်ကျွန်တော်တွေ ပိုးတိုက်နေသည်။"
      actionPrompt: "သင့်အလိုတိုင်း ပြောမယ်ကို ရွေးပါ။"
      # The same two choice IDs, in the same order as the canonical source.
      choices:
        - id: check-the-shelf-first
          text: "ကြိုဆိုပြီး သူတောင်းခဲ့တာကို ပစ္စည်းတိုထဲမှာ ရှိမှာ စစ်ပါ။"
          feedback: "ပိုးတိုက်ရန် များလိုနိုင်ပါသည်။ လူရှာသူက သင့်အာရုံစိတ်ထားမှုကို သိရှိနိုင်ပါသည်။ ဒီအလုပ်အပိုင်းအတွက် ဂရုစိတ်ထားသင့်သော အချက်များကို သတိထားပါ။"
        - id: ask-what-they-need
          text: "စောင့်ရှိကြောင်း ပြောပြီး ဘာလိုအပ်သလဲဆိုတာ မေးပါ။"
          feedback: "လိုအပ်ချင်းကို ဦးစားမေးခြင်းက စောင့်ချိန်ကို လျှောင်းပေးပြီး တန်းစီကို ရွှေ့ပါသည်။ လုပ်ဖို့မလုပ်ခင် ဘာလုပ်မည်ကို ဆုံးဖြတ်ရခြင်းက ဒီအလုပ်၏ ကြီးပွားချက်တစ်ခု ဖြစ်သည်ကို သတိထားပါ။"
# Optional localized accessibility metadata, checked with the same content-only rules.
accessibility:
  scope: content
  readingOrder:
    - summary
    - preview
    - limitations
    - exp-watch-a-busy-counter
```

The committed worked examples are
[`content/packs/fixture-retail-assistant/2.yaml`](../../content/packs/fixture-retail-assistant/2.yaml)
and
[`content/packs/fixture-retail-assistant/localizations/2.yaml`](../../content/packs/fixture-retail-assistant/localizations/2.yaml).

Version 1 of that Pack, at
[`content/packs/fixture-retail-assistant/1.yaml`](../../content/packs/fixture-retail-assistant/1.yaml),
is a **deliberate negative example and not an authoring model**. Its experiment's next fork asks for a
paid course and two promised shifts before the young person has watched the work at all, which
inverts exploration before choice. Its only attestation records `changes-requested` with
`exposureBeforeCommitmentConfirmed: false`, so version 1 can never reach approval and can never be
released. It is the reference example of a rule that is reviewer-enforced rather than
text-analysed.

## Register a version

```sh
pnpm content:new-version -- --pack fixture-example-pack --actor fixture-author-one
```

`content:new-version` seals the `authored` event and, when a localization file already exists, a
`localized` event. It refuses:

- an already-registered target version, because registered versions are immutable;
- a `--from` version that is not registered;
- a tampered prior source, failing closed on a source-derived digest mismatch;
- a missing target source file, with the exact path to author;
- a non-fixture source or a non-`fixture-` actor, which is the Stage 2 fixture-isolation gate.

Omit `--from` to register the version after the highest registered one, or pass it explicitly to
state which registered version the new one follows.

## Record reviews

Every review is one `content:attest` invocation. The command writes the provenance event first and
the attestation file second, binds both to the same instant and to the exact source digest, and
records the attestation's `reviewEventSequence` so an approval cannot be reused in a later review
cycle. Exit code `2` means the invocation itself was wrong; exit code `1` means a schema, repository,
or gate check refused it and nothing was written.

```sh
# Founder content review. Both confirmations are mandatory on an approval.
pnpm content:attest -- --pack fixture-example-pack --version 1 --kind founder-review \
  --actor fixture-founder-one --outcome approved \
  --six-part-confirmed true --exposure-before-commitment-confirmed true \
  --note "Synthetic fixture founder review."

# Independent practitioner content review. The eligibility record must already exist.
pnpm content:attest -- --pack fixture-example-pack --version 1 --kind practitioner-review \
  --actor fixture-practitioner-one --outcome approved \
  --six-part-confirmed true --exposure-before-commitment-confirmed true \
  --note "Synthetic fixture practitioner review."

# Burmese fluency review. Evidence must be a fixture: reference for fixture-only content.
pnpm content:attest -- --pack fixture-example-pack --version 1 --kind localization-review \
  --actor fixture-localizer-one --outcome approved --locale my \
  --fluent-burmese-confirmed true --fluent-review-evidence fixture:synthetic-fluent-review-001 \
  --note "Synthetic fixture localization review; no fluent Burmese reviewer took part."

# Content accessibility review. The runtime deferral is a required flag, not a default.
pnpm content:attest -- --pack fixture-example-pack --version 1 --kind accessibility-review \
  --actor fixture-accessibility-reviewer-one --outcome approved \
  --reading-order-confirmed true --media-alternatives-confirmed true \
  --runtime-validation-deferred \
  --note "Synthetic fixture content accessibility review."

# Sponsorship review, only for a pack that carries a sponsorship block.
pnpm content:attest -- --pack fixture-example-pack --version 1 --kind sponsorship-disclosure \
  --actor fixture-sponsorship-reviewer-one --outcome approved \
  --disclosure-confirmed true --editorial-control-preserved true --ordering-influence none \
  --note "Synthetic fixture sponsorship review."

# Changes requested. Any kind accepts it; it always records a changes-requested event.
pnpm content:attest -- --pack fixture-example-pack --version 1 --kind founder-review \
  --actor fixture-founder-one --outcome changes-requested \
  --six-part-confirmed true --exposure-before-commitment-confirmed false \
  --note "The next fork asks for a course and shifts before the work is watched."
```

Flag rules the command enforces:

- `--six-part-confirmed` and `--exposure-before-commitment-confirmed` are required for, and only
  allowed on, `founder-review` and `practitioner-review`. An approval that records either as `false`
  is refused by the schema.
- `--locale my` is required for, and only allowed on, `localization-review`.
- `--fluent-burmese-confirmed` and `--fluent-review-evidence` go together and are required for an
  approved `localization-review`. Fixture-only evidence must match `fixture:`.
- `--reading-order-confirmed`, `--media-alternatives-confirmed`, and `--runtime-validation-deferred`
  go together and are required for an approved `accessibility-review`.
- `--disclosure-confirmed`, `--editorial-control-preserved`, and `--ordering-influence none` go
  together and are required for an approved `sponsorship-disclosure`.
- `--note` is free text and must be non-blank. Keep it synthetic: no names, no personal data.

A `practitioner-review` approval additionally runs the practitioner gate before anything is written.
See [`PRACTITIONER-QUALIFICATION-POLICY.md`](PRACTITIONER-QUALIFICATION-POLICY.md).

## Inspect and verify

```sh
# Lifecycle status, review bindings, and retirement state for one exact version.
pnpm content:status -- --pack fixture-example-pack --version 1
pnpm content:status -- --pack fixture-example-pack --version 1 --json

# Rebuild every historical release from committed records and compare bytes.
pnpm content:verify

# Verify the artifact snapshot against a trusted commit the owner has published
# and protected. Supply the full 40- or 64-character SHA; an abbreviated id, a
# branch name, and HEAD are all refused, because a self-selected local tip is
# not a trust anchor.
pnpm content:verify -- --trusted-commit <full-40-or-64-character-sha>

# Regenerate the portable JSON Schemas and fail on drift.
pnpm content:schemas:check
```

Release, retirement, and every failure-recovery procedure are in
[`CONTENT-LIFECYCLE-RUNBOOK.md`](CONTENT-LIFECYCLE-RUNBOOK.md).

## What a passing check does and does not mean

Every command in this guide operates on synthetic fixture content. A green result establishes
fixture lifecycle validity only: the schemas accept the records, the digest chain is intact, the
recorded reviews bind the exact version, and the artifacts are byte-deterministic from those records.

It does not establish real practitioner endorsement, real qualification, real Burmese fluency,
target-user comprehension, runtime or device accessibility, or permission to publish. Those require
their own authority and their own gates, and Stage 2 grants none of them.
