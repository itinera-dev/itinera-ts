// @ts-check
import { PageEvent } from "typedoc";

/**
 * Makes each page TypeDoc writes pass axe, as every page of the
 * organisation's site does: TypeDoc's default theme leaves its content
 * outside any landmark, names two navigation landmarks alike, puts permalinks
 * inside the summaries that open and close sections, and skips heading
 * levels.
 *
 * @param {import("typedoc").Application} app
 */
export function load(app) {
  app.renderer.on(PageEvent.END, (page) => {
    if (page.contents !== undefined) page.contents = accessible(page.contents);
  });
}

/**
 * The page `html`, with what axe finds in TypeDoc's markup put right.
 *
 * @param {string} html
 * @returns {string}
 */
export function accessible(html) {
  return [
    mainLandmark,
    labelledLinks,
    pageNavigation,
    summariesWithoutLinks,
    orderedHeadings,
  ].reduce(applied, html);
}

/**
 * @param {string} html
 * @param {(html: string) => string} fix
 */
function applied(html, fix) {
  return fix(html);
}

/** @param {string} html */
function mainLandmark(html) {
  return html.replace(
    '<div class="col-content">',
    '<div class="col-content" role="main">',
  );
}

/** @param {string} html */
function labelledLinks(html) {
  return html.replace(
    '<nav id="tsd-sidebar-links" class="tsd-navigation">',
    '<nav id="tsd-sidebar-links" class="tsd-navigation" aria-label="Links">',
  );
}

/** @param {string} html */
function pageNavigation(html) {
  return html.replace(
    /(On This Page<\/h[1-6]><\/summary>\s*<div class="tsd-accordion-details")/,
    '$1 role="navigation" aria-label="On this page"',
  );
}

/** @param {string} html */
function summariesWithoutLinks(html) {
  return html.replace(/<summary\b[\s\S]*?<\/summary>/g, withoutPermalink);
}

/** @param {string} summary */
function withoutPermalink(summary) {
  return summary.replace(
    /<a href="#[^"]*" aria-label="Permalink" class="tsd-anchor-icon">[\s\S]*?<\/a>/g,
    "",
  );
}

/** @param {string} html */
function orderedHeadings(html) {
  let previous = 0;
  return html.replace(
    /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g,
    (
      _heading,
      /** @type {string} */ level,
      /** @type {string} */ attributes,
      /** @type {string} */ text,
    ) => {
      previous = Math.min(Number(level), previous + 1);
      return `<h${String(previous)}${attributes}>${text}</h${String(previous)}>`;
    },
  );
}
