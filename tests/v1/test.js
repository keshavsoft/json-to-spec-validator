import validate from "../../src/index.js";
import spec from "./spec.json" with {type: "json"};

console.log(validate(spec));