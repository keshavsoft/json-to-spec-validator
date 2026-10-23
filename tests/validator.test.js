import test from "node:test";
import assert from "node:assert/strict";
import { validateSpec } from "../src/v1/index.js";

test("accepts an allowed button spec", () => {
    const result = validateSpec({ spec: { tagName: "button", textContent: "Save", attributes: { type: "button" } } });
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, []);
});

test("rejects a value attribute on div when catalog does not allow it", () => {
    const result = validateSpec({ spec: { tagName: "div", attributes: { value: "Hello" } } });
    assert.equal(result.isValid, false);
    assert.equal(result.errors[0].path, "spec.attributes.value");
});

test("rejects unsupported tags", () => {
    const result = validateSpec({ spec: { tagName: "made-up-tag" } });
    assert.equal(result.isValid, false);
    assert.match(result.errors[0].message, /Unsupported tag/);
});
