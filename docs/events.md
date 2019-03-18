# Events specification

This document all the data (and format) which gets send from Atom editor to the GitHub analytics pipeline.

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

| field | value |
|-------|------|
| `eventType` | `core`
| `metadata.t` | `event`
| `metadata.ec` | `core`
| `metadata.ea` | `load`

#### Shell load time

| field | value |
|-------|------|
| `eventType` | `shell`
| `metadata.t` | `event`
| `metadata.ec` | `shell`
| `metadata.ea` | `load`

## Standard events

Standard events have a free form and can log any data in its `metadata` object. These are the most commonly used types of events.

| field | type | description |
|-------|------|-------------|
| `eventType` | `string` | Name of the event/action.
| `date` | `string` | Date when the event happened (In [ISO 8601](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)).
| `metadata` | `Object` | Any additional metadata.

#### Window start/end events

| field | value |
|-------|------|
| `eventType` | `window`
| `metadata.t` | `event`
| `metadata.ec` | `window`
| `metadata.ea` | `started`

| field | value |
|-------|------|
| `eventType` | `window`
| `metadata.t` | `event`
| `metadata.ec` | `window`
| `metadata.ea` | `ended`
| `metadata.ev` | Session duration (in ms).

#### Open repository

| field | value |
|-------|------|
| `eventType` | `repository`
| `metadata.action` | `open`
| `metadata.domain` | `github.com` \| `gitlab.com` \| `bitbucket.org` \| `visualstudio.com` \| `amazonaws.com` \| `other`

#### Open file

| field | value |
|-------|------|
| `eventType` | `file`
| `metadata.t` | `event`
| `metadata.ec` | `file`
| `metadata.ea` | `open`
| `metadata.el` | `source.${grammarType}`

#### Execute Atom command

| field | value |
|-------|------|
| `eventType` | `command`
| `metadata.t` | `event`
| `metadata.ec` | `command`
| `metadata.ea` | First part of the command (until the colon).
| `metadata.el` | Executed command
| `metadata.ev` | Number of times that command has been executed in this session.

#### Pane item added

| field | value |
|-------|------|
| `eventType` | `appview`
| `metadata.t` | `appview`
| `metadata.cd` | Pane item name.
| `metadata.dt` | Pane item grammar.

#### Number of packages installed

| field | value |
|-------|------|
| `eventType` | `package`
| `metadata.t` | `event`
| `metadata.ec` | `package`
| `metadata.ea` | `numberOptionalPackagesActivatedAtStartup`
| `metadata.ev` | The number of non-bundled active packages at startup.

#### Number of custom keybindings

| field | value |
|-------|------|
| `eventType` | `key-binding`
| `metadata.t` | `event`
| `metadata.ec` | `key-binding`
| `metadata.ea` | `numberUserDefinedKeyBindingsLoadedAtStartup`
| `metadata.ev` | The number of custom key bindings.

#### Modify init script file

| field | value |
|-------|------|
| `eventType` | `customization`
| `metadata.t` | `event`
| `metadata.ec` | `customization`
| `metadata.ea` | `userInitScriptChanged`

#### Modify user stylesheet

| field | value |
|-------|------|
| `eventType` | `customization`
| `metadata.t` | `event`
| `metadata.ec` | `customization`
| `metadata.ea` | `userStylesheetChanged`

#### Metrics consents change

| field | value |
|-------|------|
| `eventType` | `setting`
| `metadata.t` | `event`
| `metadata.ec` | `setting`
| `metadata.ea` | `core.telemetryConsent`
| `metadata.el` | `limited` \| `no`

#### Deprecation API usage

| field | value |
|-------|------|
| `eventType` | `deprecation-v3`
| `metadata.t` | `event`
| `metadata.ec` | `deprecation-v3`
| `metadata.ea` | `${packageName}@${version}` (e.g `settings@1.9.2`).
| `metadata.el` | deprecation message.

#### Non-captured error

| field | value |
|-------|------|
| `eventType` | `exception`
| `metadata.t` | `exception`
| `metadata.exd` | Exception stack trace.
| `metadata.exf` | `0` | `1` (whether Atom is in Dev mode).

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
