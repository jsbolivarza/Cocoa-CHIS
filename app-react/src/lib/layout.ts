/* layout.ts
   One definition of "phone", shared by the stylesheet's media query and any
   renderer that needs to change shape rather than just reflow (currently
   only the Labour tab). Ported from PHONE_QUERY in docs/js/app.js — a phone
   on its side is about 930px wide and 430px tall, so width alone does not
   answer the question. */
export const PHONE_QUERY = "(max-width: 720px), (max-height: 520px) and (orientation: landscape)";
