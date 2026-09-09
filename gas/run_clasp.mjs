import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.chdir(__dirname);
process.argv = [process.argv[0], "C:\\Users\\USER\\AppData\\Roaming\\npm\\node_modules\\@google\\clasp\\build\\src\\index.js", ...process.argv.slice(2)];

const claspUrl = pathToFileURL("C:\\Users\\USER\\AppData\\Roaming\\npm\\node_modules\\@google\\clasp\\build\\src\\index.js").href;
await import(claspUrl);
