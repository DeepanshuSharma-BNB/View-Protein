import puppeteer from "puppeteer-core";

const site="https://deepanshusharma-bnb.github.io/View-Protein/";
const browser=await puppeteer.launch({
  headless:true,executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",
  protocolTimeout:45000,
  args:["--no-sandbox","--disable-dev-shm-usage","--ignore-gpu-blocklist","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]
});
const page=await browser.newPage();
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
await page.setViewport({width:600,height:600,deviceScaleFactor:1});
try{
  await page.goto(site,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForSelector("#loadButton",{visible:true,timeout:30000});
  console.log("600px glasses shell loaded");
  await page.click("#loadButton");
  await page.waitForSelector(".preset[data-pdb='1CRN']",{visible:true,timeout:5000});
  await page.click(".preset[data-pdb='1CRN']");
  console.log("Requested crambin PDB ID 1CRN");
  await page.waitForFunction(()=>
    document.querySelector("#viewerTag")?.textContent?.includes("1CRN") &&
    document.querySelector("#busy")?.classList?.contains("hidden"),{polling:250,timeout:45000});
  const detail=await page.evaluate(()=>({
    pdb:document.querySelector("#viewerTag").textContent,
    title:document.querySelector("#proteinName").textContent,
    meta:document.querySelector("#proteinSubtitle").textContent,
    hasCanvas:!!document.querySelector("#molecule canvas"),
    modalHidden:document.querySelector("#searchSheet").classList.contains("hidden")
  }));
  console.log("Rendered protein:",JSON.stringify(detail));
  if(!detail.hasCanvas||!detail.modalHidden)throw Error("Molecular canvas or modal state incorrect");
  await page.screenshot({path:"view-protein-smoke.png"});
  await page.click("#styleButton");
  const style=await page.$eval("#viewerTag",el=>el.textContent);
  if(!style.includes("STICKS"))throw Error("Representation toggle failed: "+style);
  console.log("Molecular style change passed");
  await page.$eval("#molecule",el=>el.focus());
  await page.keyboard.press("ArrowDown");
  console.log("Focus after ArrowDown:",await page.evaluate(()=>document.activeElement?.id));
  if(errors.length)console.log("Browser errors:",JSON.stringify(errors.slice(0,6)));
  console.log("VIEW-PROTEIN-SMOKE-SUCCESS");
}catch(e){
  await page.screenshot({path:"view-protein-smoke.png"}).catch(()=>{});
  console.error("SMOKE FAILED:",e.message,"Page errors:",JSON.stringify(errors.slice(0,10)));
  console.error("UI:",await page.evaluate(()=>({
    busy:document.querySelector("#busy")?.textContent,
    modal:document.querySelector("#searchMessage")?.textContent,
    toast:document.querySelector("#toast")?.textContent,
    heading:document.querySelector("#proteinName")?.textContent
  })).catch(()=>({})));
  process.exitCode=1;
}finally{await browser.close()}
