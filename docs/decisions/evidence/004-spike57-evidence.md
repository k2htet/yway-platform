# YWAY-D004 spike evidence (issue #57)

Raw device evidence supporting [`004-android-delivery-local-state.md`](../004-android-delivery-local-state.md).

Everything here is **synthetic**. No real youth data, no real Career Experience Pack, no
practitioner review, no real content. The spike source tree, the keystores, and the APK files were
deliberately kept **outside** the Yway repository and are not part of any Yway commit or PR. This
document records the commands, the tool and device versions, the sanitized outputs, and the
artifact hashes needed to judge the decision and to reproduce the run.

Screenshots in [`004-spike57/`](004-spike57) are the synthetic spike UI only.

## 1. Environment

| Item            | Value                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| Host OS         | Linux 5.15, x86_64, 16 vCPU, 62 GB RAM, KVM available                                 |
| Node / pnpm     | v24.20.0 / 11.24.0                                                                    |
| Java            | OpenJDK 17.0.20.1                                                                     |
| Android SDK     | platform-tools adb, build-tools 36.0.0, platforms android-33..37                      |
| Emulator        | `~/Android/Sdk/emulator/emulator -avd Pixel_9` (google_apis_playstore x86_64, API 36) |
| Physical device | **None connected.** No managed physical device was available for #57.                 |

### Device under test

| Property                    | Value                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| AVD                         | Pixel_9                                                                                           |
| serial                      | EMULATOR36X2X12X0                                                                                 |
| model                       | sdk_gphone64_x86_64                                                                               |
| device / manufacturer       | emu64xa / Google                                                                                  |
| fingerprint                 | `google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.D1/13818094:user/release-keys`             |
| Android release / API level | 16 / 36                                                                                           |
| security patch              | 2025-07-05                                                                                        |
| build type                  | `user` — production build; `adb root` refused with `adbd cannot run as root in production builds` |
| ABI                         | x86_64                                                                                            |
| default display             | 1080x2424 at 420 dpi = 411 x 921 dp                                                               |

Because the emulator is a `user` build, `run-as` was the only app-private introspection path, and
`run-as` succeeds **only against a `android:debuggable="true"` package**. The erase and sentinel
filesystem evidence therefore came from an explicitly debuggable build of the same source; see §7.

## 2. Package versions

| Package         | Version                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| expo            | 58.0.0-preview.7 (npm tag `next` — **preview line, not a stable release**) |
| expo-sqlite     | 58.0.6                                                                     |
| expo-status-bar | 58.0.1                                                                     |
| react           | 19.3.0                                                                     |
| react-native    | 0.88.0-rc.1 (**release candidate**)                                        |
| typescript      | ~6.0.3                                                                     |
| bundler         | Metro via `expo export:embed`, Hermes bytecode                             |

## 3. Build configuration that the decision depends on

`app.json` set `android.package=com.yway.spike57` and `userInterfaceStyle=automatic`, and loaded a
local config plugin `plugins/withPrivateDataBackupRules.js` that:

- sets `android:allowBackup="false"`;
- sets `android:fullBackupContent="@xml/spike_backup_rules"` (pre-Android-12, 9 domains excluded);
- sets `android:dataExtractionRules="@xml/spike_data_extraction_rules"` (Android 12+, `cloud-backup`
  9 excludes **and** `device-transfer` 9 excludes);
- adds `tools:node="remove"` for `INTERNET`, `ACCESS_NETWORK_STATE`, `SYSTEM_ALERT_WINDOW`,
  `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`.

Two build facts that a reimplementation must know:

- The plugin must write `res/xml/**` using `modRequest.platformProjectRoot`. Using `projectRoot`
  writes the files to the wrong tree and prebuild fails to produce them.
- `npx expo prebuild --clean` **regenerates** `android/app/build.gradle` and `android/gradle.properties`,
  wiping any manually added signing config. Patches must be re-applied after every prebuild.

