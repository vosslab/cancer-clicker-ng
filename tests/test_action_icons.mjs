import assert from "node:assert/strict";
import test from "node:test";

import { SVG_ICON_NAMES, svgIconModel } from "../src/svg/icons.ts";

test("action icon catalog keeps every decorative glyph in the shared coordinate system", () => {
  for (const name of SVG_ICON_NAMES) {
    const icon = svgIconModel(name);
    assert.equal(icon.viewBox, "0 0 24 24");
    assert.ok(icon.primitives.length > 0, `${name} supplies visible geometry`);
    for (const primitive of icon.primitives) {
      assert.equal(primitive.attributes.stroke, "currentColor");
      assert.equal(primitive.attributes.fill, "none");
    }
  }
});
