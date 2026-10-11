import assert from 'node:assert/strict';
// Keep all unrelated timers real; explicitly advance only the requested 3-second transition.
export function saveClock(window){
 const original=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);let pending;
 window.setTimeout=(fn,delay,...args)=>{if(delay===3000){assert.equal(pending,undefined);pending=()=>fn(...args);return -3100;}return original(fn,delay,...args);};
 window.clearTimeout=id=>{if(id===-3100)pending=undefined;else clear(id);};
 return {finish(){assert.ok(pending,'Redirect must be scheduled for 3000ms');const fn=pending;pending=undefined;fn();},hasPending(){return !!pending;}};
}
