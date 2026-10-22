import test from "node:test";
import assert from "node:assert/strict";
import {normalizePdbId,validPdbId,structureUrls,metadataFromEntry} from "../pdb.js";
import {WristMotion,normalize,identity,multiply,inverse,quaternionDistance} from "../motion.js";

function yaw(deg) { const a=deg*Math.PI/360;return [0,Math.sin(a),0,Math.cos(a)] }
function approx(actual,expected,eps=.00001) {assert.ok(Math.abs(actual-expected)<eps, "expected "+actual+" approximately "+expected)}
test("PDB normalization accepts four-character and extended IDs safely",()=>{
  assert.equal(normalizePdbId(" 1ubq "),"1UBQ");
  assert.ok(validPdbId("1UBQ"));
  assert.ok(validPdbId("pdb_00001ubq"));
  assert.equal(validPdbId("../../etc/passwd"),false);
  assert.equal(validPdbId(""),false);
});
test("PDB URLs stay inside official download service",()=>{
  const urls=structureUrls("1ubq");
  assert.ok(urls.length>=1);
  for(const {url} of urls){
    const parsed=new URL(url);
    assert.equal(parsed.hostname,"files.rcsb.org");
    assert.match(parsed.pathname,/^\/download\/1UBQ\.(?:pdb|cif)$/);
  }
});
test("RCSB metadata tolerates missing optional entry properties",()=>{
  const empty=metadataFromEntry({});
  assert.equal(typeof empty.title,"string");
  const known=metadataFromEntry({struct:{title:" Test   Protein "},exptl:[{method:"X-RAY DIFFRACTION"}]});
  assert.equal(known.title,"Test Protein");
  assert.equal(known.method,"X-RAY DIFFRACTION");
});
test("quaternions normalize and compose with inverse",()=>{
  const q=yaw(40),neutral=identity();
  assert.deepEqual(normalize([0,0,0,2]),neutral);
  const q0=multiply(q,inverse(q));
  approx(quaternionDistance(q0,neutral),0);
});
test("neutral calibration resists small sign flips in quaternion values",()=>{
  const motion=new WristMotion({calibrationSamples:4,smoothing:1});
  for(let i=0;i<4;i++)motion.read((i%2)?[0,0,0,-1]:identity());
  assert.notEqual(motion.neutral,null);
  const target=motion.read(yaw(32));
  assert.ok(target);
  assert.ok(quaternionDistance(target,identity())>.05);
  motion.recenter();
  assert.equal(motion.neutral,null);
});
