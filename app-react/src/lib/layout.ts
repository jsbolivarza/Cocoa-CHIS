/* layout.ts
   One definition of "phone", shared by the stylesheet's media query and any
   renderer that needs to change shape rather than just reflow (currently
   only the Labour tab). Ported from PHONE_QUERY in docs/js/app.js — a phone
   on its side is about 930px wide and 430px tall, so width alone does not
   answer the question. */
export const PHONE_QUERY = "(max-width: 720px), (max-height: 520px) and (orientation: landscape)";

/** Tablet and laptop: the household rail and hub layout. The exact
 *  complement of PHONE_QUERY plus the 900px rail breakpoint in style.css,
 *  so every device gets exactly one of the two shells. */
export const WIDE_QUERY = "(min-width: 901px) and (min-height: 521px)";

/** Wide enough to keep the full rail beside a wide table (laptop). Below
 *  this, steps with wide tables collapse the rail to an icon strip. */
export const ROOMY_QUERY = "(min-width: 1366px)";
