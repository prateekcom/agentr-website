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

/* mobile menu: a flat, always-expanded full-screen panel behind a burger
   button (see .mobile-menu in site.css) — no nested accordions to fight */
(function(){
  var burger = document.querySelector('.nav-burger');
  var menu = document.querySelector('.mobile-menu');
  if(!burger || !menu) return;
  function setOpen(on){
    menu.classList.toggle('open',on);
    burger.classList.toggle('open',on);
    burger.setAttribute('aria-expanded',on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
  }
  burger.addEventListener('click',function(){ setOpen(!menu.classList.contains('open')); });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click',function(){ setOpen(false); });
  });
  addEventListener('keydown',function(e){ if(e.key==='Escape') setOpen(false); });
})();

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

/* blog index: the drawing beside the list follows what you are pointing at.
   Every illustration is already in the DOM (see .indexart) so this only toggles
   a class — nothing is fetched mid-hover. Keyboard focus counts as pointing,
   which is the whole reason this listens for focusin as well as mouseover. */
(function(){
  var rows = document.querySelector('.index .rows');
  var panel = document.querySelector('.indexart');
  if(!rows || !panel) return;
  var arts = [].slice.call(panel.querySelectorAll('img'));
  if(arts.length < 2) return;   /* one drawing cannot follow anything */

  var current = null;
  function show(name){
    if(!name || name === current) return;   /* moving within a row must not re-fade */
    current = name;
    for(var i=0;i<arts.length;i++){
      arts[i].classList.toggle('on', arts[i].getAttribute('data-art') === name);
    }
  }
  function fromEvent(e){
    var link = e.target && e.target.closest ? e.target.closest('a[data-art]') : null;
    if(link) show(link.getAttribute('data-art'));
  }
  rows.addEventListener('mouseover', fromEvent);
  rows.addEventListener('focusin', fromEvent);
  /* deliberately no mouseleave reset: snapping back to the first drawing as the
     pointer leaves the list is a flicker nobody asked for. The last one you
     looked at stays. */
})();
