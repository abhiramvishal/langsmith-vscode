import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main() {
  // When compiled, this file lives in dist/test/runTests.js.
  // Extension development path should point at the folder containing package.json.
  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "./suite");

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

