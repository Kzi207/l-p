const excluded = "input,textarea,select,[contenteditable]:not([contenteditable='false']),[role='slider'],canvas,[draggable='true'],[data-mouse-drag-scroll='off']";

export function installMouseDragScroll(doc: Document, win: Window & typeof globalThis) {
  let gesture: { id: number; x: number; y: number; lastX: number; lastY: number; target: HTMLElement; scroller: HTMLElement | null; axis: "x" | "y" | null; moved: boolean } | null = null;
  let suppressClickUntil = 0;
  let draggedTarget: HTMLElement | null = null;

  function findScroller(target: HTMLElement, axis: "x" | "y", delta: number) {
    const root = doc.scrollingElement as HTMLElement | null;
    for (let node: HTMLElement | null = target; node; node = node.parentElement) {
      const style = win.getComputedStyle(node);
      const overflow = axis === "y" ? style.overflowY : style.overflowX;
      const position = axis === "y" ? node.scrollTop : node.scrollLeft;
      const maximum = axis === "y" ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
      if ((/auto|scroll|overlay/.test(overflow) || node === root) && maximum > 1 && (delta > 0 ? position > 0 : position < maximum - 1)) return node;
    }
    return null;
  }
  function down(event: PointerEvent) {
    if (event.defaultPrevented || event.pointerType !== "mouse" || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof win.Element ? event.target as HTMLElement : null;
    if (!target || target.closest(excluded)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, target, scroller: null, axis: null, moved: false };
  }
  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!(event.buttons & 1)) { finish(); return; }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      gesture.axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      gesture.scroller = findScroller(gesture.target, gesture.axis, gesture.axis === "y" ? dy : dx);
      if (!gesture.scroller) { gesture = null; return; }
      gesture.moved = true;
      gesture.target.setPointerCapture?.(event.pointerId);
      win.getSelection()?.removeAllRanges();
      doc.documentElement.classList.add("mouse-drag-scrolling");
    }
    event.preventDefault();
    const node = gesture.scroller!;
    node.scrollTo({
      top: node.scrollTop - (gesture.axis === "y" ? event.clientY - gesture.lastY : 0),
      left: node.scrollLeft - (gesture.axis === "x" ? event.clientX - gesture.lastX : 0),
      behavior: "instant",
    });
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  }
  function finish() {
    if (gesture?.moved) { suppressClickUntil = Date.now() + 400; draggedTarget = gesture.target; }
    if (gesture?.target.hasPointerCapture?.(gesture.id)) gesture.target.releasePointerCapture(gesture.id);
    gesture = null;
    doc.documentElement.classList.remove("mouse-drag-scrolling");
  }
  function click(event: MouseEvent) {
    if (event.detail === 0 || Date.now() > suppressClickUntil || !draggedTarget) return;
    const target = event.target as Node;
    if (target === draggedTarget || draggedTarget.contains(target) || (target instanceof win.Element && target.contains(draggedTarget))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
    suppressClickUntil = 0;
    draggedTarget = null;
  }
  function drag(event: DragEvent) { if (gesture) event.preventDefault(); }
  doc.addEventListener("pointerdown", down);
  doc.addEventListener("pointermove", move, { passive: false });
  doc.addEventListener("pointerup", finish);
  doc.addEventListener("pointercancel", finish);
  doc.addEventListener("dragstart", drag);
  doc.addEventListener("click", click, true);
  win.addEventListener("blur", finish);
  return () => {
    finish();
    doc.removeEventListener("pointerdown", down);
    doc.removeEventListener("pointermove", move);
    doc.removeEventListener("pointerup", finish);
    doc.removeEventListener("pointercancel", finish);
    doc.removeEventListener("dragstart", drag);
    doc.removeEventListener("click", click, true);
    win.removeEventListener("blur", finish);
  };
}
