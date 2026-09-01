// lightweight lightbox init usable on case pages without loading main.js
window.initLightbox = (function(){
  // idempotent init
  return function(){
    if(document.getElementById('lightbox-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lb-inner">
        <button class="lb-close" aria-label="Close">×</button>
        <button class="lb-prev" aria-label="Previous">‹</button>
        <img class="lb-image" src="" alt="" />
        <button class="lb-next" aria-label="Next">›</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const lbImage = overlay.querySelector('.lb-image');
    const closeBtn = overlay.querySelector('.lb-close');
    const prevBtn = overlay.querySelector('.lb-prev');
    const nextBtn = overlay.querySelector('.lb-next');

    let currentGallery = [];
    let currentIndex = 0;

    function open(imgs, idx){
      currentGallery = imgs; currentIndex = idx;
      lbImage.src = currentGallery[currentIndex].src;
      overlay.classList.add('open');
    }
    function close(){ overlay.classList.remove('open'); }
    function prev(){ 
      if(currentGallery.length===0) return;
      currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
      lbImage.src = currentGallery[currentIndex].src;
    }
    function next(){ 
      if(currentGallery.length===0) return;
      currentIndex = (currentIndex + 1) % currentGallery.length;
      lbImage.src = currentGallery[currentIndex].src;
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });

    // attach handlers
    document.querySelectorAll('.gallery, .grid').forEach(g=>{
      const imgs = Array.from(g.querySelectorAll('img'));
      imgs.forEach((img,i)=>{ img.style.cursor='zoom-in'; img.addEventListener('click', ()=> open(imgs,i)); });
    });

    // keyboard
    document.addEventListener('keydown', e=>{
      if(!overlay.classList.contains('open')) return;
      if(e.key === 'Escape') close();
      if(e.key === 'ArrowLeft') prev();
      if(e.key === 'ArrowRight') next();
    });
  }
})();
