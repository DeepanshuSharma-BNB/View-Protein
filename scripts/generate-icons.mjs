import sharp from "sharp";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";

const directory=process.argv[2] || "site";
const svg=await readFile("icon.svg");
await mkdir(directory,{recursive:true});

for(const size of [64,192,512]){
  const output=join(directory,"icon-"+size+".png");
  const data=await sharp(svg,{density:384})
    .resize(size,size,{fit:"contain",background:"#061124"})
    .png({compressionLevel:9,effort:7})
    .toBuffer();
  await writeFile(output,data);
  const metadata=await sharp(data).metadata();
  if(metadata.format!=="png"||metadata.width!==size||metadata.height!==size){
    throw Error("Invalid PNG icon: "+output);
  }
  console.log("Generated "+output+" ("+data.length+" bytes)");
}
