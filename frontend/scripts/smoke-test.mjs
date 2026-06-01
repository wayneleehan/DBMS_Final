import assert from "node:assert/strict";

import { formatApiErrorDetail, normalizeWebsiteStatus } from "../src/status.js";
import { isHttpUrl, isReportableUrlInput, normalizeUserUrlInput } from "../src/url.js";

const cases = [
  ["Safe", "safe"],
  ["Low_Risk", "warn"],
  ["Warning", "warn"],
  ["Blocked", "confirmed"],
  ["safe", "safe"],
  ["warn", "warn"],
  ["danger", "danger"],
  ["confirmed", "confirmed"],
];

for (const [input, expected] of cases) {
  assert.equal(normalizeWebsiteStatus(input), expected, `${input} should map to ${expected}`);
}

assert.equal(formatApiErrorDetail("登入失敗"), "登入失敗");
assert.equal(
  formatApiErrorDetail([{ msg: "Input should be 'safe', 'warn' or 'danger'" }]),
  "Input should be 'safe', 'warn' or 'danger'",
);
assert.match(formatApiErrorDetail({ message: "Bad request" }), /Bad request/);

assert.equal(normalizeUserUrlInput("example.com/path"), "https://example.com/path");
assert.equal(normalizeUserUrlInput("http://example.com"), "http://example.com");
assert.equal(isHttpUrl("javascript:alert(1)"), false);
assert.equal(isReportableUrlInput("example.com/path"), true);
assert.equal(isReportableUrlInput("not a url"), false);

console.log("frontend smoke tests passed");
