const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { File, Blob } = require("node:buffer");
const { test } = require("node:test");

test("frames are encoded into the uploaded image while originals and videos are handled safely", async () => {
  const drawings = [];
  const revoked = [];
  const context = { fillRect: (...args) => drawings.push(args), drawImage: (...args) => drawings.push(args), save() {}, restore() {}, beginPath() {}, roundRect() {}, clip() {}, fillText() {} };
  const canvas = { getContext: () => context, toBlob: callback => callback(new Blob(["encoded framed image"], { type: "image/jpeg" })) };
  class Image { naturalWidth = 1800; naturalHeight = 1200; set src(value) { this.onload(); } }
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync("src/lib/locket/locket-frames.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, File, Image, document: { createElement: () => canvas }, URL: { createObjectURL: () => "blob:photo", revokeObjectURL: url => revoked.push(url) } });
  const { applyLocketFrame, LOCKET_FRAMES } = module.exports;
  const original = new File(["original image"], "photo.png", { type: "image/png" });
  assert.equal(await applyLocketFrame(original, "none"), original);
  for (const frame of LOCKET_FRAMES.filter(frame => frame.id !== "none")) {
    const result = await applyLocketFrame(original, frame.id);
    assert.equal(result.type, "image/jpeg");
    assert.equal(result.name, `photo-${frame.id}.jpg`);
    assert.equal(await result.text(), "encoded framed image");
  }
  assert.equal(revoked.length, 5);
  assert.ok(drawings.length >= 10);
  await assert.rejects(applyLocketFrame(new File(["video"], "movie.mp4", { type: "video/mp4" }), "hearts"));
  await assert.rejects(applyLocketFrame(original, "invalid"));
});
