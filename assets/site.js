/* shared behaviour for every page except the landing, which has its own bundle */
document.querySelectorAll('.navdrop').forEach(function(dd){
  var btn = dd.querySelector('.navdrop-t');
  function set(on){ dd.classList.toggle('on',on); btn.setAttribute('aria-expanded',on); }
  dd.addEventListener('pointerenter',function(){ if(matchMedia('(hover:hover)').matches) set(true); });
  dd.addEventListener('pointerleave',function(){ if(matchMedia('(hover:hover)').matches) set(false); });
  btn.addEventListener('click',function(){ set(!dd.classList.contains('on')); });
  dd.addEventListener('focusout',function(e){ if(!dd.contains(e.relatedTarget)) set(false); });
  dd.querySelectorAll('a').forEach(function(a){ a.addEventListener('click',function(){ set(false); }); });
  addEventListener('keydown',function(e){ if(e.key==='Escape') set(false); });
});

/* legal pages: the contents follows where you are in the document */
(function(){
  var toc = document.querySelector('.doc-split .toc');
  if(!toc) return;
  var links = [].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var pairs = [];
  links.forEach(function(a){
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if(el) pairs.push({a:a, el:el});
  });
  if(!pairs.length) return;
  var queued = false;
  function spy(){
    queued = false;
    var y = window.scrollY + 140, cur = pairs[0];
    pairs.forEach(function(p){
      if(p.el.getBoundingClientRect().top + window.scrollY <= y) cur = p;
    });
    pairs.forEach(function(p){ p.a.classList.toggle('on', p === cur); });
  }
  addEventListener('scroll', function(){
    if(!queued){ queued = true; requestAnimationFrame(spy); }
  }, {passive:true});
  addEventListener('resize', spy);
  spy();
})();

/* the landing scrolls with Lenis, so the rest of the site should feel the same.
   Loaded here rather than in every page's head: one file to change, and it stays
   out of the critical path.
   Desktop only. On a touch screen Lenis replaces native momentum with a rAF loop
   and the result reads as lag, which is why the landing drops it there too. */
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if(matchMedia('(max-width:760px)').matches) return;

  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js';
  s.onload = function(){
    if(typeof Lenis !== 'function') return;
    var lenis = window._lenis = new Lenis({lerp:.09});
    /* CSS smooth scrolling and Lenis both animate an anchor jump, and the two
       fight. Lenis owns it from here. */
    document.documentElement.style.scrollBehavior = 'auto';
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })();

    /* Lenis drives the scroll itself and does not always emit a native scroll
       event, which silently froze the contents sidebar on the legal pages. Re-emit
       one so every existing listener keeps working. */
    lenis.on('scroll', function(){ window.dispatchEvent(new Event('scroll')); });

    /* in-page anchors: the contents sidebar on the legal pages is all of these.
       scroll-padding-top is a CSS feature Lenis does not read, so the nav offset
       is applied here instead. */
    var NAV = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--nav'), 10) || 70;
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if(!a) return;
      var id = a.getAttribute('href').slice(1);
      if(!id) return;
      var el = document.getElementById(id);
      if(!el) return;
      e.preventDefault();
      lenis.scrollTo(el, {offset: -(NAV + 20)});
      history.replaceState(null, '', '#' + id);
    });
  };
  document.head.appendChild(s);
})();

/* practice page: the result card writes itself in on load, once. The resting
   state in CSS is the finished frame, so a page with no JS, or with reduced
   motion, still shows everything. */
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var card = document.querySelector('.rescard');
  if(card){
    var score = card.querySelector('.rc-score b');
    var to = score ? parseInt(score.textContent, 10) : NaN;
    requestAnimationFrame(function(){
      card.classList.add('play');
      if(!isNaN(to)){
        score.textContent = '0';
        var t0 = 0;
        (function step(ts){
          if(!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 900);
          score.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if(k < 1) requestAnimationFrame(step);
        })(performance.now());
      }
      /* hand the transform back to CSS once it has played, or the animation's
         fill state locks the hover out */
      setTimeout(function(){ card.classList.remove('play'); }, 1500);
    });
  }
})();
