import {normalizePdbId,validPdbId,structureUrls,metadataFromEntry} from "./pdb.js";
import {WristMotion,multiply,normalize,quaternionDistance} from "./motion.js";

const $=id=>document.getElementById(id);
const buttons=["loadButton","wristButton","zoomOutButton","zoomInButton","styleButton","recenterButton"];
const controls=["pdbInput","fetchButton","1UBQ","1CRN","4HHB","1AKI","closeSearch"];
const state={
  viewer:null,model:null,id:null,style:0,request:0,busy:false,
  sensor:null,wrist:false,baseQ:[0,0,0,1],
  lastRender:0,lastReading:0,raf:0,toastTimer:0,meta:null
};
const motion=new WristMotion({gain:.93,smoothing:.25,calibrationSamples:6});
const labels=["RIBBON","STICKS","SPHERES"];
const safeText=t=>String(t||"").trim();
const title=s=>{ $("proteinName").textContent=s };
const subtitle=s=>{ $("proteinSubtitle").textContent=s };
const note=s=>{ $("viewerNote").textContent=s };
const toast=message=>{
  clearTimeout(state.toastTimer);
  $("toast").textContent=message;
  $("toast").classList.remove("hidden");
  state.toastTimer=setTimeout(()=>$("toast").classList.add("hidden"),4200);
};
function busy(active,heading="Fetching structure",detail="Connecting to RCSB Protein Data Bank…"){
  state.busy=active;
  $("busyTitle").textContent=heading;
  $("busySub").textContent=detail;
  $("busy").classList.toggle("hidden",!active);
}
function setStatus(message,live=false){
  $("wristStatus").textContent=message;
  $("wristStatus").classList.toggle("live",live);
  $("wristButton").classList.toggle("active",live);
}
function initializeViewer(){
  if(!globalThis.$3Dmol?.createViewer){
    note("Molecular renderer unavailable");
    toast("The molecular graphics library could not load.");
    return false;
  }
  try{
    state.viewer=$3Dmol.createViewer($("molecule"),{
      backgroundColor:0x020711,
      antialias:false,
      disableFog:true,
      defaultcolors:$3Dmol.rasmolElementColors
    });
    state.viewer.setBackgroundColor(0x020711,1);
    state.viewer.render();
    window.addEventListener("resize",()=>{state.viewer?.resize();state.viewer?.render()});
    return true;
  }catch(error){
    note("WebGL is unavailable on this browser");
    toast("WebGL initialization failed: "+error.message);
    return false;
  }
}
function applyStyle(){
  if(!state.viewer||!state.model)return;
  try{
    const viewer=state.viewer;
    // Restore a clean molecular representation without resetting the camera.
    if(state.style===0){
      viewer.setStyle({}, {cartoon:{color:"spectrum"}});
      viewer.addStyle({hetflag:true}, {stick:{radius:.18,colorscheme:"Jmol"}});
    }else if(state.style===1){
      viewer.setStyle({}, {stick:{radius:.2,colorscheme:"Jmol"}});
    }else{
      viewer.setStyle({}, {sphere:{scale:.31,colorscheme:"Jmol"}});
    }
    viewer.render();
    $("viewerTag").textContent=labels[state.style]+" · "+state.id;
    toast(labels[state.style]+" representation");
  }catch(e){toast("Could not change representation: "+e.message)}
}
function cycleStyle(){
  if(!state.model){openSearch();return}
  state.style=(state.style+1)%labels.length;
  applyStyle();
}
function zoom(factor){
  if(!state.model)return;
  try{state.viewer.zoom(factor,0);state.viewer.render()}catch(e){toast("Zoom failed")}
}
function manualRotate(degrees,axis="y"){
  if(!state.model)return;
  if(state.wrist){stopWrist();toast("Wrist paused for manual rotation")}
  state.viewer.rotate(degrees,axis);
  state.viewer.render();
}
function center(){
  if(!state.model){toast("Load a protein first");return}
  try{
    state.viewer.zoomTo();
    state.viewer.render();
    state.baseQ=state.viewer.getView().slice(4,8);
    motion.recenter();
    toast("Centered · wrist neutral reset");
  }catch(e){toast("Unable to recenter molecule")}
}
function openSearch(){
  if(state.busy)return;
  $("searchSheet").classList.remove("hidden");
  $("searchMessage").textContent="Enter a PDB ID or choose a sample protein.";
  $("searchMessage").classList.remove("error");
  $("pdbInput").value=state.id||"";
  $("pdbInput").focus({preventScroll:true});
}
function closeSearch(){
  $("searchSheet").classList.add("hidden");
  $("molecule").focus({preventScroll:true});
}
async function retrieve(id,urls){
  let errors=[];
  for(const {url,format} of urls){
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort("timeout"),22000);
      try{
        const response=await fetch(url,{mode:"cors",signal:controller.signal,cache:"force-cache"});
        if(!response.ok){errors.push(format+" HTTP "+response.status);continue}
        const limit=7*1024*1024;
        const size=Number(response.headers.get("content-length")||"0");
        if(size>limit)throw Error("This structure exceeds the 7 MB glasses limit");
        const data=await response.text();
        if(data.length>limit)throw Error("The structure is too large for this glasses viewer");
        if(data.length<150||/^\s*<!doctype html/i.test(data))throw Error("Unexpected structure response");
        return {data,format};
      }finally{clearTimeout(timeout)}
    }catch(e){errors.push(format+": "+e.message)}
  }
  throw Error("Structure unavailable ("+errors.join("; ")+")");
}
async function load(id){
  id=normalizePdbId(id);
  if(!validPdbId(id)){
    $("searchMessage").textContent="Enter a valid four-character ID such as 1UBQ.";
    $("searchMessage").classList.add("error");
    $("pdbInput").focus();
    return;
  }
  if(!state.viewer){toast("The graphics engine did not initialize");return}
  const version=++state.request;
  if(state.wrist)stopWrist();
  closeSearch();
  busy(true,"Retrieving "+id,"Downloading the experimental 3D coordinates…");
  try{
    const {data,format}=await retrieve(id,structureUrls(id));
    if(version!==state.request)return;
    busy(true,"Rendering "+id,"Generating a molecular model for your display…");
    // Allow the busy overlay to be painted before CPU-intensive parsing.
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,25)));
    if(version!==state.request)return;
    state.viewer.removeAllModels();
    state.model=state.viewer.addModel(data,format,{doAssembly:false,multimodel:false});
    const atoms=state.model?.selectedAtoms?.({})||[];
    if(atoms.length===0)throw Error("No atomic coordinates were found in this entry");
    state.id=id;
    state.style=0;
    state.viewer.setStyle({}, {cartoon:{color:"spectrum"}});
    state.viewer.addStyle({hetflag:true}, {stick:{radius:.18,colorscheme:"Jmol"}});
    state.viewer.zoomTo();
    state.viewer.render();
    state.baseQ=state.viewer.getView().slice(4,8);
    motion.recenter();
    $("entryType").textContent="PDB ID · "+id;
    title(id+" · Structure");
    subtitle(atoms.length.toLocaleString()+" atoms · "+format.toUpperCase()+" coordinates");
    $("chainChip").textContent=atoms.length.toLocaleString()+" ATOMS";
    $("viewerTag").textContent="RIBBON · "+id;
    note("");
    busy(false);
    toast("Loaded "+id+" · Move wrist to inspect");
    try{localStorage.setItem("view-protein:last-id",id)}catch{}
    void loadMetadata(id,version);
  }catch(e){
    state.viewer?.removeAllModels();
    state.viewer?.render();
    state.model=null;
    busy(false);
    openSearch();
    $("searchMessage").textContent="Couldn't load "+id+": "+e.message;
    $("searchMessage").classList.add("error");
    toast("Protein not available. Try one of the examples.");
  }
}
async function loadMetadata(id,version){
  try{
    const url="https://data.rcsb.org/rest/v1/core/entry/"+encodeURIComponent(id);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8500);
    try{
      const res=await fetch(url,{signal:controller.signal,mode:"cors"});
      if(!res.ok||version!==state.request)return;
      const meta=metadataFromEntry(await res.json());
      if(version!==state.request)return;
      state.meta=meta;
      title(meta.title);
      subtitle([id,meta.method,meta.resolution].filter(Boolean).join(" · "));
      if(meta.chains)$("chainChip").textContent=meta.chains+" CHAINS";
    }finally{clearTimeout(timeout)}
  }catch{/* Metadata is optional. Coordinates have already loaded. */}
}
function wristFrame(time){
  if(!state.wrist)return;
  state.raf=requestAnimationFrame(wristFrame);
  if(document.hidden||!state.model||time-state.lastRender<35)return;
  state.lastRender=time;
  // Pause when sensor data stops, instead of continuing to imply tracking.
  if(time-state.lastReading>2400){
    setStatus("● SENSOR IDLE",false);return;
  }
  const q=motion.step();
  if(!q)return;
  const current=state.viewer.getView();
  const desired=normalize(multiply(state.baseQ,q));
  if(!desired)return;
  if(quaternionDistance(current.slice(4,8),desired)<.006)return;
  current.splice(4,4,...desired);
  state.viewer.setView(current);
  state.viewer.render();
}
function startWrist(){
  if(!state.model){toast("Load a PDB structure first");openSearch();return}
  if(!("RelativeOrientationSensor" in window)){
    toast("Wrist tracking is unavailable here. Use arrow controls.");return
  }
  try{
    const sensor=new RelativeOrientationSensor({
      sensorId:"emg-wrist",frequency:30,referenceFrame:"device"
    });
    motion.recenter();
    state.baseQ=state.viewer.getView().slice(4,8);
    state.sensor=sensor;
    state.wrist=true;
    state.lastReading=performance.now();
    state.lastRender=0;
    setStatus("● CALIBRATING",false);
    sensor.addEventListener("reading",()=>{
      state.lastReading=performance.now();
      const delta=motion.read(sensor.quaternion);
      if(delta&&motion.neutral)setStatus("● WRIST LIVE",true);
    });
    sensor.addEventListener("error",e=>{
      const reason=e.error?.name||e.error?.message||"Sensor unavailable";
      stopWrist();
      toast("Wrist input error: "+reason);
    });
    sensor.start();
    state.raf=requestAnimationFrame(wristFrame);
    toast("Keep wrist steady briefly to calibrate");
  }catch(e){stopWrist();toast("Wrist sensor unavailable: "+e.message)}
}
function stopWrist(){
  state.wrist=false;
  cancelAnimationFrame(state.raf);
  try{state.sensor?.stop()}catch{}
  state.sensor=null;
  motion.recenter();
  setStatus("● WRIST OFF");
}
function toggleWrist(){state.wrist?stopWrist():startWrist()}

