# LootLedger — Session Handoff

## Immediate next step (pending when this handoff was written)

The user asked for a **cinematic "black hole" dark/light theme transition** (Android only) — this is **not started as code yet**, only scoped. Full spec is under "Pending: black-hole theme transition" below. `@shopify/react-native-skia` was just installed via `npx expo install` (npm side only — **no native rebuild has been run for it yet**, so it is not actually linked into the compiled app). That rebuild + the actual overlay/shader implementation is the next work.

Before starting that, note: **local Gradle builds cannot be run from this assistant's own shell** on this machine — every native rebuild this session had to be run by the user in their own terminal (see "Local build environment" below for the exact fix and commands). Don't rediscover this the hard way; just hand the user the `gradlew` command when a native change needs testing.

## What this app is

LootLedger — a personal finance app (Expo/React Native), styled to match a shared "Code Barbarians Budget" design (dark theme, orange accent `#FF5A1F`, Space Grotesk/Space Mono fonts, now also a light "peach" companion theme — see below). Local-only, manual-entry personal finance manager: multiple independent budget profiles, accounts & net worth, debt payoff tracking, bills & subscriptions with local reminders, and savings goals. No backend, no bank sync — everything lives in on-device SQLite.

## Repo & remote

- Local: `D:\Projects\LootLedger`
- Remote: `https://github.com/CodeBarbarians/LootLedger.git`, branch `main`. **Not yet pushed** — 12 local commits ahead of `origin/main` as of this handoff, plus this session's changes are still **uncommitted** (see "Uncommitted state" below). Push/commit only when explicitly asked.
- EAS project: linked, owner account `codebarbarian1`. `projectId` is in `app.json`.

## Local build environment — READ THIS FIRST if you need to test a native change

- **Physical device**: connects via wireless adb. If disconnected, get a fresh `ip:port` from the phone's Settings → Developer options → Wireless debugging screen, then `adb connect <ip>:<port>`.
- **Emulator**: `pixel_7_-_api_36_0` AVD exists (Android Studio installed this session), reachable as `emulator-5554` once booted via `$ANDROID_HOME/emulator/emulator.exe -avd pixel_7_-_api_36_0`.
- **Gradle/local builds are now unblocked**, but only when run by the user directly, NOT via this assistant's Bash tool. Root cause (found this session, after a long detour): a JDK/Windows bug where `java.nio.channels.Selector.open()` fails via `WEPollSelectorImpl` → `UnixDomainSockets.connect0` with "Invalid argument" — but **only when the process is spawned as a child of this assistant's own sandboxed shell**, not when run from an interactive terminal window. (Earlier hypotheses — corporate firewall, JDK 26 incompatibility — were both ruled out along the way; JDK 26 specifically fails separately with an unrelated "AGP doesn't understand version string 26.0.2.1" error, so use JDK 17 as below regardless.)
- **The exact command that works**, run by the user in their own PowerShell window:
  ```powershell
  cd D:\Projects\LootLedger\android
  $env:JAVA_HOME = "C:\Users\ShoaibAli\dev-tools\jdk-17.0.20.1+1"
  $env:ANDROID_HOME = "C:\Users\ShoaibAli\AppData\Local\Android\Sdk"
  $env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
  .\gradlew.bat app:assembleDebug "-PreactNativeArchitectures=arm64-v8a,x86_64"
  ```
  (Quote the `-PreactNativeArchitectures=...` argument as one string — PowerShell mis-parses the bare comma otherwise.) Output: `android\app\build\outputs\apk\debug\app-debug.apk`. Install with `adb install -r <path>` (works fine from this assistant's shell, only the Gradle invocation itself needs the user's terminal).
- The current installed debug build is a **dev-client** build (this session added `expo-dev-client` so Metro-driven live JS reload works without needing EAS each time — force-stop + relaunch via `adb shell am start -a android.intent.action.VIEW -d "exp+lootledger://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.lootledger.app` after `adb reverse tcp:8081 tcp:8081`). **Any change to a native module (like adding Skia) needs the gradlew rebuild above** before it'll be available; pure JS/TSX changes just need the app relaunched to pick up the new Metro bundle.

## What happened this session (chronological, high level)

