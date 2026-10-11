import * as recon from "./recon.js";
import { getDrive } from "./drive.js";

const drive = await getDrive();

if (!recon.setup()) {
    console.error("(!) Cannot setup recon system");
    process.exit(1);
}else console.log("(I) Recon started.");

const { dirs, files } = await recon.scan(drive);

for (let dir of dirs) console.log(`󰣞 ${dir.name}`);
for (let file of files) console.log(`󰡯 ${file.name}`);