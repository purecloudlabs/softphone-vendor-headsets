/**
 * Custom webpack loader for @hp/call-control-sdk
 *
 * Problem: The HP Call Control SDK uses `new URL("call_control_sdk.wasm", import.meta.url)`
 * to locate its wasm file at runtime. The @open-wc/webpack-import-meta-loader then rewrites
 * `import.meta.url` to point at the source file path in node_modules, which results in the
 * wasm being fetched from a non-existent path like:
 *   http://host/node_modules/@hp/call-control-sdk/call_control_sdk.wasm
 *
 * Solution: This loader runs BEFORE the open-wc loader and replaces the
 * `new URL("call_control_sdk.wasm", import.meta.url)` expression with a version that
 * resolves the wasm file relative to the currently executing script (the bundle output).
 * This way, the wasm is fetched from the same directory as the bundle JS file,
 * which is where copy-webpack-plugin places it.
 */
module.exports = function hpWasmLoader(source) {
  // Replace the wasm URL resolution to use document.currentScript.src (for <script> tags)
  // or self.location.href (for web workers) as the base URL.
  // This ensures the wasm is loaded from the same directory as the bundle.
  const transformed = source.replace(
    /new URL\("call_control_sdk\.wasm",\s*import\.meta\.url\)/g,
    '(function() {' +
    ' var base = (typeof document !== "undefined" && document.currentScript && document.currentScript.src)' +
    ' || (typeof self !== "undefined" && self.location && self.location.href)' +
    ' || "";' +
    ' return new URL("call_control_sdk.wasm", base);' +
    '})()'
  );

  return transformed;
};