1. **Root-caused and fixed the "blank screen on launch" bug** that blocked all prior on-device testing (see previous handoff). It was **not** the risky `DB_VERSION 2→8` migration (that ran fine) — it was [Screen.tsx](src/components/app/Screen.tsx) styling its root `SafeAreaView` via a NativeWind `className` (`bg-background`), and NativeWind only auto-patches core RN primitives, not third-party components like `react-native-safe-area-context`'s `SafeAreaView`. Fixed by switching to an inline `style`. This one-line fix unblocked every screen in the app (it's the universal per-screen wrapper).
2. **Unblocked local Gradle builds** (see "Local build environment" above) — this took a long detour through wrong hypotheses before landing on the real cause.
3. **Redesigned the sidebar+detail template** (used by Categories/Accounts/Debts/Bills/Goals management screens): sidebar rows now use a colored left-accent bar instead of a tiny dot, a vertical divider separates sidebar from detail pane, and the detail pane's form fields are grouped in the same bordered "card" pattern already used by bottom sheets elsewhere in the app (previously the fields floated on bare background).
4. **Replaced the inline "+ NEW" text field in each of those 5 screens with a proper bottom sheet** ([AddItemSheet.tsx](src/components/app/AddItemSheet.tsx), new) — matches the existing `BottomSheet`/`DebtPaymentSheet`/`GoalContributionSheet` pattern instead of an ad hoc inline `TextInput`.
5. **Added a light/dark theme system** — see "Theme system" below, this took real debugging.
6. **Added an optional biometric app lock** — see "Biometric lock" below.
7. **Added `expo-local-authentication`** (native module, already rebuilt and working) and **`@shopify/react-native-skia`** (native module, npm-installed only, **not yet rebuilt**) for the pending black-hole transition.
8. User asked for the black-hole theme transition (full spec below), then asked to revert an intermediate "just fix the flicker" attempt (`LayoutAnimation`, then a manual `Animated` opacity fade) — both were tried, both reverted; **the flicker still exists today** on every theme toggle, unfixed, waiting for the black-hole effect to (by design) hide it.

## Theme system

