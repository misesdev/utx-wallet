# AGENTS.md

## Project Summary

UTX Wallet is a React Native mobile app, without Expo, for a Bitcoin wallet. The current stage is architecture-first: app shell, navigation, reusable UI, domain contracts, services, providers, and tests are prepared, but real wallet logic is intentionally not implemented yet.

Do not implement real Bitcoin transaction building, signing, broadcasting, UTXO synchronization, seed generation, wallet encryption, or external API integration until explicitly requested.

## Engineering Principles

Use these principles in every change:

- TypeScript strict mode is mandatory.
- Prefer Clean Architecture boundaries over shortcut imports.
- Apply SOLID, Clean Code, small functions, and explicit dependencies.
- Keep business rules out of screens and components.
- Add abstractions only when they protect a real boundary or reduce real duplication.
- Favor dependency injection through providers/services/repositories instead of direct construction in UI.
- External dependencies and platform integrations belong in `core/infrastructure`.
- Domain contracts belong in `core/domain` and must not depend on React Native or infrastructure.
- Future wallet rules must enter through use cases first.

## Architecture Rules

The intended flow is:

```text
screens/components -> hooks -> providers/services -> use cases -> repository interfaces -> infrastructure implementations
```

Do not skip layers for business behavior. Screens may compose layout and call hooks, but must not implement wallet rules.

## Directory Guide

```text
src/
  app/
    App.tsx                  App composition and root entry below top-level App.tsx
    navigation/              Root, auth, app navigators and route types
    providers/               App-wide dependency and state providers
  core/
    domain/
      entities/              Bitcoin wallet domain types
      repositories/          Repository interfaces only
      usecases/              Application business actions
    application/
      services/              Use case orchestration
      dtos/                  Data transfer shapes
      errors/                Application-level errors
    infrastructure/
      api/                   HTTP/API clients
      adapters/              API/node adapters
      repositories/          Repository implementations
      storage/               Storage implementations
  presentation/
    components/              Reusable UI components
    hooks/                   UI-facing hooks
    screens/                 Screen shells only
  shared/
    constants/               Shared constants
    theme/                   Theme definitions
    types/                   Shared types
    utils/                   Pure utilities

tests/
  mocks/                     Test doubles for storage, navigation, APIs, providers
  setup/                     Jest setup files
  unit/                      Unit tests
  integration/               Integration tests when added
```

## Bitcoin Network Scope

The architecture must remain ready for:

- `mainnet`
- `testnet`
- `testnet3`
- `testnet4`
- online mode
- offline mode
- secure mode with personal node

Network selection and node behavior should be represented through domain types, services, providers, and infrastructure adapters. Do not hardcode wallet behavior in screens.

## UI Guidelines

- Keep the visual language black and white, minimal, modern, and security-focused.
- Use base components from `src/presentation/components/base` before creating screen-specific UI.
- Avoid duplicated styles when a base component can express the layout.
- Components should be small, typed, reusable, and testable.
- Use hooks for state and service access from UI.

## Testing Requirements

Every implementation change must include or update tests when behavior is added or changed.

Before finishing work, run:

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
```

For final validation, prefer:

```sh
npm run validate
```

When native dependencies, navigation, entrypoints, or build scripts change, also run:

```sh
npm run build:android:debug
```

Use React Native Testing Library for UI tests. Keep mocks in `tests/mocks` and Jest setup in `tests/setup`.

## Build And Run

Start Metro:

```sh
npm start
```

Run Android:

```sh
npm run android
```

Build Android APKs:

```sh
npm run build:android:debug
npm run build
```

## Current Non-Goals

Do not add these without explicit direction:

- Real seed/mnemonic generation.
- Real key derivation.
- Real transaction construction or signing.
- Real UTXO sync.
- Real broadcast integration.
- Bitcoin transaction libraries.
- Persistent production-grade secure storage.
- API calls that affect wallet state.

## Documentation Expectations

When adding a new feature area, update `README.md` if it changes how the app is run, built, tested, or understood. Update this file if it changes the architecture rules future agents must follow.

## Android Emulator Notes

When `npm run android` fails only at `:app:installDebug`, check ADB/emulator state before changing app code. Common causes are an AVD that has not finished booting, low `/data` storage, or ADB disconnects.

Useful commands:

```sh
adb devices -l
adb shell getprop sys.boot_completed
adb shell df -h /data
npm run android:active
npm run build:android:debug:x86_64
```

Do not treat emulator storage/install failures as application architecture failures unless `assembleDebug`, `typecheck`, `lint`, or Jest also fail.