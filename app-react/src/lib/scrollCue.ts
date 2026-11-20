/* scrollCue.ts
   Marks every sideways-scrolling table (.table-wrap) with .more-right /
   .more-left while columns are hidden on that side; style.css fades that
   edge. A coach who never notices the scrollbar (iPad Safari hides it,
   and a grey one blends into the page) still sees that the table goes on,
   so columns like "Observation" or "Age of trees" don't go unfilled.
   One document-level listener instead of a hook in every table: tables
   appear and disappear with tabs, rows and yes/no answers. */

function update(el: Element) {
  const w = el as HTMLElement;
  const max = w.scrollWidth - w.clientWidth;
  w.classList.toggle("more-right", max > 2 && w.scrollLeft < max - 2);
  w.classList.toggle("more-left", max > 2 && w.scrollLeft > 2);
}

export function startScrollCue(): () => void {
  let frame = 0;
  const all = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => document.querySelectorAll(".table-wrap").forEach(update));
  };
  const onScroll = (e: Event) => {
    const el = e.target;
    if (el instanceof Element && el.classList.contains("table-wrap")) update(el);
  };
  // Scroll doesn't bubble, so listen in the capture phase.
  document.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", all);
  const observer = new MutationObserver(all);
  observer.observe(document.body, { childList: true, subtree: true });
  all();
  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", all);
    observer.disconnect();
  };
}
