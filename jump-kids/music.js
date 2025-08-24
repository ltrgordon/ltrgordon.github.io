let ctx=null;
let master=null;
let timers=[];

const MELODY=[
  {freq:261.63, dur:0.4},
  {freq:293.66, dur:0.4},
  {freq:329.63, dur:0.4},
  {freq:392.0,  dur:0.4}
];

export function initMusic(audioCtx){
  ctx = audioCtx || null;
  if (!ctx) { master = null; return; }
  try{
    master = ctx.createGain();
    master.gain.value = 0.05;
    master.connect(ctx.destination);
  }catch{
    master = null;
  }
}

function playNote(note, start, type, pitch){
  if (!ctx || !master) return;
  try{
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = note.freq * pitch;
    g.gain.value = 0.08;
    o.connect(g); g.connect(master);
    o.start(start);
    o.stop(start + note.dur);
  }catch{}
}

export function playMusic(level=1){
  if (!ctx || !master) return;
  stopMusic();
  const waves=['sine','square','triangle','sawtooth'];
  const wave = waves[(level-1)%waves.length];
  const pitch = 1 + ((level-1)%4)*0.02;
  let t = ctx.currentTime || 0;
  for (const n of MELODY){
    playNote(n, t, wave, pitch);
    t += n.dur;
  }
  try{ timers.push(setTimeout(()=>playMusic(level), Math.max(0, (t-(ctx.currentTime||0))*1000))); }catch{}
}

export function stopMusic(){
  timers.forEach(id=>{ try{ clearTimeout(id); }catch{} });
  timers=[];
}
