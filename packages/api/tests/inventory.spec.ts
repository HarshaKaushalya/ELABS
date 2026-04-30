import assert from "node:assert/strict";
import { getPagination } from "../src/utils/pagination";

const value = getPagination(2, 10);
assert.equal(value.offset, 10);
console.log("inventory.spec placeholder passed");