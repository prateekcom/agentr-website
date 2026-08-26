gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* phones get the same story with less machinery: native scrolling, a shorter pin,
   no pointer tilt, and no tweens driving elements the layout has hidden */
const PHONE = matchMedia('(max-width:760px)').matches;
/* "watch this happen" only works where something happens. The phone gets the
   four blocks below, not the film, so the cue names them. */
const PHONE_NOTE = 'how it works, in four steps';
if(PHONE){
  const n0 = document.querySelector('.hand-note');
  if(n0 && n0.firstChild) n0.firstChild.nodeValue = PHONE_NOTE + '\n      ';
}
/* .stage-pin now sticks at --nav, so every trigger that fires "when the stage locks"
   has to read the same offset — plain 'top top' fires a nav-height too early. */
const NAV = getComputedStyle(document.documentElement).getPropertyValue('--nav').trim() || '70px';
const PIN_LOCK = 'top ' + NAV;

/* a refresh always starts the story from the top — but never when a hash asked for
   somewhere else. Every sub-page's "Join waitlist" is ../#waitlist, and without this
   guard the three scrollTo(0,0) calls here and in unlock() below threw that away and
   dropped the visitor at the top of the page instead. */
const HASHED = !!location.hash;
if(!HASHED) scrollTo(0,0);
ScrollTrigger.clearScrollMemory();
addEventListener('pageshow', ()=>{ if(!location.hash) scrollTo(0,0); });

/* smooth scroll. Not on phones: it replaces native momentum with a rAF loop and
   the result reads as lag on iOS. */
if(!reduced && !PHONE){
  const lenis = window._lenis = new Lenis({lerp:.09});
  if(!HASHED) lenis.scrollTo(0,{immediate:true});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t=>lenis.raf(t*1000));
  gsap.ticker.lagSmoothing(0);
}

/* progress bar */
gsap.to('#progress',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.3}});

/* nav gains its paper backdrop once you leave the top */
const navEl = document.getElementById('nav');
addEventListener('scroll',()=>navEl.classList.toggle('scrolled',scrollY>24),{passive:true});

/* hero: strewn flat resume thumbnails */
const strewn = document.getElementById('strewn');
const spots = [[6,16,-7],[86,12,6],[12,66,5],[88,62,-5],[26,28,9],[74,34,-8],[7,42,3],[90,38,8]];
const scribbles = ['nope','maybe?','hmm','read twice','ok…','again?','eh','not this one'];
spots.forEach(([x,y,r],i)=>{
  const d = document.createElement('div');
  d.className = 'doc';
  d.style.cssText = `left:${x}%;top:${y}%;transform:rotate(${r}deg)`;
  d.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
  d.innerHTML += `<span class="scrib">${scribbles[i%scribbles.length]}</span>`;
  if(i===3) d.innerHTML += '<span class="streak"></span>';
  strewn.appendChild(d);
  if(!reduced){
    if(!PHONE){
      gsap.to(d,{y:'+=14',duration:2.4+i*.3,yoyo:true,repeat:-1,ease:'sine.inOut'});
      gsap.to(d,{yPercent:-40,ease:'none',scrollTrigger:{trigger:'header',start:'top top',end:'bottom top',scrub:.5}});
    }
  }
});

/* ============ chosen resume: hero doc morphs into the stage resume ============ */
const morphOK = !reduced && matchMedia('(min-width:901px)').matches;
if(morphOK){
  const resumeEl = document.getElementById('resume');
  const processEl = document.getElementById('process');
  const pinEl = document.querySelector('.stage-pin');

  /* ONE element: the stage resume starts transformed up into the hero pile as a
     thumbnail, and scroll animates its transform back to identity. The offset is
     constant in document space, so pre-pin it scrolls naturally with the hero. */

  /* start spot: among the pile, clear of the hero copy and form */
  const H = document.querySelector('header');
  const start = {x:innerWidth*.68, y:H.offsetHeight*.72};

  /* natural (untransformed) document position of the resume at pin-start.
     Measured via the offset chain — offsetLeft/Top ignore transforms, so this
     is correct even when the resume is currently mid-flight. */
  const tgt = {left:0,top:0,width:0};
  function measure(){
    const stage = resumeEl.offsetParent;   /* .stage (position:relative) */
    tgt.left = pinEl.getBoundingClientRect().left + scrollX + stage.offsetLeft + resumeEl.offsetLeft;
    tgt.top = processEl.offsetTop + stage.offsetTop + resumeEl.offsetTop;
    tgt.width = resumeEl.offsetWidth;
    return tgt;
  }

  gsap.timeline({
    scrollTrigger:{trigger:'#process',start:'top 92%',end:PIN_LOCK,scrub:.5,invalidateOnRefresh:true}
  })
  .fromTo(resumeEl,
    {transformOrigin:'0 0', rotation:-5,
     x:()=>start.x - measure().left,
     y:()=>start.y - tgt.top,
     scale:()=>110/tgt.width},              /* thumbnail-sized among the pile */
    {x:0, y:0, scale:1, rotation:0, ease:'power2.inOut', duration:.95})
  /* highlight appears only once the flight begins */
  .to(resumeEl,{borderColor:'rgba(84,56,204,.5)', duration:.15}, 0)
  /* scene 1 dresses itself while the resume is still landing — no dead beat at the pin */
  .fromTo('#bw1',{opacity:0,x:70},{opacity:1,x:0,duration:.32},.58)
  .fromTo('#phase',{opacity:0,y:-10},{opacity:1,y:0,duration:.2},.62)
  .to('#ph1',{opacity:1,duration:.16},.68)
  .fromTo('#pc1',{opacity:0,y:26},{opacity:1,y:0,duration:.3},.64);
}else{
  /* no flight (mobile / reduced motion): dress scene 1 on approach instead */
  gsap.timeline({scrollTrigger:{trigger:'#process',start:'top 85%',end:PIN_LOCK,scrub:.5}})
    .fromTo('#bw1',{opacity:0,x:70},{opacity:1,x:0,duration:.4},.3)
    .fromTo('#phase',{opacity:0,y:-10},{opacity:1,y:0,duration:.25},.4)
    .to('#ph1',{opacity:1,duration:.2},.5)
    .fromTo('#pc1',{opacity:0,y:26},{opacity:1,y:0,duration:.35},.45);
}

