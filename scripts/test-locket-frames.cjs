const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { File, Blob } = require("node:buffer");
const { test } = require("node:test");

test("square crops stay within landscape and portrait images at every zoom and position", () => {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync("src/lib/locket/locket-crop.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports });
  const { squareCrop } = module.exports;
  const centered = squareCrop(1800, 1200, 1, .5, .5);
  assert.equal(centered.x, 300); assert.equal(centered.y, 0); assert.equal(centered.size, 1200);
  for (const [width, height] of [[1800, 1200], [1200, 1800], [100, 100]]) {
    for (const zoom of [.1, 1, 2.5, 4, 10]) {
      for (const position of [-1, 0, .5, 1, 2]) {
        const crop = squareCrop(width, height, zoom, position, position);
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.size <= width && crop.y + crop.size <= height);
        assert.ok(crop.size >= Math.min(width, height) / 4);
      }
    }
  }
  assert.throws(() => squareCrop(0, 100, 1, .5, .5));
});

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
  assert.equal(revoked.length, LOCKET_FRAMES.length - 1);
  assert.ok(drawings.length >= 10);
  await assert.rejects(applyLocketFrame(new File(["video"], "movie.mp4", { type: "video/mp4" }), "hearts"));
  await assert.rejects(applyLocketFrame(original, "invalid"));
});
