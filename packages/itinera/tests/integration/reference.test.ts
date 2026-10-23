import { describe, expect, it } from "vitest";
import { accessible } from "../../typedoc/accessible.mjs";

describe("an API reference page", () => {
  it("has its content as the main landmark", () => {
    expect(accessible('<div class="col-content"><h1>Step</h1></div>')).toBe(
      '<div class="col-content" role="main"><h1>Step</h1></div>',
    );
  });

  it("names the sidebar's links apart from its other navigation", () => {
    expect(
      accessible('<nav id="tsd-sidebar-links" class="tsd-navigation"></nav>'),
    ).toBe(
      '<nav id="tsd-sidebar-links" class="tsd-navigation" aria-label="Links"></nav>',
    );
  });

  it("names its list of what is on the page as a navigation landmark", () => {
    expect(
      accessible(
        '<summary><h3>On This Page</h3></summary>\n<div class="tsd-accordion-details"></div>',
      ),
    ).toBe(
      '<summary><h1>On This Page</h1></summary>\n<div class="tsd-accordion-details" role="navigation" aria-label="On this page"></div>',
    );
  });

  it("keeps permalinks out of the summaries that open and close sections", () => {
    const summary =
      '<summary><h1 id="methods">Methods<a href="#methods" aria-label="Permalink" class="tsd-anchor-icon"><svg></svg></a></h1></summary>';
    const heading =
      '<h2 id="run">run<a href="#run" aria-label="Permalink" class="tsd-anchor-icon"><svg></svg></a></h2>';
    expect(accessible(summary + heading)).toBe(
      `<summary><h1 id="methods">Methods</h1></summary>${heading}`,
    );
  });

  it("never puts a heading more than one level below the one before it", () => {
    expect(
      accessible(
        '<h1>Step</h1><h4 class="x">Hierarchy</h4><h5>Implements</h5><h3>Constructors</h3><h2>Methods</h2>',
      ),
    ).toBe(
      '<h1>Step</h1><h2 class="x">Hierarchy</h2><h3>Implements</h3><h3>Constructors</h3><h2>Methods</h2>',
    );
  });
});
