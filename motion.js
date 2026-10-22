/** Sensor-independent wrist orientation math for the glasses browser. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const identity=()=>[0,0,0,1];
export function normalize(q){
  if(!q||q.length!==4)return null;
  const a=Array.from(q,Number);
  if(!a.every(Number.isFinite))return null;
  const len=Math.hypot(...a);
  return len>.00001?a.map(v=>v/len):null;
}
export function inverse(q){return [-q[0],-q[1],-q[2],q[3]]}
export function multiply(a,b){
  const [x,y,z,w]=a,[X,Y,Z,W]=b;
  return [w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X,
          w*Z+x*Y-y*X+z*W, w*W-x*X-y*Y-z*Z];
}
export function slerp(a,b,t){
  const v=normalize(a), w=normalize(b);
  if(!v||!w)return identity();
  let dot=v.reduce((sum,n,i)=>sum+n*w[i],0);
  const target=dot<0?w.map(n=>-n):w;
  dot=Math.abs(dot);
  const factor=clamp(t,0,1);
  if(dot>.9995)return normalize(v.map((n,i)=>n+(target[i]-n)*factor));
  const theta=Math.acos(clamp(dot,-1,1));
  const sn=Math.sin(theta);
  const a1=Math.sin((1-factor)*theta)/sn;
  const b1=Math.sin(factor*theta)/sn;
  return normalize(v.map((n,i)=>n*a1+target[i]*b1));
}
export function quaternionDistance(a,b){
  const x=normalize(a),y=normalize(b);
  if(!x||!y)return Infinity;
  return 2*Math.acos(clamp(Math.abs(x.reduce((sum,v,i)=>sum+v*y[i],0)),-1,1));
}
export class WristMotion{
  constructor({gain=.85,smoothing=.26,calibrationSamples=6}={}){
    this.gain=gain;
    this.smoothing=smoothing;
    this.calibrationSamples=calibrationSamples;
    this.recenter();
  }
  recenter(){
    this.neutral=null;
    this.samples=[];
    this.smoothed=identity();
    this.target=identity();
    this.lastInput=null;
  }
  read(raw){
    let q=normalize(raw);
    if(!q)return null;
    if(!this.neutral){
      if(this.samples.length){
        const previous=this.samples[this.samples.length-1];
        if(quaternionDistance(q,previous)>.075){this.samples=[q];return null}
        if(q.reduce((dot,v,i)=>dot+v*this.samples[0][i],0)<0)q=q.map(v=>-v);
      }
      this.samples.push(q);
      if(this.samples.length<this.calibrationSamples)return null;
      const sums=identity().map(()=>0);
      this.samples.forEach(v=>v.forEach((value,i)=>sums[i]+=value));
      this.neutral=normalize(sums);
      this.samples=[];
      this.target=identity();
      this.smoothed=identity();
      this.lastInput=q;
      return identity();
    }
    if(this.lastInput && quaternionDistance(q,this.lastInput)>1.65){
      this.lastInput=q;
      return null;
    }
    this.lastInput=q;
    // Rotation relative to the neutral wrist coordinate system.
    const delta=normalize(multiply(inverse(this.neutral),q));
    if(!delta)return null;
    this.target=slerp(identity(),delta,clamp(this.gain,.3,1.5)/1.5);
    return this.target;
  }
  step(){
    if(!this.neutral)return null;
    this.smoothed=slerp(this.smoothed,this.target,clamp(this.smoothing,.04,.75));
    return this.smoothed;
  }
}