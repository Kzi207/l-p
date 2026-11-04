const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");

test("drag scrolls nested grids, suppresses accidental clicks, and preserves controls and local gestures", () => {
  class Element {
    constructor(parent = null) { this.parentElement = parent; this.scrollTop = 0; this.scrollLeft = 0; this.scrollHeight = 0; this.scrollWidth = 0; this.clientHeight = 100; this.clientWidth = 100; this.overflowY = "auto"; this.overflowX = "auto"; }
    closest() { return this.excluded ? this : null; }
    contains(other) { return other === this || other?.parentElement && this.contains(other.parentElement); }
    setPointerCapture() {}
    scrollTo({ top, left }) { this.scrollTop = top; this.scrollLeft = left; }
  }
  const handlers = {};
  const classes = new Set();
  const root = new Element(); root.scrollHeight = 2000;
  root.classList = { add: name => classes.add(name), remove: name => classes.delete(name) };
  const grid = new Element(root); grid.scrollHeight = 1000;
  const photo = new Element(grid);
  const doc = { scrollingElement: root, documentElement: root, addEventListener: (name, fn) => { handlers[name] = fn; }, removeEventListener: name => delete handlers[name] };
  const win = { Element, getComputedStyle: node => node, getSelection: () => ({ removeAllRanges() {} }), addEventListener() {}, removeEventListener() {} };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync("src/lib/mouse-drag-scroll.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports });
  const cleanup = module.exports.installMouseDragScroll(doc, win);
  const pointer = (x, y, extra = {}) => ({ target: photo, pointerType: "mouse", button: 0, buttons: 1, pointerId: 1, clientX: x, clientY: y, preventDefault() {}, ...extra });
  handlers.pointerdown(pointer(100, 200)); handlers.pointermove(pointer(100, 120)); handlers.pointerup();
  assert.equal(grid.scrollTop, 80);
  assert.equal(root.scrollTop, 0);
  assert.equal(classes.size, 0);
  let prevented = false;
  handlers.click({ target: photo, detail: 1, preventDefault: () => { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, true);
  handlers.pointerdown(pointer(100, 200)); handlers.pointermove(pointer(101, 201)); handlers.pointerup();
  prevented = false;
  handlers.click({ target: photo, detail: 1, preventDefault: () => { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, false);
  photo.excluded = true;
  handlers.pointerdown(pointer(100, 200)); handlers.pointermove(pointer(100, 100)); handlers.pointerup();
  assert.equal(grid.scrollTop, 80);
  photo.excluded = false;
  handlers.pointerdown(pointer(100, 200, { defaultPrevented: true })); handlers.pointermove(pointer(100, 100)); handlers.pointerup();
  assert.equal(grid.scrollTop, 80);
  grid.scrollWidth = 500;
  handlers.pointerdown(pointer(200, 100)); handlers.pointermove(pointer(120, 100)); handlers.pointerup();
  assert.equal(grid.scrollLeft, 80);
  cleanup();
  assert.equal(Object.keys(handlers).length, 0);
});
