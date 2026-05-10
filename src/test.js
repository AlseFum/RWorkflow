import {presets} from "./md/index.js"
import { parsePackage } from "./mdreader.js"
console.log(JSON.stringify(parsePackage(presets.Demo.md),null,2))