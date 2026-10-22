/** Pure PDB ID and metadata helpers, also used by the unit tests. */
export function normalizePdbId(value){
  return String(value||"").trim().toUpperCase().replace(/\s+/g,"");
}
export function validPdbId(id){
  const s=normalizePdbId(id);
  return /^[A-Z0-9]{4}$/.test(s)||/^PDB_[0-9A-Z]{8}$/.test(s);
}
export function structureUrls(id){
  const s=normalizePdbId(id);
  if(!validPdbId(s))throw new Error("Use a four-character PDB ID, such as 1UBQ.");
  const base="https://files.rcsb.org/download/"+encodeURIComponent(s);
  return /^PDB_/.test(s) ? [{url:base+".cif",format:"cif"}] :
    [{url:base+".pdb",format:"pdb"},{url:base+".cif",format:"cif"}];
}
export function cleanTitle(text){
  const t=String(text||"").replace(/\s+/g," ").trim();
  return t.length>86?t.slice(0,83)+"…":t;
}
export function metadataFromEntry(data){
  const s=data?.struct||{};
  const e=data?.rcsb_entry_info||{};
  return {
    title:cleanTitle(s.title||"Untitled experimental structure"),
    method:String((data?.exptl||[])[0]?.method||"Structure").slice(0,42),
    resolution:Number.isFinite(Number(e.resolution_combined?.[0]))?
      Number(e.resolution_combined[0]).toFixed(2)+" Å":null,
    chains:Number(e.deposited_polymer_entity_instance_count)||null
  };
}
