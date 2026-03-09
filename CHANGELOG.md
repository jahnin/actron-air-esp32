## [1.0.2](https://github.com/johnf/actron-air-esphome/compare/v1.0.1...v1.0.2) (2026-03-09)

### Bug Fixes

* bug with release process ([b2f08d1](https://github.com/johnf/actron-air-esphome/commit/b2f08d178303fb9dd8d4fda130d2deec8816e5d1))

## [1.0.1](https://github.com/johnf/actron-air-esphome/compare/v1.0.0...v1.0.1) (2026-03-09)

### Bug Fixes

* bug with release process ([c17c265](https://github.com/johnf/actron-air-esphome/commit/c17c2650bcf8191f1810aabdacc15e2d09100f16))

## [1.0.0](https://github.com/johnf/actron-air-esphome/compare/v0.4.0...v1.0.0) (2026-03-07)

### ⚠ BREAKING CHANGES

* Lovelace card configuration has changed. The card now
requires a climate_entity instead of entity_prefix and zone_count.
Zone naming and preset configuration has moved to the integration's
config/options flow.

- Add zone_names and custom_presets to integration config/options
- Add config entry migration from v1 to v2
- Simplify Lovelace card editor to a single climate entity picker
- Card reads zone names and count from climate entity attributes
- Add preset_menu with add/remove preset steps in config flow

### Features

* add custom zone names and multi-zone presets ([d10023c](https://github.com/johnf/actron-air-esphome/commit/d10023cef029d3dc02c6c4aa9a6105f198bb3d6f))

## [0.4.0](https://github.com/johnf/actron-air-esphome/compare/v0.3.5...v0.4.0) (2026-03-07)

### Features

* update version script to also set package.json and CARD_VERSION ([74214e3](https://github.com/johnf/actron-air-esphome/commit/74214e373b0e2b3b7784034fa1a8bd0430ee43a5))

### Bug Fixes

* add mising index.html for build ([288a811](https://github.com/johnf/actron-air-esphome/commit/288a811cbe44fa5ff6bae082be3c56a2e45ff09b))

## [0.3.5](https://github.com/johnf/actron-air-esphome/compare/v0.3.4...v0.3.5) (2026-03-07)

### Bug Fixes

* add S as an LCD code ([bf1adad](https://github.com/johnf/actron-air-esphome/commit/bf1adad966e05d898c4bd3f085839d7f8da1d682))
* switch fan and mode on display ([5452835](https://github.com/johnf/actron-air-esphome/commit/54528351f58ed823bb89c1d3d22536c17b389ba9))

## [0.3.4](https://github.com/johnf/actron-air-esphome/compare/v0.3.3...v0.3.4) (2026-02-15)

### Bug Fixes

* **ci:** use venv instead of --system for ESPHome install ([1300dd4](https://github.com/johnf/actron-air-esphome/commit/1300dd4ebeee12be3cb759de359447668c144d9a))

## [0.3.3](https://github.com/johnf/actron-air-esphome/compare/v0.3.2...v0.3.3) (2026-02-12)

### Bug Fixes

* render 8 zones correctly ([834b5a0](https://github.com/johnf/actron-air-esphome/commit/834b5a081bc88397294945585ffaaf1458aff4f3))

## [0.3.2](https://github.com/johnf/actron-air-esphome/compare/v0.3.1...v0.3.2) (2026-02-03)

### Bug Fixes

* invert zone 5-8 logic ([9c13683](https://github.com/johnf/actron-air-esphome/commit/9c13683c1bd258d085152e3a5e7f85b5572ecdd4))
* use bool type for the pulses ([869cc68](https://github.com/johnf/actron-air-esphome/commit/869cc68eb969aa2335764c196dcaeaad85235f20))

## [0.3.1](https://github.com/johnf/actron-air-esphome/compare/v0.3.0...v0.3.1) (2026-01-05)

### Bug Fixes

* remove room sensor ([450c98e](https://github.com/johnf/actron-air-esphome/commit/450c98eeff3fb994ef15b5ad14ea8761a5195c94))

## [0.3.0](https://github.com/johnf/actron-air-esphome/compare/v0.2.0...v0.3.0) (2026-01-05)

### Features

* add zone 8 support ([dce1e8f](https://github.com/johnf/actron-air-esphome/commit/dce1e8fbe74f22f6da9a83d9fb36bfe20784bad4))
* working layout with capacitor and diode ([7762ba4](https://github.com/johnf/actron-air-esphome/commit/7762ba4c71e828f54d771d9bce8ffb7c10a974c4))

### Bug Fixes

* add missing http dependency to integration ([7d5bfa0](https://github.com/johnf/actron-air-esphome/commit/7d5bfa0713f3120b3d6403b89caa39cdae667df3))
* re-order manifest keys alphabetically ([43a3508](https://github.com/johnf/actron-air-esphome/commit/43a35087fdea0e3564a6fb411b4c67c42c0e67cc))
* updated schematic with capacitor ([374d5d3](https://github.com/johnf/actron-air-esphome/commit/374d5d36a9e797d502ccdd8d46cb85b07980b614))
* wait longer between button presses on loops ([2cd7f29](https://github.com/johnf/actron-air-esphome/commit/2cd7f295a3b5055ef06eaa1ecc3c7372b87eade0))

## [0.2.0](https://github.com/johnf/actron-air-esphome/compare/v0.1.5...v0.2.0) (2025-12-30)

### Features

* add configurable I2C address for MCP4725 DAC ([30d058b](https://github.com/johnf/actron-air-esphome/commit/30d058b5c171b51b427762f5baf39f31cf121a88))

### Bug Fixes

* fritzing updates ([e09823b](https://github.com/johnf/actron-air-esphome/commit/e09823be74a3d92368da03c37abb4ed10d9de0de))

## [0.1.5](https://github.com/johnf/actron-air-esphome/compare/v0.1.4...v0.1.5) (2025-12-25)

### Bug Fixes

* remove guard around card registratio ([77b58d4](https://github.com/johnf/actron-air-esphome/commit/77b58d4b25da316519c35a5b0eda740676ae8cf2))

## [0.1.4](https://github.com/johnf/actron-air-esphome/compare/v0.1.3...v0.1.4) (2025-12-24)

### Bug Fixes

* modify load path for card registration [#3](https://github.com/johnf/actron-air-esphome/issues/3) ([3b6d908](https://github.com/johnf/actron-air-esphome/commit/3b6d9087fcef42e9b121fa2ee745dae154fa78ca))
* zone rendering location ([75965d7](https://github.com/johnf/actron-air-esphome/commit/75965d7d02e8ce8f1cc379385592dbc777271b5d))

## [0.1.3](https://github.com/johnf/actron-air-esphome/compare/v0.1.2...v0.1.3) (2025-12-24)

### Bug Fixes

* add integration type ([00d6ca0](https://github.com/johnf/actron-air-esphome/commit/00d6ca014bed215584a0997ca12084c9be4959b6))
* keep manifest.json updated ([5e00df8](https://github.com/johnf/actron-air-esphome/commit/5e00df8b643e7f9c56efc840927adfa06ade6363))

## [0.1.2](https://github.com/johnf/actron-air-esphome/compare/v0.1.1...v0.1.2) (2025-12-19)

### Bug Fixes

* be consistent in zone naming ([7a38b1e](https://github.com/johnf/actron-air-esphome/commit/7a38b1e8fe5cabb56431b40378be47fccf80169e))

## [0.1.1](https://github.com/johnf/actron-air-esphome/compare/v0.1.0...v0.1.1) (2025-12-19)

### Bug Fixes

* **ci:** use gh CLI to upload zip to existing release ([30d855a](https://github.com/johnf/actron-air-esphome/commit/30d855a07f12d564fcc0fdb51098d9927c0fe18c))

## [0.1.0](https://github.com/johnf/actron-air-esphome/compare/v0.0.14...v0.1.0) (2025-12-19)

### Features

* **esphome:** convert configuration to reusable package ([a987096](https://github.com/johnf/actron-air-esphome/commit/a987096c770cb002f84c5b46585b0af0b646708a))

## [0.0.14](https://github.com/johnf/actron-air-esphome/compare/v0.0.13...v0.0.14) (2025-12-19)

### Bug Fixes

* update git URL ([f37af84](https://github.com/johnf/actron-air-esphome/commit/f37af8409b59161f5b66f513698e741b853e771b))
