# UTX Wallet

UTX Wallet is a React Native mobile app for a Bitcoin wallet. It is built without Expo and uses TypeScript, Clean Architecture, reusable UI components, providers, hooks, services, repositories, and use cases.

This first stage is intentionally an app shell. The project has architecture, navigation, screens, theme, test setup, and mockable infrastructure, but it does not yet implement real Bitcoin wallet logic such as seed generation, transaction signing, UTXO sync, or API broadcasting.

## Stack

- React Native CLI, no Expo
- TypeScript strict mode
- React Navigation
- Jest
- React Native Testing Library
- ESLint and Prettier
- Android/iOS native projects

## Architecture

The project follows Clean Architecture boundaries:

```text
src/
  app/              App composition, providers, navigation
  core/             Domain, use cases, services, infrastructure
  presentation/     Components, hooks, screen shells
  shared/           Constants, theme, types, utilities

tests/
  mocks/            Storage, navigation, API, and render helpers
  setup/            Jest setup
  unit/             Unit tests
  integration/      Reserved for integration tests
```

Main dependency flow:

```text
screens/components -> hooks -> providers/services -> use cases -> repositories -> infrastructure
```

Screens must stay thin and should consume hooks. Hooks and providers expose services. Services orchestrate use cases. Use cases depend on domain repository interfaces. Infrastructure contains concrete implementations for storage, APIs, adapters, and repositories.

## Bitcoin Scope Prepared

The base architecture is prepared for:

- mainnet
- testnet
- testnet3
- testnet4
- online mode
- offline mode
- secure mode with personal node

Real wallet behavior is not implemented yet. Future Bitcoin rules should be introduced through domain entities, repository interfaces, use cases, services, and providers before being consumed by screens.

## Running

Install dependencies:

```sh
npm install
```

Start Metro:

```sh
npm start
```

Run on Android:

```sh
npm run android
```

Run on the currently active Android device/emulator using only its ABI:

```sh
npm run android:active
```

Run on iOS:

```sh
bundle install
bundle exec pod install --project-directory=ios
npm run ios
```

## Build

Build Android debug APK:

```sh
npm run build:android:debug
```

Build a smaller debug APK for x86_64 emulators:

```sh
npm run build:android:debug:x86_64
```

Build Android release APK:

```sh
npm run build
```

Generated APKs:

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
```

Clean Android build outputs:

```sh
npm run clean:android
```

## Quality Checks

Run the full validation before finishing changes:

```sh
npm run validate
```

Individual commands:

```sh
npm run typecheck
npm run lint
npm test
npm run test:ci
npm run test:watch
npm run format
```

Run `npm run lint` for every implementation change before considering the work complete. Fix all reported errors and warnings instead of leaving lint debt for a later change.

When changing navigation, native dependencies, entrypoints, or build scripts, also run:

```sh
npm run build:android:debug
```

## Development Rules

- Keep TypeScript strict.
- Keep business logic out of screens.
- Use SOLID, Clean Code, and small testable units.
- Add or update tests for behavior changes.
- Run lint on every implementation and keep the lint output clean.
- Keep external integrations inside `src/core/infrastructure`.
- Keep repository interfaces in `src/core/domain/repositories`.
- Add wallet behavior through use cases before exposing it to UI.

See [AGENTS.md](./AGENTS.md) for detailed engineering guidance for future implementation work.

## Android Emulator Troubleshooting

If `npm run android` fails during `:app:installDebug` with `Unknown API Level`, `ShellCommandUnresponsiveException`, or `INSTALL_FAILED_INSUFFICIENT_STORAGE`, the build is usually fine and the AVD/ADB install step is failing.

Recommended checks:

```sh
adb devices -l
adb shell getprop sys.boot_completed
adb shell df -h /data
```

If the emulator has little free space, wipe the AVD data from Android Studio Device Manager or create an emulator with more internal storage. For x86_64 emulators, prefer:

```sh
npm run android:active
```
