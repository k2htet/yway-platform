#!/usr/bin/env bash
# Pinned Gitleaks secret scan for CI.
#
# `YWAY-D005` requires a secret-scan check on any change that adds a real reviewer
# record, and states plainly that the local rules in `content/secret-scan.ts` are
# not enough on their own. This script is the broader half: a pinned Gitleaks
# release, verified against the checksum file published with that release, scanning
# both the repository history and the content files, with every reported value
# redacted.
#
# The version and its checksum are pinned below, and the download is refused
# unless the archive matches the digest published for that release. Bumping either
# is therefore a reviewable change: a moved or substituted release cannot be run in
# place of the pinned one.
#
# What this check does not do: it is a credential scanner, not a personal-data
# detector. A pass does not establish that reviewer names, transliterations,
# workplaces, contact details, or credential documents are absent from the
# repository. That exclusion stays owner-review-enforced.

set -euo pipefail

GITLEAKS_VERSION="v8.30.1"
GITLEAKS_ARCHIVE="gitleaks_8.30.1_linux_x64.tar.gz"
GITLEAKS_CHECKSUMS="gitleaks_8.30.1_checksums.txt"
GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
GITLEAKS_BASE_URL="https://github.com/gitleaks/gitleaks/releases/download/${GITLEAKS_VERSION}"

repository_root="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

echo "RUN   fetching pinned gitleaks ${GITLEAKS_VERSION}"
curl --fail --silent --show-error --location \
  --output "${work_dir}/${GITLEAKS_ARCHIVE}" \
  "${GITLEAKS_BASE_URL}/${GITLEAKS_ARCHIVE}"
curl --fail --silent --show-error --location \
  --output "${work_dir}/${GITLEAKS_CHECKSUMS}" \
  "${GITLEAKS_BASE_URL}/${GITLEAKS_CHECKSUMS}"

# The published checksum file lists every asset for the release. Compare this
# archive's published digest with the pinned one, then compare the download with
# the published digest, so neither a substituted asset nor a rewritten pin passes.
published="$(awk -v archive="${GITLEAKS_ARCHIVE}" '$2 == archive { print $1 }' \
  "${work_dir}/${GITLEAKS_CHECKSUMS}")"
if [ -z "${published}" ]; then
  echo "FAIL  ${GITLEAKS_CHECKSUMS} has no checksum for ${GITLEAKS_ARCHIVE}" >&2
  exit 1
fi
if [ "${published}" != "${GITLEAKS_SHA256}" ]; then
  echo "FAIL  pinned checksum ${GITLEAKS_SHA256} does not match the published ${published} for ${GITLEAKS_ARCHIVE} in ${GITLEAKS_VERSION}" >&2
  exit 1
fi

downloaded="$(sha256sum "${work_dir}/${GITLEAKS_ARCHIVE}" | cut -d' ' -f1)"
if [ "${downloaded}" != "${GITLEAKS_SHA256}" ]; then
  echo "FAIL  downloaded ${GITLEAKS_ARCHIVE} digest ${downloaded} does not match the pinned ${GITLEAKS_SHA256}" >&2
  exit 1
fi

tar --extract --gzip --file "${work_dir}/${GITLEAKS_ARCHIVE}" --directory "${work_dir}" gitleaks
chmod +x "${work_dir}/gitleaks"
"${work_dir}/gitleaks" version

cd "${repository_root}"

# The full history, so a secret committed earlier is still found. The workflow
# checks this job out with `fetch-depth: 0` precisely so this is not a silent gap
# on a shallow clone.
echo "RUN   scanning repository history with gitleaks ${GITLEAKS_VERSION}"
"${work_dir}/gitleaks" git --redact --no-banner --exit-code 1 --verbose .

# The whole working tree, including anything not yet committed. The target is the
# repository root rather than a list of directories, so a newly added top-level
# directory is covered by default instead of silently falling out of the scan.
echo "RUN   scanning every working-tree file with gitleaks ${GITLEAKS_VERSION}"
"${work_dir}/gitleaks" dir --redact --no-banner --exit-code 1 --verbose .

# The repository's own rules, so the local check is part of the same job and the
# required pre-reviewer-record command is exercised on every change.
echo "RUN   running the repository secret rules"
pnpm content:secrets:check

echo "PASS  no secret found by gitleaks ${GITLEAKS_VERSION} or by the repository rules"