function handleKeys(event){
  if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Enter","Escape","Backspace"].includes(event.key))return;
  if(!$("searchSheet").classList.contains("hidden")){
    if(event.key==="Escape"||event.key==="Backspace" && document.activeElement?.tagName!=="INPUT"){
      event.preventDefault();closeSearch();return;
    }
    if(document.activeElement===$("pdbInput")){
      if(event.key==="Enter"){event.preventDefault();void load($("pdbInput").value)}
      else if(event.key==="ArrowDown"){event.preventDefault();$("fetchButton").focus()}
      // ArrowLeft/Right and Backspace must still work inside the text composer.
      return;
    }
    const items=[$("pdbInput"),$("fetchButton"),...document.querySelectorAll(".preset"),$("closeSearch")];
    const index=items.indexOf(document.activeElement);
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)){
      event.preventDefault();
      const step=["ArrowUp","ArrowLeft"].includes(event.key)?-1:1;
      items[(index+step+items.length)%items.length].focus({preventScroll:true});
    }else if(event.key==="Enter"){
      event.preventDefault();
      document.activeElement?.click?.();
    }
    return;
  }
  const focused=buttons.indexOf(document.activeElement?.id);
  if(focused>=0){
    event.preventDefault();
    if(event.key==="ArrowLeft")$(buttons[(focused+buttons.length-1)%buttons.length]).focus();
    else if(event.key==="ArrowRight")$(buttons[(focused+1)%buttons.length]).focus();
    else if(event.key==="Enter")document.activeElement.click();
    else if(["ArrowUp","Escape","Backspace"].includes(event.key))$("molecule").focus({preventScroll:true});
    return;
  }
  event.preventDefault();
  if(event.key==="ArrowLeft")manualRotate(-16,"y");
  else if(event.key==="ArrowRight")manualRotate(16,"y");
  else if(event.key==="ArrowUp")zoom(1.2);
  else if(event.key==="ArrowDown")zoom(.83);
  else if(event.key==="Enter"||event.key==="Escape"||event.key==="Backspace")
    $("loadButton").focus({preventScroll:true});
}
function configure(){
  $("loadButton").onclick=openSearch;
  $("closeSearch").onclick=closeSearch;
  $("fetchButton").onclick=()=>void load($("pdbInput").value);
  $("wristButton").onclick=toggleWrist;
  $("zoomOutButton").onclick=()=>zoom(.80);
  $("zoomInButton").onclick=()=>zoom(1.25);
  $("styleButton").onclick=cycleStyle;
  $("recenterButton").onclick=center;
  document.querySelectorAll(".preset").forEach(btn=>
    btn.onclick=()=>void load(btn.dataset.pdb)
  );
  $("pdbInput").addEventListener("input",e=>{
    e.target.value=normalizePdbId(e.target.value).slice(0,12);
  });
  document.addEventListener("keydown",handleKeys);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&state.wrist){
      state.lastReading=0;
      setStatus("● WRIST PAUSED",false);
    }
  });
  window.addEventListener("pagehide",stopWrist);
  if(initializeViewer()){
    $("molecule").focus({preventScroll:true});
    note("Enter a PDB ID or choose a sample structure");
    const last=localStorage.getItem("view-protein:last-id");
    if(last&&validPdbId(last))$("pdbInput").value=last;
  }
}
configure();