## 4. Reproduction

```bash
# isolated spike, outside the Yway repo
npx create-expo-app@latest spike --template expo-template-blank-typescript@sdk-58 --no-install
cd spike && npm install && npx expo install expo-sqlite
# app.json: package com.yway.spike57, plugins ["expo-sqlite","./plugins/withPrivateDataBackupRules"]
npx expo prebuild --platform android --no-install --clean

# local signing; keystore OUTSIDE the project tree and outside Git
keytool -genkeypair -storetype PKCS12 -keystore spike57-local.keystore -alias spike57 \
        -keyalg RSA -keysize 4096 -validity 10000
# re-apply signingConfigs.localSpike + release{ signingConfig localSpike } to app/build.gradle
# and spikeKeystorePath/Password/Alias to gradle.properties

cd android
./gradlew assembleRelease
# filesystem inspection build ONLY (JS-bundled + signed + debuggable, so run-as can read):
./gradlew assembleRelease -PspikeReleaseDebuggable=true

# install and exercise (all gates ran with airplane_mode_on=1)
adb install -r app/build/outputs/apk/release/app-release.apk
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable && adb shell svc data disable
adb shell am start -W -n com.yway.spike57/.MainActivity
```

A plain `assembleDebug` is **not** usable as evidence: it has no JS bundle and requires a Metro dev
server, which is exactly the development mode the issue excludes.

## 5. Artifact hashes

| Artifact                                                             | sha256                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **final hardened release APK** (permissions removed, non-debuggable) | `5b2fb55fae414fa9823269f778603fef09b256714dd55f0bba97fbe50eaa05ee` |
| first release APK (default permissions, incl. `INTERNET`)            | `3e86c2278debc2151570f9cb23c2a9e78b19252671d7f3a84592298550832d33` |
| debuggable release, row-level-`DELETE` erase                         | `54fd2b1ab599a1c9418bf02bfe9320607affa488dd18ecc1c19efee88f5a8e03` |
| debuggable release, file-level-delete erase                          | `aa67ed0d0bee16f4a8dd8d9d24fc3741dc4e8393bc82afb4579b848fde877867` |
| `assembleDebug` output (Metro-dependent, unusable)                   | `43326631745939d61562c3ca0a589035981f90245774afa23eb88c037c7c729e` |

Signing key: self-signed RSA-4096, alias `spike57`, PKCS12 keystore outside the spike tree.
Throwaway spike key material, **not** pilot signing material.

## 6. Gate 1 — Offline and durability: PASS

| Step              | Command / observation                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Airplane mode     | `settings get global airplane_mode_on` → `1`                                                                                                                              |
| No network        | `dumpsys connectivity` → `Active default network: none`; `ping -c 2 8.8.8.8` → `connect: Network is unreachable`                                                          |
| Standalone launch | `am start -W -n com.yway.spike57/.MainActivity` → `Status: ok`, `TotalTime: 285`, `LaunchState: COLD`; no Metro, no dev client                                            |
| Bundled content   | Synthetic Pack and Burmese text rendered from the APK bundle (screenshot `004-spike57/01-offline-launch-airplane-mode.png`; airplane-mode icon visible in the status bar) |
| Save              | `Saved on this device only.` / `Saved sessions (1)` with the sentinel present                                                                                             |
| Force-stop        | `am force-stop` → `pidof` empty; relaunch → `Saved sessions (1)`, sentinel intact                                                                                         |
| Reboot            | `adb reboot`, full boot, airplane mode still on; relaunch → `Saved sessions (1)`, sentinel intact                                                                         |

Re-verified on the final hardened APK: cold launch 326 ms, save, force-stop recovery, reboot
recovery all succeeded with `INTERNET` absent from the manifest.

## 7. Gate 2 — Privacy: PARTIAL — device-to-device transfer not exercised

### Packaged manifest (from the built APK, `aapt2 dump xmltree`)

