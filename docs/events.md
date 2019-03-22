# Events specification

This document specifies all the data (along with the format) which gets send from the Atom editor core to the GitHub analytics pipeline.

This does not include data that's logged by packages on other repositories. Here are links to the events specs of these packages:

* **Welcome package**: [spec](https://github.com/atom/welcome/blob/master/docs/events.md).
* **Fuzzy finder package**: [spec](https://github.com/atom/fuzzy-finder/blob/master/docs/events.md).
* **GitHub package**: TBD.

## Type of events

There are 3 different types of events:

* **Counters**: Used to log the number of times a certain event happens. They don't contain any metadata or additional fields.
* **Timing events**: Used to log duration of certain actions.
* **Standard events**: Used to log any other action.

## Counters

These events are used to count how many times a certain action happens. They don't hold any metadata and they only log the name of the counter and the number of times it was incremented.

Currently Atom core is not logging any counter event, but the [GitHub package](https://github.com/atom/github) is using counters to log things like the number of created PRs.

## Timing events

Timing events log the duration that a specific action took plus some metadata that depends on the event.

| field | type | description |
|-------|------|-------------|
| `eventType` | `string` | Name of the event/action.
| `date` | `string` | Date when the event happened (In [ISO 8601](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)).
| `durationInMilliseconds` | `number` | The time it took to perform the action.
| `metadata` | `Object` | Any additional metadata.


#### Window load time ([more info](https://atom.io/docs/api/v1.35.1/AtomEnvironment#instance-getWindowLoadTime))

* **eventType**: `load`
* **metadata**

  | field | value |
  |-------|-------|
  | `ec` | `core`

#### Shell load time

* **eventType**: `load`
* **metadata**

  | field | value |
  |-------|-------|
  | `ec` | `shell`

## Standard events

Standard events have a free form and can log any data in its `metadata` object. These are the most commonly used types of events.

| field | type | description |
|-------|------|-------------|
| `eventType` | `string` | Name of the event/action.
| `date` | `string` | Date when the event happened (In [ISO 8601](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)).
| `metadata` | `Object` | Any additional metadata.

#### Window start/end events

* **eventType**: `window`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `window`
  | `ea` | `started`

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `window`
  | `ea` | `ended`
  | `ev` | Session duration (in ms).

#### Open repository

* **eventType**: `repository`
* **metadata**

  | field | value |
  |-------|-------|
  | `action` | `open`
  | `domain` | `github.com` \| `gitlab.com` \| `bitbucket.org` \| `visualstudio.com` \| `amazonaws.com` \| `other`

#### Open file

* **eventType**: `file`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `file`
  | `ea` | `open`
  | `el` | `source.${grammarType}`

#### Execute Atom command

* **eventType**: `command`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `command`
  | `ea` | First part of the command (until the colon).
  | `el` | Executed command
  | `ev` | Number of times that command has been executed in this session.

#### Pane item added

* **eventType**: `appview`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `appview`
  | `cd` | Pane item name.
  | `dt` | Pane item grammar.

#### Number of packages installed

* **eventType**: `package`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `package`
  | `ea` | `numberOptionalPackagesActivatedAtStartup`
  | `ev` | The number of non-bundled active packages at startup.

#### Number of custom keybindings

* **eventType**: `key-binding`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `key-binding`
  | `ea` | `numberUserDefinedKeyBindingsLoadedAtStartup`
  | `ev` | The number of custom key bindings.

#### Modify init script file

* **eventType**: `customization`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `customization`
  | `ea` | `userInitScriptChanged`

#### Modify user stylesheet

* **eventType**: `customization`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `customization`
  | `ea` | `userStylesheetChanged`

#### Metrics consents change

* **eventType**: `setting`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `setting`
  | `ea` | `core.telemetryConsent`
  | `el` | `limited` \| `no`

#### Deprecation API usage

* **eventType**: `deprecation-v3`
* **metadata**

  | field | value |
  |-------|-------|
  | `t` | `event`
  | `ec` | `deprecation-v3`
  | `ea` | `${packageName}@${version}` (e.g `settings@1.9.2`).
  | `el` | deprecation message.

#### Non-captured error

* **eventType**: `exception`
* **metadata**

  | field | value |
  |-------|------|
  | `metadata.t` | `exception`
  | `exd` | Exception stack trace.
  | `exf` | `0` \| `1` (whether Atom is in Dev mode).

## Common metadata fields

All the timing and the standard events contain some common metadata fields which get always logged:

| field name | type | description |
|---|---|---|
| `cd2` | `string` | Processor architecture with correct detection of 64-Windows |
| `cd3` | `string` | Processor architecture ([more info](https://nodejs.org/api/process.html#process_process_arch)) |
| `cm1` | `number` | Size of used memory heap (in MiB).
| `cm2` | `number` | Percentage of used heap (from 0-100).
| `sr` | `string`  | Screen size in pixels (e.g `1024x768`).
| `vp` | `string`  | Atom window size in pixels (e.g `400x300`).
| `aiid` | `string`  | Release channel (`stable` \| `beta` \| `dev` \| `unrecognized`).
