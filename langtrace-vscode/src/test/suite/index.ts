import * as fs from "fs";
import * as path from "path";
import Mocha from "mocha";

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: "bdd",
    timeout: 10000,
  });

  const testDir = __dirname;
  const files = fs
    .readdirSync(testDir)
    .filter((f) => f.endsWith(".test.js"))
    .sort();

  for (const file of files) {
    mocha.addFile(path.join(testDir, file));
  }

  await new Promise<void>((resolve, reject) => {
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}