```
A: android:allowBackup(0x01010280)=false
A: android:fullBackupContent(0x010104eb)=@0x7f120006
A: android:dataExtractionRules(0x0101063e)=@0x7f120007
```

`dumpsys package com.yway.spike57` on the installed build:

```
pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]
```

`ALLOW_BACKUP` is **absent** — the OS did not grant backup eligibility.

### Packaged backup rules (resource names are obfuscated in release)

`res/qc.xml` = `xml/spike_data_extraction_rules` → `<data-extraction-rules>` containing
`cloud-backup` with 9 `<exclude domain=… path=".">` entries and `device-transfer` with 9 such
entries (`root`, `file`, `database`, `sharedpref`, `external`, `device_root`, `device_file`,
`device_database`, `device_sharedpref`).

`res/GT.xml` = `xml/spike_backup_rules` → `<full-backup-content>` with the same 9 excludes.

### Packaged permissions — the evidence for "no network"

`aapt2 dump permissions app-release.apk` on the final hardened APK:

```
package: com.yway.spike57
uses-permission: name='android.permission.VIBRATE'
permission: com.yway.spike57.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION
uses-permission: name='com.yway.spike57.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'
```

`INTERNET`, `ACCESS_NETWORK_STATE`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, and
`MANAGE_EXTERNAL_STORAGE` are all absent. The first build
(`3e86c227…`) still carried `INTERNET`, `SYSTEM_ALERT_WINDOW`, and the legacy storage permissions,
which is why the removal step exists.

### Backup, shared storage, logs, export

| Check                     | Command                                                                            | Result                                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup Manager            | `bmgr backupnow com.yway.spike57`                                                  | `Backup is not allowed` / `Unable to run backup`. **Not probative on its own** — the emulator has no cloud account and no network; the probative evidence is `ALLOW_BACKUP` absent plus the packaged rules.                                  |
| `adb backup`              | `adb backup -noapk`                                                                | `adb backup is deprecated`; requires interactive unlock. Unusable on API 36.                                                                                                                                                                 |
| Available transports      | `bmgr list transports`                                                             | `LocalTransport`, `com.google.android.gms` cloud + `D2dTransport`, restore transports present but unreachable offline.                                                                                                                       |
| Device-to-device transfer | —                                                                                  | **NOT EXERCISED.** Needs two devices and an active D2D transport.                                                                                                                                                                            |
| Shared storage            | `grep -rl YWAY-S57-SENTINEL /storage/emulated/0/`                                  | **0 matches.** `/sdcard/Android/data/com.yway.spike57` was never created.                                                                                                                                                                    |
| Diagnostic logs           | `logcat -d` grep for sentinel, `synthetic-reflection-abc123`, pack id, pack digest | **0 matches for all four.**                                                                                                                                                                                                                  |
| Export/share/print        | app source                                                                         | no share, export, print, or clipboard path exists                                                                                                                                                                                            |
| Export surface in build   | manifest provider dump                                                             | `expo.modules.filesystem.FileSystemFileProvider`, `android:exported=false`, paths limited to `files-path` and `cache-path` (no `external-path`, no `root-path`). Note `expo-sqlite` writes to `files/SQLite/`, i.e. **inside** `files-path`. |

### Contamination disclosure

The first shared-storage sweep reported sentinel matches in `/storage/emulated/0/ui*.xml`. Those
files were written by **this test harness** (`adb shell uiautomator dump /sdcard/ui.xml`), not by the
app. They were deleted, later `uiautomator` dumps were redirected to `/data/local/tmp`, and the clean
re-scan returned 0 matches. Recorded so a future reader does not re-derive a false positive.

### App-private write locations (for the exclusion set to be checkable)

