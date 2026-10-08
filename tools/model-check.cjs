const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
(async()=>{
 const {createMembraneModel,conductionParameters,saltatoryProgress}=await import(pathToFileURL(require('path').join(__dirname,'../dist/physiology-model.js')));
 let model=createMembraneModel();model.stimulus(6);model.advance(500);assert.equal(model.state.spikes,0);
 model.reset();model.stimulus(18);let peak=-Infinity,minimum=Infinity;model.advance(100,s=>{peak=Math.max(peak,s.voltage);minimum=Math.min(minimum,s.voltage)});assert.equal(model.state.spikes,1);assert(peak>20);assert(minimum<-75);
 model.reset();model.stimulus(-8);model.advance(2);assert(model.state.voltage<-70);
 model.reset();for(let i=0;i<6;i++)model.stimulus(6,i*20);model.advance(500);assert(model.state.spikes>0);
 model.reset();for(let i=0;i<6;i++)model.stimulus(6,i*500);model.advance(3000);assert.equal(model.state.spikes,0);
 model.reset();model.stimulus(18);model.stimulus(18,20);model.advance(79);assert.equal(model.state.spikes,1);
 assert(conductionParameters('demyelination',.5).arrival>120);assert(conductionParameters('demyelination',1).blocked);assert(conductionParameters('lidocaine',1).blocked);assert(conductionParameters('ttx',.1).blocked);
 let previous=0;for(let i=0;i<=1000;i++){const t=saltatoryProgress(i/1000);assert(t>=previous-1e-9);assert(t<=1);previous=t;}assert.equal(saltatoryProgress(.18),.152);assert(saltatoryProgress(.232)>.152);assert.equal(saltatoryProgress(1),1);
 console.log('PASS: EPSP, IPSP, sumowanie przestrzenne i czasowe, AP, refrakcja oraz blokada przewodzenia');
})().catch(e=>{console.error(e);process.exit(1)});
