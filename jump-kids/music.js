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
  ctx = audioCtx;
  if (!ctx) return;
  master = ctx.createGain();
  master.gain.value = 0.05;
  master.connect(ctx.destination);
}

function playNote(note, start, type, pitch){
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = note.freq * pitch;
  g.gain.value = 0.08;
  o.connect(g); g.connect(master);
  o.start(start);
  o.stop(start + note.dur);
}

export function playMusic(level=1){
  if (!ctx || !master) return;
  stopMusic();
  const waves=['sine','square','triangle','sawtooth'];
  const wave = waves[(level-1)%waves.length];
  const pitch = 1 + ((level-1)%4)*0.02;
  let t = ctx.currentTime;
  for (const n of MELODY){
    playNote(n, t, wave, pitch);
    t += n.dur;
  }
  timers.push(setTimeout(()=>playMusic(level), (t-ctx.currentTime)*1000));
}

export function stopMusic(){
  timers.forEach(clearTimeout);
  timers=[];
}