```
/data/data/com.yway.spike57/files/SQLite/yway-spike57.db       -rw-------  4096
/data/data/com.yway.spike57/files/SQLite/yway-spike57.db-wal   -rw------- 20632
/data/data/com.yway.spike57/files/SQLite/yway-spike57.db-shm   -rw------- 32768
/data/data/com.yway.spike57/shared_prefs/expo.modules.kotlin.PersistentDataManager.xml
```

`expo-sqlite` places the database under `files/SQLite/`, **not** `databases/`. The
`PersistentDataManager` shared-preferences file held 0 sentinel matches.

## 8. Gate 3 — Erasure: PASS after a first attempt FAILED

### Attempt 1 — row-level `DELETE` + `DELETE FROM sqlite_sequence` + `VACUUM`: FAILED

The app reported success:

```
text="Erased 1 record(s) from this device."
text="Saved sessions (0)"
text="No saved sessions on this device."
```

The sentinel was still on disk:

```
$ adb shell run-as com.yway.spike57 grep -rl YWAY-S57-SENTINEL /data/data/com.yway.spike57
/data/data/com.yway.spike57/files/SQLite/yway-spike57.db-wal
```

The `.db` file itself showed 0 matches; the sentinel survived in the **`-wal` sidecar**, which grew
20632 → 41232 bytes as the delete was journalled. **Application-level deletion is not erasure.**

### Attempt 2 — `closeSync()` + `SQLite.deleteDatabaseAsync()`: PASS

| Step                        | Result                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Sentinel written            | present in `…db-wal`                                                                     |
| Erase                       | `Erased 1 record(s) from this device.`; WAL shrank 20632 → 12392 bytes                   |
| Whole app-private tree scan | **0 matches — sentinel gone**                                                            |
| Force-stop + relaunch       | `Saved sessions (0)`, `No saved sessions on this device.`, 0 matches                     |
| Reboot + relaunch           | `Saved sessions (0)`, 0 matches                                                          |
| Restore                     | **NOT EXERCISED** — no backup transport accepted a backup, so no restore existed to test |

### Reset procedure (exercised)

| Step                             | Result                                    |
| -------------------------------- | ----------------------------------------- |
| `pm clear com.yway.spike57`      | `Success`; sentinel gone immediately      |
| `adb uninstall com.yway.spike57` | `Success`; `pm list packages` → 0 matches |
| Reinstall of the same hashed APK | `Success`; launches clean with 0 records  |

## 9. Gate 4 — Accessibility feasibility: PARTIAL — defects recorded

Display configurations were set with `wm size` / `wm density`:

| Config                   | size / density  | logical width | theme | font scale    |
| ------------------------ | --------------- | ------------- | ----- | ------------- |
| compact-100pct           | 1080x2160 / 480 | 360 dp        | light | 1.0           |
| compact-dark             | 1080x2160 / 480 | 360 dp        | dark  | 1.0           |
| compact-200pct           | 1080x2160 / 480 | 360 dp        | light | 2.0           |
| compact-200pct-burmese   | 1080x2160 / 480 | 360 dp        | light | 2.0, scrolled |
| large-dark-200pct        | 1080x2520 / 400 | 432 dp        | dark  | 2.0           |
| large-dark-100pct-bottom | 1080x2520 / 400 | 432 dp        | dark  | 1.0, scrolled |

