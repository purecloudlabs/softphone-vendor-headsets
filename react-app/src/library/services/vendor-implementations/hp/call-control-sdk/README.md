# `@hp/call-control-sdk` (vendored)

HP Poly Call Control SDK, vendored into this repository rather than consumed as a
dependency.

## Why

HP does not publish this SDK to npm. Consuming it as
`"@hp/call-control-sdk": "github:HPInc/softphone-vendor-headsets#HP-4.0.0"` made it a
git-resolved *subdependency* of every downstream consumer, which package managers
reject under stricter supply-chain settings — notably pnpm's `blockExoticSubdeps`,
which fails the install of `genesys-cloud-webrtc-sdk@14.2.2+` outright.

Vendoring removes the dependency edge entirely, so no consumer has to install
anything or relax their package manager configuration.

## Provenance

| | |
|---|---|
| Source | https://github.com/HPInc/softphone-vendor-headsets |
| Tag | `HP-4.0.0` |
| Commit | `aa543bd04d00dbe855806829ea9b5cb2a5c3ef76` |
| SDK version | 4.0.0 |

Files are byte-for-byte copies of that commit. `LICENSE.md` is HP's `license.md`,
renamed only for discoverability; it is otherwise unmodified. Distribution here relies
on the object-code grant in its Section 2.3 — do not republish these files as a
standalone package.

## Updating

1. Pick the new tag in the HP repository above.
2. Overwrite `call_control_sdk.js`, `call_control_sdk.d.ts`, `call_control_sdk.wasm`
   and `license.md` (as `LICENSE.md`) with that tag's contents, unmodified.
3. Update the table above, including the commit SHA.
4. Verify `npm run build` copies the `.js`/`.wasm` into both `dist/cjs` and `dist/es`
   (see `scripts/copy-vendored-assets.js`) — `tsc` does not copy non-TS assets, and
   the SDK resolves its wasm relative to its own module URL.

## Notes

`call_control_sdk.js` is a prebuilt ES module with no dependencies of its own. It
loads `call_control_sdk.wasm` via `new URL('call_control_sdk.wasm', import.meta.url)`,
so the wasm must always sit directly beside the `.js` in any build output.
