// Fixed 1 ms steps: deterministic educational leaky integrate-and-fire model.
export function createMembraneModel() {
  const state = { time:0, voltage:-70, threshold:-55, spikes:0, refractoryUntil:0, spikeAt:-Infinity };
  const events=[];let remainder=0;
  function stimulus(amount=6, delay=0) {events.push({at:state.time+delay,amount});}
  function advance(milliseconds, onStep) {
    remainder += milliseconds;
    while(remainder>=1) {
      remainder-=1;state.time+=1;
      for(let i=events.length-1;i>=0;i--)if(events[i].at<=state.time) {const event=events.splice(i,1)[0];if(state.time>=state.refractoryUntil) state.voltage+=event.amount;}
      if(state.time<state.refractoryUntil) {
        const age=state.time-state.spikeAt;
        state.voltage=age<8?state.threshold+(30-state.threshold)*age/8:age<30?30-108*(age-8)/22:-78+8*(age-30)/50;
      } else {
        state.voltage+=(-70-state.voltage)/120;
        if(state.voltage>=state.threshold) {state.spikes++;state.spikeAt=state.time;state.refractoryUntil=state.time+80;}
      }
      onStep?.(state);
    }
    return state;
  }
  return {state,stimulus,advance,reset(){Object.assign(state,{time:0,voltage:-70,spikes:0,refractoryUntil:0,spikeAt:-Infinity});events.length=0;remainder=0;}};
}
// The display marker pauses at nodes; passive current and camera remain smooth.
// This is a schematic signal marker, not an ion moving along the whole axon.
const stations=[0,...Array.from({length:9},(_,i)=>.152+i*.088),1];
export function saltatoryProgress(progress) {
 const t=Math.max(0,Math.min(1,progress));
 let i=0;while(i<stations.length-2&&t>=stations[i+1])i++;
 const start=stations[i],end=stations[i+1],u=(t-start)/(end-start);
 if(u<.68)return start;
 const q=(u-.68)/.32,smooth=q*q*(3-2*q);
 return start+(end-start)*smooth;
}
export function conductionParameters(scenario,severity) {
  const normal=120;
  if(scenario==="normal")return{arrival:normal,blocked:false,stop:1};
  if(scenario==="bare")return{arrival:1000,blocked:false,stop:1};
  if(scenario==="ttx")return{arrival:normal,blocked:severity>0,stop:.34};
  if(scenario==="lidocaine")return{arrival:normal*(1+severity*1.5),blocked:severity>=.75,stop:.55};
  return{arrival:normal*(1+severity*4),blocked:severity>=.82,stop:.55};
}
