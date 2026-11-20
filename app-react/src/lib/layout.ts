/* layout.ts
   One definition of "phone", shared by the stylesheet's media query and any
   renderer that needs to change shape rather than just reflow (currently
   only the Labour tab). Ported from PHONE_QUERY in docs/js/app.js — a phone
   on its side is about 930px wide and 430px tall, so width alone does not
   answer the question. */
export const PHONE_QUERY = "(max-width: 720px), (max-height: 520px) and (orientation: landscape)";

/** Tablet and laptop: the household rail and hub layout. Starts at 744px so
 *  an iPad held upright (744 mini, 768–834 others) keeps the tablet shell:
 *  at 901px, turning the iPad dropped it into the phone shell, which has no
 *  household overview (20.11.26). 721–743px wide still gets the phone shell;
 *  the old 900px rules in style.css only style that shell's elements. */
export const WIDE_QUERY = "(min-width: 744px) and (min-height: 521px)";

/** Upright tablet: too narrow for the full 320px rail beside a form, so
 *  every step except the overview uses the collapsed rail. */
export const NARROW_WIDE_QUERY = "(max-width: 1023px)";

/** Wide enough to keep the full rail beside a wide table (laptop). Below
 *  this, steps with wide tables collapse the rail to an icon strip. */
export const ROOMY_QUERY = "(min-width: 1366px)";
