export const DAY_MS=86400000;
export function creditUntil(paidAt,previousUntil=null){const start=Math.max(Date.parse(paidAt),previousUntil?Date.parse(previousUntil):0);if(!Number.isFinite(start))throw Error('invalid_date');return new Date(start+31*DAY_MS).toISOString();}
export function accessState(until,now=Date.now(),exempt=false){if(exempt)return 'exempt';if(!until)return 'payment_required';const end=Date.parse(until);return now<end?'active':now<end+5*DAY_MS?'grace':'payment_required';}
export function retryDay(until,now=Date.now()){const d=Math.floor((now-Date.parse(until))/DAY_MS);return d>=1&&d<=5?d:null;}
export async function sha256(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