/* headline: draw the ∞ stroke, then the word writes itself in */
const ip = document.querySelector('h1 .inf .ip');
/* dashing the stroke out is only safe when something is going to draw it back in,
   and on a phone that tween is skipped */
if(!reduced && !PHONE){
  const ipLen = ip.getTotalLength();
  ip.style.strokeDasharray = ipLen;
  ip.style.strokeDashoffset = ipLen;
}

/* The hero writes itself in when the gate lets go, not on page load. Everything it
   touches starts hidden (.rv is opacity:0, the infinity path is dashed out), so it
   simply waits. playHero is a declaration on purpose: the gate block below is
   further down the file and relies on hoisting. */
/* Hide the nav up front. Everything else playHero touches is already hidden by .rv
   or by its dash offset, but the nav is visible by default and its from-state only
   lands when playHero runs, which is 0.4s into the gate fade. That is long enough to
   flash a solid navbar and then snap it away. */
/* not on a phone: the fade-in it pairs with is skipped there, so hiding it would
   leave the navbar gone for good */
if(!reduced && !PHONE) gsap.set('nav',{opacity:0,y:-18});

let heroPlayed = false;
/* the scroll invitation keeps hopping forever, whether the hero was animated in
   or landed on its finished frame */
function hopNote(){
  gsap.timeline({repeat:PHONE?1:-1,delay:4.8,repeatDelay:.7})
    .to('.hand-note',{y:-12,duration:.35,ease:'power2.out'})
    .to('.hand-note',{y:0,duration:.65,ease:'bounce.out'});
}
function playHero(instant){
  if(heroPlayed) return; heroPlayed = true;
  /* the four-second cinematic open is a desktop pleasure. On a phone it is four
     seconds before the headline is readable, so the hero simply arrives. */
  const SIMPLE = reduced || PHONE;
  /* Seen it inside the gate's recall window: jump to the end frame. Same half
     hour and the same stored key as the gate, so one visit buys one opening and
     a reload five minutes later does not spend four seconds replaying it. Every
     value below is the resting state of the tween it replaces. */
  if(instant){
    gsap.set('header .rv',{opacity:1,y:0});
    if(!SIMPLE){
      gsap.set(ip,{strokeDashoffset:0});
      gsap.set('.infw',{clipPath:'inset(-20% -6% -20% 0)'});
      gsap.set('.infw2',{opacity:1,y:0,scale:1});
      gsap.set('nav',{opacity:1,y:0});
      hopNote();
    }
    return;
  }
  if(!SIMPLE){
    gsap.to(ip,{strokeDashoffset:0,duration:1.15,ease:'power1.inOut',delay:.4});
    gsap.fromTo('.infw',
      {clipPath:'inset(-20% 100% -20% 0)'},
      {clipPath:'inset(-20% -6% -20% 0)',duration:1.05,ease:'power1.inOut',delay:1.45});
    /* the punchline springs up from below with a big elastic bounce */
    gsap.fromTo('.infw2',{opacity:0},{opacity:1,duration:.15,delay:2.4});
    gsap.fromTo('.infw2',{y:110,scale:.8},{y:0,scale:1,duration:2.2,ease:'elastic.out(1.1,.42)',delay:2.4,transformOrigin:'50% 100%'});
  }
  gsap.to('header h1.rv',{opacity:1,y:0,duration:.8,ease:'power3.out',delay:.05});
  gsap.to('header .rv:not(h1)',{opacity:1,y:0,duration:1,ease:'power3.out',stagger:.09,delay:SIMPLE?0:3.4});
  if(!SIMPLE){
    gsap.fromTo('nav',{opacity:0,y:-18},{opacity:1,y:0,duration:.9,ease:'power3.out',delay:3.4});
    hopNote();
  }
}
/* no gate on the page for any reason: play it straight away rather than never */
if(!document.getElementById('gate')) playHero();
if(!PHONE) document.querySelectorAll('.rv').forEach(el=>{
  if(el.closest('header')) return;
  gsap.to(el,{opacity:1,y:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 85%'}});
});

/* ============ the guard section ============
   No entrance reveal: the section is simply there, and the catch below plays on a
   loop. Sliding the whole thing up on scroll competed with the animation that is
   the actual point of it. */
if(!reduced){

  /* ---- the catch, on a loop: helper appears, Guard names it, room locks, it clears.
     The CSS resting state is the caught frame; each pass starts by resetting to clean.
     Pauses offscreen so it isn't burning frames nobody sees. */
  const loop = gsap.timeline({repeat:-1,repeatDelay:1.7,defaults:{ease:'power2.out'},
    scrollTrigger:{trigger:'#guard',start:'top 70%',end:'bottom top',
                   toggleActions:'play pause resume pause'}});
  loop
    /* reset to the quiet room */
    .set('.gm-cheat',{y:26,x:0,opacity:0,scale:1,
      backgroundColor:'#ffffff',borderColor:'rgba(84,56,204,.55)'})
    .set('.gm-cheat > i',{scaleX:0,opacity:1})
    .set('.gm-line',{scaleX:0,transformOrigin:'left center'})
    .set('.gm-target',{opacity:0,scale:1.35})
    .set('.gm-scan',{opacity:0,y:0})
    .set('.gm-find',{x:14,opacity:0})
    .set('.gm-empty',{opacity:1})
    .set('.gm-empty i',{opacity:.25})
    .set('.gm-lock',{opacity:0,scale:1.5,rotation:-11})
    .set('.gm-dim',{scaleY:0,transformOrigin:'50% 0%'})
    .set('.gm-v-sus',{opacity:0,scale:.8})
    .set('.gm-v-clean',{opacity:1})
    .set('.gm-call',{x:0})
    .set('.gm-guard',{borderColor:'rgba(84,56,204,.5)',
      boxShadow:'0 2px 6px rgba(30,21,72,.2),0 34px 74px rgba(30,21,72,.42)'})
    .set('.gm-hb i',{animationDuration:'2.4s',backgroundColor:'#BCACF5'})
    .set('.gm-wave i',{animationPlayState:'running',opacity:1})
    .set('.gm-rec b',{opacity:1})

    /* the interview is alive before anything goes wrong: the agent's question
       types in while the candidate's waveform talks back, and Guard's watch list
       patrols, one dot at a time — the checklist, shown instead of told */
    .to('.gm-line',{scaleX:1,duration:.45,stagger:.3,ease:'power1.inOut'},.3)
    .fromTo('.gm-empty i',{opacity:.25},
      {opacity:1,duration:.22,stagger:.2,yoyo:true,repeat:1,ease:'power1.inOut'},.35)

    /* the helper MATERIALISES: the flicker of a window that exists but refuses
       to be captured — then starts feeding answers, and keeps feeding */
    .to('.gm-cheat',{keyframes:{opacity:[0,.5,.12,.85,.35,1]},duration:.5,ease:'none'},'in')
    .to('.gm-cheat',{y:0,duration:.5,ease:'power2.out'},'in')
    .fromTo('.gm-ctag',{opacity:.2},{opacity:.85,duration:.14,repeat:3,yoyo:true},'in+=.08')
    .to('.gm-cheat > i',{scaleX:1,duration:.3,stagger:.15,ease:'power1.inOut'},'in+=.4')
    .to('.gm-w60',{scaleX:0,duration:.12},'in+=1.2')
    .to('.gm-w60',{scaleX:1,duration:.3,ease:'power1.inOut'},'in+=1.38')
    /* a second patrol pass while the helper types, so the watching never stops */
    .fromTo('.gm-empty i',{opacity:.25},
      {opacity:1,duration:.22,stagger:.2,yoyo:true,repeat:1,ease:'power1.inOut'},'in+=.3')

    /* the heartbeat quickens and pings twice — something is on this machine */
    .add('alert','in+=1.55')
    .set('.gm-hb i',{animationDuration:'.85s'},'alert')
    .fromTo('.gm-ping',{opacity:.9,scale:.5},{opacity:0,scale:4,duration:.5,ease:'power1.out'},'alert')
    .fromTo('.gm-ping',{opacity:.9,scale:.5},{opacity:0,scale:4,duration:.5,ease:'power1.out'},'alert+=.35')
    .to('.gm-guard',{scale:1.02,duration:.12,yoyo:true,repeat:1,ease:'power1.inOut'},'alert+=.05')

    /* the sweep — and the exact moment the beam crosses the helper, it GLINTS.
       ease:none keeps the beam linear so the glint lines up with the crossing. */
    .add('sweep','alert+=.55')
    .fromTo('.gm-scan',{y:-90,opacity:0},{opacity:1,duration:.08,ease:'none'},'sweep')
    .to('.gm-scan',{y:()=>document.querySelector('.gm-stage').offsetHeight,duration:.62,ease:'none'},'sweep')
    .to('.gm-scan',{opacity:0,duration:.1},'sweep+=.54')
    .to('.gm-cheat',{backgroundColor:'rgba(188,172,245,.55)',duration:.1,yoyo:true,repeat:1},'sweep+=.38')
    .to('.gm-cheat',{borderColor:'rgba(58,37,150,.95)',duration:.1,yoyo:true,repeat:1},'sweep+=.38')

    /* caught: brackets snap on, the helper flinches, and the whole instrument
       turns brass — the state is readable from across the room */
    .add('lock','sweep+=.62')
    .to('.gm-target',{opacity:1,scale:1,duration:.26,ease:'back.out(3)'},'lock')
    .to('.gm-cheat',{x:-2,duration:.05,repeat:3,yoyo:true,ease:'none'},'lock')
    .to('.gm-guard',{borderColor:'rgba(168,130,59,.9)',
      boxShadow:'0 2px 6px rgba(30,21,72,.2),0 34px 74px rgba(30,21,72,.42),0 0 30px rgba(168,130,59,.4)',duration:.3},'lock')
    .set('.gm-hb i',{backgroundColor:'#A8823B'},'lock')
    .to('.gm-v-clean',{opacity:0,duration:.12},'lock+=.1')
    .to('.gm-v-sus',{opacity:1,scale:1,duration:.28,ease:'back.out(2.2)'},'<')
    .to('.gm-empty',{opacity:0,duration:.12},'<')
    .fromTo('.gm-find',{x:14,opacity:0},{x:0,opacity:1,duration:.3,ease:'back.out(1.6)'},'<+=.08')

    /* the room shuts: the dim pulls down like a blind, the stamp slams, the
       call shudders, and the audio actually stops */
    .add('shut','lock+=.5')
    .to('.gm-dim',{scaleY:1,duration:.4,ease:'power2.inOut'},'shut')
    .to('.gm-lock',{opacity:1,scale:1,rotation:-5,duration:.32,ease:'back.out(1.8)'},'shut+=.14')
    .to('.gm-call',{x:2.5,duration:.045,repeat:5,yoyo:true,ease:'none'},'shut+=.1')
    .set('.gm-wave i',{animationPlayState:'paused'},'shut+=.2')
    .to('.gm-wave i',{opacity:.3,duration:.22},'shut+=.2')
    .to('.gm-rec b',{opacity:.25,duration:.22},'shut+=.2')
    /* beaten: the feed goes quiet too */
    .to('.gm-cheat > i',{opacity:.25,duration:.3},'shut+=.25')

    /* captured, not faded: the brackets close on it as it collapses */
    .add('quit','shut+=1.6')
    .to('.gm-cheat',{scale:.85,opacity:0,y:26,duration:.34,ease:'power2.in'},'quit')
    .to('.gm-target',{scale:.6,opacity:0,duration:.3,ease:'power2.in'},'quit+=.04')

    /* everything clears; the instrument cools back to violet, the room reopens */
    .add('clear','quit+=.55')
    .to('.gm-find',{opacity:0,x:10,duration:.26},'clear')
    .to('.gm-v-sus',{opacity:0,duration:.14},'clear')
    .to('.gm-v-clean',{opacity:1,duration:.28},'clear+=.1')
    .to('.gm-empty',{opacity:1,duration:.28},'clear+=.1')
    .to('.gm-guard',{borderColor:'rgba(84,56,204,.5)',
      boxShadow:'0 2px 6px rgba(30,21,72,.2),0 34px 74px rgba(30,21,72,.42)',duration:.4},'clear')
    .set('.gm-hb i',{backgroundColor:'#BCACF5',animationDuration:'2.4s'},'clear')
    .to('.gm-dim',{scaleY:0,duration:.5,ease:'power2.inOut'},'clear')
    .to('.gm-lock',{opacity:0,scale:.92,duration:.26},'clear')
    .set('.gm-wave i',{animationPlayState:'running'},'clear+=.2')
    .to('.gm-wave i',{opacity:1,duration:.3},'clear+=.2')
    .to('.gm-rec b',{opacity:1,duration:.3},'clear+=.2')
    .set('.gm-cheat',{scale:1});
}

/* count-up stats. The markup carries the finished values, so this zeroes them
   only once it is actually going to count: no JS or reduced motion means the
   real numbers, not a page claiming it reads 0 applications. */
document.querySelectorAll('.num').forEach(n=>{
  const to = +n.dataset.to, suf = n.dataset.suffix||'';
  if(reduced) return;
  n.textContent = '0'+suf;
  const o = {v:0};
  gsap.to(o,{v:to,duration:1.6,ease:'power2.out',
    onUpdate:()=>n.textContent=Math.round(o.v)+suf,
    scrollTrigger:{trigger:n,start:'top 85%'}});
});
/* ============ the process timeline ============
   One scrubbed timeline over the tall #process section. Sticky CSS does the
   pinning; GSAP only animates. Single writer per property — no glitches. */
/* ink circles: prep stroke-draw + anchor each circle to its claim line */
document.querySelectorAll('.circ path').forEach(p=>{
  const L = p.getTotalLength();
  p.style.strokeDasharray = L;
  p.style.strokeDashoffset = L;
});
function placeCircs(){
  [['circ1','claim1'],['circ2','claim2']].forEach(([c,cl])=>{
    const circ = document.getElementById(c), claim = document.getElementById(cl);
    circ.style.top = (claim.offsetTop - 7)+'px';
    circ.style.height = (claim.offsetHeight + 14)+'px';
    /* hug the claim, not the card: left/right off the card sent the pen stroke
       out past the highlighted line and into the card's own edge */
    circ.style.left  = (claim.offsetLeft - 7)+'px';
    circ.style.width = (claim.offsetWidth + 14)+'px';
    circ.style.right = 'auto';
  });
}
placeCircs();
addEventListener('resize', placeCircs);
addEventListener('load', placeCircs);
/* scrub-safe count-up tween for the big numerals */
const count = (id,to)=>{
  const o = {v:0}, el = document.getElementById(id);
  return gsap.to(o,{v:to,duration:.1,ease:'none',onUpdate:()=>el.textContent = Math.round(o.v)});
};

/* no pinned scene on a phone, so the scrubbed timeline is never wired to scroll.
   paused:true keeps the chain below valid without it ever running. */
const STAGE_ON = !PHONE && !reduced;
const tl = gsap.timeline(STAGE_ON ? {
  defaults:{ease:'power2.out'},
  scrollTrigger:{trigger:'#process',start:PIN_LOCK,end:'bottom bottom',scrub:.5}
} : {defaults:{ease:'power2.out'}, paused:true});
tl
  /* --- scene 1 · READ (0 → .25) — backdrop/copy already dressed by the flight --- */
  .add('screen', 0)
  .to('#sd1',{backgroundColor:'#5438CC',duration:.02},'screen')
  .fromTo('#scan',{top:'-8%',opacity:0},{opacity:1,duration:.02},'screen+=.01')
  .to('#scan',{top:'104%',duration:.15,ease:'none'},'screen+=.01')
  .to('#resume .r-line',{backgroundColor:'#E4DFF5',stagger:.013,duration:.03},'screen+=.02')
  .to('#resume .r-line',{backgroundColor:'#EAE5D8',stagger:.013,duration:.03},'screen+=.07')
  .to('#scan',{opacity:0,duration:.02},'screen+=.16')
  .fromTo('#bignums .bignum',{opacity:0,y:16},{opacity:1,y:0,duration:.05,stagger:.03},'screen+=.05')
  .add(count('n1',92),'screen+=.06')
  .add(count('n2',78),'screen+=.09')
  .add(count('n3',88),'screen+=.12')
  .to('#evidline',{opacity:1,duration:.04},'screen+=.18')

  /* --- scene 2 · CHECK (.25 → .5) --- */
  .add('verify', .25)
  .to('#sd1',{backgroundColor:'#DAD4C6',duration:.02},'verify')
  .to('#sd2',{backgroundColor:'#5438CC',duration:.02},'verify')
  .to('#ph1',{opacity:0,duration:.02},'verify')
  .to('#ph2',{opacity:1,duration:.03},'verify+=.01')
  .to('#bw1',{opacity:0,x:-60,duration:.05},'verify')
  .fromTo('#bw2',{opacity:0,x:70},{opacity:1,x:0,duration:.09},'verify')
  .to('#pc1',{opacity:0,y:-18,duration:.04},'verify')
  .fromTo('#pc2',{opacity:0,y:26},{opacity:1,y:0,duration:.05},'verify+=.02')
  .to('#bignums .bignum, #evidline',{opacity:0,y:-14,duration:.04},'verify')
  .to('#claim1',{backgroundColor:'#E9E4F8',duration:.03},'verify+=.03')
  .to('#circ1',{opacity:1,duration:.01},'verify+=.04')
  .to('#circ1 path',{strokeDashoffset:0,duration:.06},'verify+=.04')
  .fromTo('#claim1 .mark',{scale:0},{scale:1,duration:.04,ease:'back.out(2)'},'verify+=.09')
  .fromTo('#mn1',{opacity:0,x:20},{opacity:1,x:0,duration:.04},'verify+=.09')
  .to('#claim2',{backgroundColor:'#F0E9D8',duration:.03},'verify+=.12')
  .to('#circ2',{opacity:1,duration:.01},'verify+=.13')
  .to('#circ2 path',{strokeDashoffset:0,duration:.06},'verify+=.13')
  .fromTo('#claim2 .mark',{scale:0},{scale:1,duration:.04,ease:'back.out(2)'},'verify+=.17')
  .fromTo('#mn2',{opacity:0,x:20},{opacity:1,x:0,duration:.04},'verify+=.17')
  .fromTo('#mn3',{opacity:0,y:12},{opacity:1,y:0,duration:.04},'verify+=.21')

  /* --- scene 3 · LISTEN (.5 → .75) --- */
  .add('interview', .5)
  .to('#sd2',{backgroundColor:'#DAD4C6',duration:.02},'interview')
  .to('#sd3',{backgroundColor:'#5438CC',duration:.02},'interview')
  .to('#ph2',{opacity:0,duration:.02},'interview')
  .to('#ph3',{opacity:1,duration:.03},'interview+=.01')
  .to('#bw2',{opacity:0,x:-60,duration:.05},'interview')
  .fromTo('#bw3',{opacity:0,x:70},{opacity:1,x:0,duration:.09},'interview')
  .to('#pc2',{opacity:0,y:-18,duration:.04},'interview')
  .fromTo('#pc3',{opacity:0,y:26},{opacity:1,y:0,duration:.05},'interview+=.02')
  .to('#mn1, #mn2, #mn3',{opacity:0,x:16,duration:.04},'interview')
  .to('.circ',{opacity:0,duration:.04},'interview')
  /* the resume is set aside while she talks */
  .to('#resume',{xPercent:-14,scale:.9,rotation:-2,duration:.06,ease:'power2.inOut'},'interview')
  .fromTo('#ivframe',{opacity:0,y:28,scale:.94},{opacity:1,y:0,scale:1,duration:.06},'interview+=.03')
  .to('#ivcap',{opacity:1,duration:.05},'interview+=.09')
  /* her answer echoes the verified claim — it pulses on the resume */
  .to('#claim1',{backgroundColor:'#D8CCF6',duration:.03,yoyo:true,repeat:1},'interview+=.12')
  .to('#claim1 .mark',{scale:1.35,duration:.03,yoyo:true,repeat:1},'interview+=.12')

  /* --- scene 4 · DECIDE (.75 → 1) --- */
  .add('rank', .75)
  .to('#sd3',{backgroundColor:'#DAD4C6',duration:.02},'rank')
  .to('#sd4',{backgroundColor:'#5438CC',duration:.02},'rank')
  .to('#ph3',{opacity:0,duration:.02},'rank')
  .to('#ph4',{opacity:1,duration:.03},'rank+=.01')
  .to('#bw3',{opacity:0,x:-60,duration:.05},'rank')
  .fromTo('#bw4',{opacity:0,x:70},{opacity:1,x:0,duration:.09},'rank')
  .to('#pc3',{opacity:0,y:-18,duration:.04},'rank')
  .fromTo('#pc4',{opacity:0,y:26},{opacity:1,y:0,duration:.05},'rank+=.02')
  .to('#ivframe',{opacity:0,y:18,duration:.04},'rank')
  /* the final score lands with the ranking */
  .fromTo('#rscore',{scale:0},{scale:1,duration:.05,ease:'back.out(2)'},'rank+=.03')
  .to('#resume',{scale:.86,xPercent:-6,rotation:-1,duration:.08,ease:'power2.inOut'},'rank')
  /* the rest of the pile fans out behind her */
  .fromTo('.backsheet',
    {opacity:0, x:-24, y:0, rotation:0, scale:.86, transformOrigin:'0 0'},
    {opacity:1, duration:.06, stagger:.02, ease:'power2.out',
     x:(i)=>[-60,-42,2][i], y:(i)=>[16,-10,8][i], rotation:(i)=>[-5,-2.5,3.5][i]},
    'rank+=.03')
  .fromTo('#board',{opacity:0,x:40},{opacity:1,x:0,duration:.05,immediateRender:false},'rank+=.04')
  .fromTo('#board .bk-h, #board .brow',{opacity:0,x:26},
    {opacity:1,x:0,duration:.05,stagger:.02,immediateRender:false},'rank+=.06');

/* ============ the opening gate ============
   Scroll stays locked behind it until a row is picked. v9 flew a sheet from the
   chosen pile onto the stage, but that only worked because v9 had no hero: the
   stage was on screen at scroll 0. Here #process sits below the fold, so the
   gate lifts and hands you the hero instead of flying to something off screen. */
{
  const gate = document.getElementById('gate');
  /* the head script latched this at load on the same 760px boundary as PHONE.
     Reading the class back rather than re-testing the width is what guarantees
     the gate this script is driving is the gate the stylesheet is showing. */
  const NO_GATE = document.documentElement.classList.contains('no-gate');
  if(gate){
    /* The gate is a one-time question. Ask it, remember the answer for half an
       hour, and let anyone coming back inside that window straight through to the
       hero framed the way they chose. localStorage is wrapped: Safari private mode
       throws on write, and a gate that cannot be dismissed is worse than no gate. */
    const GATE_KEY = 'agentr.gate', GATE_TTL = 30 * 60 * 1000;
    const recall = ()=>{
      try{
        const o = JSON.parse(localStorage.getItem(GATE_KEY) || 'null');
        if(!o || typeof o.t !== 'number' || Date.now() - o.t > GATE_TTL) return null;
        return o;
      }catch(e){ return null; }
    };
    const remember = (v)=>{
      try{ localStorage.setItem(GATE_KEY, JSON.stringify({t:Date.now(), v:v||null})); }catch(e){}
    };
    const lock = ()=>{
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
      if(window._lenis) window._lenis.stop();
    };
    /* the gate held the page at overflow:hidden, so a #hash the browser tried to
       honour on load went nowhere. Re-apply it here instead of forcing the top,
       otherwise ../#waitlist from a sub-page lands on the hero. */
    const unlock = ()=>{
      document.documentElement.style.overflow='';
      document.body.style.overflow='';
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if(window._lenis){ window._lenis.start(); }
      if(target){
        ScrollTrigger.refresh();
        const y = target.getBoundingClientRect().top + scrollY;
        if(window._lenis) window._lenis.scrollTo(y,{immediate:true});
        else scrollTo(0,y);
        return;
      }
      if(window._lenis) window._lenis.scrollTo(0,{immediate:true});
      scrollTo(0,0);
      ScrollTrigger.refresh();
    };
    /* nothing to lock behind on a phone: the gate is hidden by the stylesheet
       and removed outright a few lines down */
    if(!NO_GATE) lock();

    /* the row you pick reframes the hero. Same product, same promises, told from
       the angle of the problem you just said you had. The closing sentence never
       changes: it is the one guarantee that holds whichever door you came in. */
    const HERO = {
      volume:{
        line1:'resumes.', line2:'One perfect hire.',
        sub:'You spend the week on four people, not two hundred. '
           +'<span class="k">Nobody is rejected by a machine.</span>',
        note:'watch two hundred become four'
      },
      fit:{
        line1:'lookalikes.', line2:'One clear choice.',
        sub:'What someone did counts for more than what they listed. '
           +'<span class="k">Every place on the list shows its evidence.</span>',
        note:'watch the lookalikes come apart'
      },
      trust:{
        line1:'claims.', line2:'Only the ones that hold up.',
        sub:'Every big claim is checked against the public record. '
           +'<span class="k">You see the verdict, and where it came from.</span>',
        note:'watch the claims get checked'
      }
    };
    function applyVariant(key){
      const v = HERO[key] || HERO.volume;
      document.querySelector('.infw').textContent  = v.line1;
      document.querySelector('.infw2').textContent = v.line2;
      document.querySelector('.sub').innerHTML = v.sub;
      /* only the text node: the bouncing arrow is an svg sibling and must survive */
      const note = document.querySelector('.hand-note');
      if(note && note.firstChild) note.firstChild.nodeValue = (PHONE ? PHONE_NOTE : v.note) + '\n      ';
    }

    /* ---- phones open straight on the hero ----
       The static hero markup already carries the `volume` copy, so no variant has
       to be applied for the default case; ?p= still reframes it. Taking the gate
       out of the DOM rather than leaving it display:none means the rows below
       have nothing to bind to, the skip button is never found, and the
       hero-only human/machine pill doesn't read a hidden gate as "still
       covering the page". */
    if(NO_GATE){
      const pv = new URLSearchParams(location.search).get('p');
      if(pv && HERO[pv]) applyVariant(pv);
      gate.remove();
      playHero();
    }

    /* the sheet you picked doesn't vanish with the gate: it flies out of that row's
       paper art and lands as one of the resumes strewn across the hero. One object
       the whole way, so the eye carries from the gate into the page. */
    const LANDS_ON = 5;                      /* spots[5] = upper right, [74,34,-8] */
    function flySheet(btn, done){
      const sheet  = btn && btn.querySelector('.viz i:last-of-type');
      const target = strewn.children[LANDS_ON];
      if(!sheet || !target){ done(); return; }

      /* the hero docs bob on an endless yoyo. Park that tween and zero its y, or the
         landing spot drifts up to 14px while the flight is in the air. */
      const bob = gsap.getTweensOf(target).filter(t=>t.repeat && t.repeat()===-1);
      bob.forEach(t=>t.pause());
      gsap.set(target,{y:0});

      const from = sheet.getBoundingClientRect();
      const rot  = spots[LANDS_ON][2];
      /* measure the doc square-on. getBoundingClientRect on a rotated element gives
         the axis-aligned bounding box, which is bigger than the doc and sits up-left
         of it, so landing on that box would drop the sheet off its mark. */
      gsap.set(target,{rotation:0});
      const to = target.getBoundingClientRect();
      gsap.set(target,{rotation:rot});

      /* the flyer IS a hero doc, so nothing has to crossfade at the far end */
      const flyer = target.cloneNode(true);
      flyer.style.cssText = 'position:fixed;left:'+to.left+'px;top:'+to.top+'px;'
        + 'width:'+to.width+'px;height:'+to.height+'px;margin:0;z-index:320;'
        + 'pointer-events:none;opacity:.5';
      document.body.appendChild(flyer);

      gsap.set(flyer,{transformOrigin:'50% 50%',
        x:(from.left + from.width/2) - (to.left + to.width/2),
        y:(from.top  + from.height/2) - (to.top  + to.height/2),
        scale:from.width / to.width, rotation:-14});
      gsap.set(sheet,{opacity:0});            /* the row hands its sheet over */
      gsap.set(target,{opacity:0});           /* the real one waits at the far end */

      gsap.timeline({onComplete:()=>{
          gsap.set(target,{opacity:.5});
          /* rewind before resuming: the tween was paused mid-cycle and its y zeroed,
             so a plain play() snaps y back to wherever the playhead sat. progress(0)
             is y:0, which is exactly where the sheet just landed. */
          bob.forEach(t=>{ t.progress(0); t.play(); });
          flyer.remove();
          done();
        }})
        .to(flyer,{x:0,y:0,scale:1,rotation:rot,duration:.85,ease:'power3.inOut'},0)
        .to(gate,{opacity:0,duration:.5,ease:'power2.inOut'},.16)
        /* start the writing while the sheet is still travelling: the page is already
           showing through the fading gate, so a cold pause here reads as a stall */
        .add(playHero,.42);
    }

    /* pre-opened on a phone: there is no gate left to open, and this is what keeps
       the ?p= handler at the bottom from trying to run one */
    let opened=NO_GATE;
    function openPage(btn){
      if(opened) return; opened=true;
      applyVariant(btn && btn.dataset.v);
      if(btn) btn.classList.add('opening');
      const done = ()=>{
        gate.style.display='none';
        unlock();
      };
      remember(btn && btn.dataset.v);
      /* the hero pile is display:none on a phone, so there is nothing to fly a sheet
         to: take the plain fade instead of animating between two hidden boxes */
      if(reduced || PHONE || !btn){
        if(!reduced){ gsap.timeline({onComplete:done})
          .to(gate,{opacity:0,duration:.5,ease:'power2.inOut'},.12)
          .add(playHero,.3);
          /* a page stuck behind a locked gate has no way out, so the close never
             depends on a tween finishing */
          setTimeout(()=>{ if(gate.style.display !== 'none') done(); }, 1500); }
        else { playHero(); done(); }
        return;
      }
      flySheet(btn, done);
    }
    /* the paper used to lean toward the pointer, three quickTo setters per row.
       The CSS lift says the same thing with none of the machinery. */

    document.querySelectorAll('#gate .grow').forEach(b=>
      b.addEventListener('click',()=>openPage(b)));

    /* the escape hatch: reuses the existing "no card was clicked" branch inside
       openPage (originally built for reduced-motion/phone) — same default
       variant, same fade-out, nothing new to maintain. */
    const gateSkip = document.getElementById('gateSkip');
    if(gateSkip) gateSkip.addEventListener('click', e=>{ e.preventDefault(); openPage(); });

    /* seen it inside the window: no gate, no lock, no fade, straight to the hero
       framed the way they framed it last time. Runs here because `opened` and HERO
       are declared above this point and not before it. */
    const seen = recall();
    if(seen && !NO_GATE){
      opened = true;
      applyVariant(seen.v);
      gate.style.display = 'none';
      unlock();
      /* the opening is on the same half-hour memory as the gate: they saw it, so
         land on the finished hero rather than replaying it */
      playHero(true);
    }

    /* ?p=volume|fit|trust lands straight on the framed hero, gate skipped */
    const preset = new URLSearchParams(location.search).get('p');
    if(preset && HERO[preset]){
      const row = document.querySelector('#gate .grow[data-v="'+preset+'"]');
      openPage(row);
    }

    /* the gate assembles: the question is written, then the choices arrive in order */
    if(!reduced && !NO_GATE){
      gsap.timeline({defaults:{ease:'power3.out'}})
        .from('.g-logo',{opacity:0,y:-12,duration:.6},0)
        .from('.g-title',{opacity:0,y:16,duration:.8},.2)
        .from('.g-what',{opacity:0,y:12,duration:.7},.42)
        .fromTo('.g-lead',{clipPath:'inset(-25% 100% -25% 0)'},
                          {clipPath:'inset(-25% -4% -25% 0)',duration:.9,ease:'power1.inOut'},.72)
        .from('#gate .grow',{opacity:0,x:34,duration:.75,stagger:.11},.5)
        /* clearProps hands the transform back to CSS so the hover scale still works */
        .from('.vizwrap',{opacity:0,scale:.55,duration:.6,ease:'back.out(1.6)',
          stagger:.11,clearProps:'all'},.75);
    }
  }
}


/* ============ nav mega-menu ============ */
document.querySelectorAll('.navdrop').forEach(dd=>{
  const btn = dd.querySelector('.navdrop-t');
  const set = on=>{ dd.classList.toggle('on',on); btn.setAttribute('aria-expanded',on); };
  dd.addEventListener('pointerenter',()=>{ if(matchMedia('(hover:hover)').matches) set(true); });
  dd.addEventListener('pointerleave',()=>{ if(matchMedia('(hover:hover)').matches) set(false); });
  btn.addEventListener('click',()=>set(!dd.classList.contains('on')));
  /* focus-within keeps it open for keyboard users; blur out of the group closes it */
  dd.addEventListener('focusout',e=>{ if(!dd.contains(e.relatedTarget)) set(false); });
  dd.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
  addEventListener('keydown',e=>{ if(e.key==='Escape') set(false); });
});

/* mobile menu: a flat, always-expanded full-screen panel behind a burger,
   under 820px (see .mobile-menu above) — no nested accordions */
{
  const burger = document.querySelector('.nav-burger');
  const menu = document.querySelector('.mobile-menu');
  if(burger && menu){
    const setOpen = on=>{
      menu.classList.toggle('open',on);
      burger.classList.toggle('open',on);
      burger.setAttribute('aria-expanded',on);
      document.documentElement.style.overflow = on ? 'hidden' : '';
    };
    burger.addEventListener('click',()=>setOpen(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
    addEventListener('keydown',e=>{ if(e.key==='Escape') setOpen(false); });
  }
}

/* waitlist submit — posts to getwaitlist.com (public, unauthenticated signup endpoint) */
const WAITLIST_ID = 33004;
document.querySelectorAll('form.waitlist').forEach(f=>f.addEventListener('submit', async e=>{
  e.preventDefault();
  const emailInput = f.querySelector('input[type="email"]');
  const btn = f.querySelector('button[type="submit"]');
  const email = emailInput.value.trim();
  if(!email) return;

  btn.disabled = true;
  const originalLabel = btn.innerHTML;
  btn.innerHTML = 'Joining…';

  try{
    const res = await fetch('https://api.getwaitlist.com/api/v1/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, waitlist_id: WAITLIST_ID, referral_link: document.location.href })
    });
    if(!res.ok) throw new Error('signup failed');
    f.style.display = 'none';
    document.getElementById('ok'+f.id.slice(-1)).style.display = 'block';
    /* fired only on a real accepted signup, not on every form submit attempt —
       the fetch above is what Enhanced Measurement's generic form_submit can't
       see, since it doesn't know whether the request behind it succeeded */
    if(typeof gtag === 'function') gtag('event', 'waitlist_signup', { form_id: f.id });
  }catch(err){
    btn.disabled = false;
    btn.innerHTML = originalLabel;
    emailInput.setCustomValidity("Couldn't reach the waitlist — try again in a moment.");
    emailInput.reportValidity();
    /* clear it on the next tick as well as on input: left set, the browser blocks the
       next submit before this handler ever runs, so pressing the button again did
       nothing until the field was edited. The message has already been shown. */
    setTimeout(()=>emailInput.setCustomValidity(''), 0);
    emailInput.addEventListener('input', ()=>emailInput.setCustomValidity(''), { once: true });
  }
}));

/* hero-only visibility for the human/machine toggle: shown while the hero is in
   view and the gate isn't covering it, hidden everywhere else. Plain scrollY
   math rather than IntersectionObserver — cheap, and this page already tracks
   scroll for the nav's own "scrolled" class the same way. */
{
  const hmtoggle = document.querySelector('.hmtoggle');
  const heroEl = document.getElementById('top');
  const gateEl = document.getElementById('gate');
  if(hmtoggle && heroEl){
    const update = ()=>{
      const gateBlocking = !!(gateEl && gateEl.style.display !== 'none');
      const inHero = scrollY < heroEl.offsetHeight - 80;
      hmtoggle.classList.toggle('show', inHero && !gateBlocking);
    };
    addEventListener('scroll', update, {passive:true});
    addEventListener('resize', update);
    if(gateEl) new MutationObserver(update).observe(gateEl, {attributes:true, attributeFilter:['style']});
    update();
  }
}