| Check                                             | Result                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200% text scaling                                 | Scaled and wrapped correctly at 360 dp and 432 dp. No clipping, no body-text overlap. Screenshot `004-spike57/02-compact-360dp-200pct-burmese.png`.                                                                                                                               |
| Burmese shaping                                   | Correct stacking of consonants, medials, and tone marks at 1.0 and 2.0.                                                                                                                                                                                                           |
| Burmese **line breaking**                         | **DEFECT (YWAY-P024 violation).** Burmese has no inter-word spaces; lines break at arbitrary grapheme boundaries (e.g. `သတိထားမိ` split across lines). Needs ICU line-break-class handling or equivalent.                                                                         |
| Theme                                             | `cmd uimode night yes` picked up by `useColorScheme()`; app reported `Dark theme`; legible in both. Screenshot `004-spike57/03-large-432dp-200pct-dark.png`.                                                                                                                      |
| Touch targets                                     | All interactive elements ≥ 48 dp. At 400 dpi: tabs 66x48, 88x48, 74x48 dp; response options 392x84, 392x82, 392x82 dp; text inputs 392x48 dp; save button 392x55 dp. An initial "FAIL" was a node clipped by the viewport edge; re-measured after scrolling.                      |
| Screen reader                                     | `com.google.android.marvin.talkback` enabled via `settings put secure enabled_accessibility_services`; process confirmed. Traversal order matched visual order across 27 nodes; every control had a label and `clickable=true`; tab state exposed as `selected="true"` / `false`. |
| Screen-reader duplication                         | **DEFECT.** Each `Pressable` exposes both its `content-desc` and its inner `Text` as separate focus targets (e.g. `read tab` then `read`), so a screen reader announces them twice.                                                                                               |
| Reduced motion                                    | With `animator/window/transition_animation_scale = 0`, `AccessibilityInfo.isReduceMotionEnabled()` returned true and the app reported `reduce motion on`. The API is reachable.                                                                                                   |
| Window insets                                     | **DEFECT.** At 432 dp with 200% text the first heading draws under the status bar; the spike has no safe-area/inset handling.                                                                                                                                                     |
| 3-up tab row                                      | Watch item. At 360 dp / 200% the `erase` tab ends at x=1073 of 1080 px. Three short English labels just fit; a fourth tab or Burmese labels would overflow.                                                                                                                       |
| Contrast                                          | **NOT MEASURED.** Legibility was observed in screenshots; no contrast ratio was computed.                                                                                                                                                                                         |
| Screen reader + Burmese, and 200% + screen reader | **NOT EXERCISED.** Traversal order and Burmese rendering were verified separately, never combined.                                                                                                                                                                                |

This is a feasibility record, not `YWAY-P024` conformance. Real validation is #66.

## 10. Gate 5 — Managed delivery: PARTIAL

| Item                     | Evidence                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local build              | `./gradlew assembleRelease` from the prebuilt project; no Expo account, no EAS project, no network delivery at build time beyond Gradle dependency resolution  |
| Local signing            | self-signed RSA-4096, keystore outside the project tree and outside Git, wired via `spikeKeystorePath`                                                         |
| Artifact hashes          | recorded in §5                                                                                                                                                 |
| Installation             | `adb install` → `Success`; repeated through every reset cycle                                                                                                  |
| Device inventory         | **one emulator, enumerated in §1. No physical device.**                                                                                                        |
| Removal / reset          | `pm clear` → `Success`; `adb uninstall` → `Success`; reinstall of the same hash works. Exercised **on the emulator only**; managed-device removal unexercised. |
| Managed-device runbook   | **does not exist**; listed as a follow-up in the ADR.                                                                                                          |
| OTA / store distribution | not used and not authorized by this decision                                                                                                                   |

## 11. Not exercised, therefore not claimed

- Any **physical** Android device, and any OS version other than **Android 16 / API 36**.
- **Device-to-device transfer** at runtime.
- **Cloud backup and restore** at runtime; the transport refused the backup, so no restore was tested.
- The **pre-Android-12 `full-backup-content` execution path** — packaged and inspected statically only.
  Note that `allowBackup=false` blocking D2D is an **API 31+** behaviour; on API ≤ 30 the
  `fullBackupContent` path governs instead.
- Any **OEM-modified** Android build.
- **Contrast ratios**; **screen-reader traversal of Burmese strings**; **200% scale with the screen
  reader active**.
- `run-as` on the final non-debuggable APK — impossible by construction, which is itself the
  evidence that the shipped artifact is not debuggable.

Per the issue's limit, every item above must be excluded from pilot use until exercised on an
inventoried managed device.