- `src/theme/colors.ts`: `colors` is now a **mutable object** (not a frozen palette) — every screen already imports `colors` and reads `colors.background` etc. at render time via inline `style={{ ... }}`, so switching themes works by calling `applyColorTheme('dark' | 'light')`, which does `Object.assign(colors, darkColors | lightColors)` **in place**. Screens don't need to be rewritten to a hook; they just need to re-render once to pick up the new values.
- `global.css`: NativeWind `className` tokens (`bg-card`, `border-border`, etc.) are driven by CSS custom properties. **Important lesson learned**: React Native has no DOM, so a `:root.light`/`:root.dark` *class* selector (the web convention) never matches anything — nothing in this tree ever gets a literal `light`/`dark` className. The actual working mechanism is a `prefers-color-scheme` **media query**, which NativeWind's underlying `react-native-css` engine resolves against its own `colorScheme` signal — which in turn *is* updated by React Native's `Appearance.setColorScheme()` (already called by [GluestackUIProvider](components/ui/gluestack-ui-provider/index.tsx) via its `mode` prop). So `global.css` now has one unconditional `:root { }` block (dark) and a `@media (prefers-color-scheme: light) { @layer theme { :root { } } }` block (light peach) — not class selectors.
- **The other big lesson learned**: `Appearance.setColorScheme()` silently did nothing at all — confirmed by logging `Appearance.getColorScheme()` immediately after calling `setColorScheme('light')` and seeing it still report `'dark'`. Root cause: `app.json` had `"userInterfaceStyle": "dark"`, which locks the native Android layer's reported color scheme regardless of any JS-side override. Changed to `"userInterfaceStyle": "automatic"` — **this requires a native rebuild to take effect** (already done and confirmed working this session).
- [AppGate.tsx](src/components/app/AppGate.tsx) (new): sits inside the SQLite/QueryClient providers (where `useSettings()` works), applies the theme mutation synchronously during render (avoids a one-frame flash of stale colors), and reports the mode up to `App.tsx`.
- `App.tsx`: `GluestackUIProvider`'s `mode` prop and `NavigationContainer`'s `key` both depend on the theme mode. **The `key` change forces a full remount of the navigation tree** — this is *necessary* for inline `colors.x`-styled screens to actually repaint (mutating a plain object doesn't make React re-render on its own), but it's also the source of two side effects, one fixed and one not:
  - **Fixed**: the remount used to reset navigation back to the initial route on every theme toggle. Now `NavigationContainer` gets `initialState`/`onStateChange` wired to a `navStateRef` that survives the remount (the ref lives in `App()`, not in the subtree being torn down), so toggling theme mid-navigation stays on the same screen.
  - **Not fixed, by design deferred to the black-hole feature**: the remount is an abrupt unmount/mount and reads as a visible flicker. Two attempts to soften it (`LayoutAnimation.configureNext`, then a manual `Animated.Value` opacity fade wrapping the whole tree) were both tried and both reverted at the user's request — `LayoutAnimation` doesn't reliably animate a full tree swap on Android, and the manual fade "still felt like a flicker." **The plan now is for the black-hole overlay itself to hide the remount** (the overlay is opaque at the peak of the "suction", which is also when the actual `theme_mode` mutation should fire — see below), rather than solving flicker-hiding as a separate problem.
- Settings toggle: [SettingsScreen.tsx](src/screens/SettingsScreen.tsx) has a "Theme" row (DARK/LIGHT, tap to toggle). [DashboardScreen.tsx](src/screens/DashboardScreen.tsx) also has a small sun/moon icon button (top right, next to the budget-mode pill) doing the same `updateSettings.mutate({ theme_mode: ... })` call. **Both of these are exactly where the black-hole trigger needs to be wired in** (see below) — the button's on-screen position needs to be measured (not hardcoded) as the effect's origin.

## Biometric lock

- New `settings.biometric_lock_enabled` column (see migration below). [LockScreen.tsx](src/components/app/LockScreen.tsx) (new) is shown by `AppGate` instead of the app content when this is on; it calls `expo-local-authentication`'s `hasHardwareAsync`/`isEnrolledAsync`/`authenticateAsync` and only renders `children` once unlocked (in-memory `unlocked` state — re-locks every cold start, not on backgrounding, which was not asked for).
- Toggle lives next to Theme in [SettingsScreen.tsx](src/screens/SettingsScreen.tsx), guarded so turning it ON checks hardware/enrollment first and shows an `Alert` instead of silently locking the user out.
- `app.json` got `ios.infoPlist.NSFaceIDUsageDescription` added (untested on iOS — this whole session was Android-only per the environment's constraints).
- Confirmed working on the physical phone (fingerprint prompt appears / device's own fingerprint sensor authenticates through the phone's normal handling).

## DB migration

- `DB_VERSION` bumped **8 → 9**. New step adds `settings.theme_mode TEXT NOT NULL DEFAULT 'dark'` and `settings.biometric_lock_enabled INTEGER NOT NULL DEFAULT 0` via `ALTER TABLE ADD COLUMN`. Fresh installs get both via `CREATE_TABLES_SQL` directly (schema.ts) — the migration runner's `currentVersion === 0` branch was changed to jump straight to `DB_VERSION` (was previously hardcoded to `8`, which would have replayed the v8→v9 `ALTER TABLE` against a table that already has those columns and crashed with "duplicate column name"; worth double-checking this pattern the next time `DB_VERSION` bumps again).
- Confirmed working against real pre-existing data on the physical phone (migrated cleanly from whatever version it was on to v9, no data loss).
- `migrations.ts` and `App.tsx`'s `onInit` still carry this session's **temporary diagnostic logging** (`diag(...)` calls, a 10s hang-detection timer, `[onInit]`/`[RootNavigator]`/`[BudgetSetupScreen]` console.log lines) added while root-causing the blank-screen bug. Also `App.tsx` has a `StartupErrorBoundary` that renders a readable error screen instead of a blind crash — this one is **worth keeping permanently** (it's what let several real bugs get diagnosed live this session instead of guessing blind); the verbose step-by-step `diag()` logging is more debatable and could be trimmed now that the bug it was chasing is fixed.

## Uncommitted state

Nothing from this session has been committed yet. `git status` shows:
- Modified: `App.tsx`, `app.json`, `global.css`, `package.json`/`package-lock.json` (added `expo-local-authentication`, `expo-dev-client`, `@shopify/react-native-skia`), `src/components/app/Screen.tsx`, `src/db/migrations.ts`, `src/db/schema.ts`, `src/db/types.ts`, `src/navigation/RootNavigator.tsx` (diagnostic logging), `src/screens/{Accounts,Bills,BudgetSetup,CategoryManagement,Dashboard,Debts,Goals,Settings}Screen.tsx`, `src/theme/{colors,index}.ts`
- New: `src/components/app/AddItemSheet.tsx`, `src/components/app/AppGate.tsx`, `src/components/app/LockScreen.tsx`

Consider committing in logical chunks (blank-screen fix / local-build unblock is arguably its own commit, theme system another, biometric lock another, sidebar+detail redesign another) rather than one giant commit, but that's a judgment call for whoever picks this up — **don't commit without being asked**.

## Pending: black-hole theme transition (Android only) — full spec

The user wants the theme toggle to trigger a cinematic effect where the button acts like a gravitational singularity that sucks in the current theme and explodes the new one outward, **not** a plain fade or circular reveal. Exact spec as given, preserved in full because the visual/timing details matter:

**Concept**: tapping the toggle turns it into a black hole. Phase 1 (0–200ms): button activates, slight scale/bounce, glow, small particles begin orbiting, vortex begins forming. Phase 2 (200–750ms): current theme visually gets pulled toward the button, particles spiral inward accelerating as they approach center, vortex rotation speeds up, UI appears compressed toward the singularity. Phase 3 (~750–850ms): peak — everything reaches the center, strongest distortion/glow, **the actual theme state should switch at this exact moment** (hidden by the overlay's opacity/coverage at this point). Phase 4 (850–1400ms): new theme's color explodes outward from the button, particles move outward, vortex reverses into a release. Phase 5 (1400–1700ms): particles and glow fade away, overlay removed. Same in reverse for light→dark. Closer particles move faster (inverse relationship between radius and speed) — genuine spiral motion, not straight lines.

**Requirements the user was explicit about**:
- Android only — do not spend effort on iOS.
- Not a basic fade/crossfade/simple circular reveal (a growing/shrinking circular mask is probably structurally necessary for "reveal from a point," but it must be visually dominated by the vortex/particle/distortion effect layered on top, not read as "just a circle").
- Must originate from the **actual measured position of whichever toggle button was tapped** (there are two — Dashboard and Settings — see above) — never hardcoded to screen center.
- Prefers React Native Reanimated (already at `~4.1.1`) + `@shopify/react-native-skia` (just npm-installed, **native rebuild not yet run**) + Gesture Handler (`~2.28.0`, already present). Explicitly open to SkSL/`RuntimeEffect` shaders and GPU rendering if it makes the effect meaningfully better — user said not to limit to plain Views if Skia can do better.
- Performance: 60fps minimum, prefer Reanimated shared values/worklets/derived values over JS-thread loops, `setInterval`/`setTimeout`-driven animation, per-frame React state updates, or hundreds of individual React particle components.
- While the animation runs: disable the toggle button, prevent duplicate/overlapping triggers, restore interaction once done.
- User explicitly said: "I would rather have one extremely convincing black-hole transition than a bunch of generic particles flying around" — the particles support the illusion, they aren't the main effect. The main illusion is "the screen is being sucked into this button, then the new theme explodes out of it."
- Deliverable must be the actual working feature in this codebase, not a conceptual writeup.

**Implementation status**: **not started in code.** Design direction that was being formed when this handoff was written (not committed to, worth re-evaluating fresh): a single always-mounted full-screen Skia `<Canvas>` overlay near the app root (sibling to `AppGate`'s tree in `App.tsx`), controlled via a small module-level "shared value bus" (Reanimated shared values created once, referenced both by the overlay component and by an exported `triggerThemeTransition({ x, y, fromMode, toMode, onPeak })` function) so either toggle button can invoke it without prop-drilling — the button's own `onPress` measures its position via `measureInWindow` and calls this function; the actual `updateSettings.mutate({ theme_mode })` call moves from the button's `onPress` into the `onPeak` callback, fired by the animation timeline at the ~750–850ms mark, so the underlying remount/flicker happens while the overlay is opaque and is naturally hidden by it. Whether to attempt literally capturing+distorting the real screen pixels (`makeImageFromView` or similar) versus a stylized vortex/particle/glow effect using the theme's own background colors (much lower risk, still likely to look genuinely good) is an open decision — leaning toward the latter given how much of this session was already spent on lower-level plumbing, but the user's spec reads as wanting the more literal effect if feasible.

**Next steps for whoever picks this up**:
1. Have the user run the `gradlew` rebuild command above to actually link `@shopify/react-native-skia` natively (it's `npm install`ed but not built in yet).
2. Decide the capture-real-pixels vs. stylized-vortex question above before writing the shader/overlay — this materially changes the implementation approach.
3. Build the shared-value trigger bus + overlay component, wire both toggle buttons to measure their position and call it, move the `theme_mode` mutation into the peak callback.
4. Iterate on the shader/timing via Metro reload (no rebuild needed for JS/shader-source changes once Skia is linked) using the same dev-client + `adb reverse tcp:8081 tcp:8081` + relaunch-via-deep-link flow already established this session.
