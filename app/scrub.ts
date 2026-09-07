export const frameTarget=(x:number,width:number)=>Math.max(0,Math.min(80,x/Math.max(1,width)*80));
export const easeFrame=(current:number,target:number,dt:number)=>current+(target-current)*(1-Math.exp(-dt/70));
