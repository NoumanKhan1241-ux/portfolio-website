document.addEventListener('DOMContentLoaded', async ()=>{
  // Show a loading overlay with percentage + quote, then initialize
  async function runLoader(){
    // returns a promise that resolves after loader fades out
    return new Promise((resolve)=>{
      try{
        // reuse existing loader if it was present in HTML to avoid flicker
        let loader = document.getElementById('site-loader');
        if(!loader){
          loader = document.createElement('div');
          loader.id = 'site-loader';
          loader.setAttribute('role','status');
          loader.setAttribute('aria-live','polite');
          loader.innerHTML = `
            <div class="loader-inner">
              <div class="loader-spinner" aria-hidden="true"></div>
              <div class="loader-percent" aria-hidden="true">0%</div>
              <div class="loader-quote">"I don’t just want to write code. I want to build ideas."</div>
            </div>
          `;
          // insert at start of body so it's always on top
          document.body.insertBefore(loader, document.body.firstChild);
        }

        // ensure page is visually hidden until reveal (hide content wrapper, not body)
        if(!document.body.classList.contains('preload')) document.body.classList.add('preload');

        let pct = 0;
        const duration = 2600; // total duration ms (longer so percent stays visible)
        const start = performance.now();

        function tick(now){
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - t, 3);
          pct = Math.min(100, Math.round(eased * 100));
          const pctEl = loader.querySelector('.loader-percent');
          if(pctEl) pctEl.textContent = pct + '%';
          if(t < 1) requestAnimationFrame(tick);
          else finish();
        }

        function finish(){
          // small delay so percentage is readable
          setTimeout(()=>{
            loader.style.opacity = '0';
            loader.setAttribute('aria-hidden','true');
            // show page
            document.body.classList.remove('preload');
            // remove after fade
            setTimeout(()=>{
              if(loader && loader.parentNode) loader.parentNode.removeChild(loader);
              resolve();
            }, 700);
          }, 600);
        }

        // safety timeout to reveal page if something goes wrong
        const fallback = setTimeout(()=>{
          if(document.body.classList.contains('preload')) document.body.classList.remove('preload');
          if(loader && loader.parentNode) loader.parentNode.removeChild(loader);
          resolve();
        }, 6000);

        requestAnimationFrame(tick);
      }catch(e){
        console.error('runLoader error', e);
        // ensure page is revealed
        document.body.classList.remove('preload');
        const existing = document.getElementById('site-loader'); if(existing) existing.remove();
        resolve();
      }
    });
  }

  // run loader but guard against errors or stalls
  let loaderDone = false;
  try{
    await runLoader();
    loaderDone = true;
  }catch(err){
    console.error('Loader failed:', err);
  }
  // safety: ensure page isn't stuck hidden if loader errors or takes too long
  setTimeout(()=>{
    if(!loaderDone){
      console.warn('Loader fallback triggered — revealing page.');
      document.body.classList.remove('preload');
      const existing = document.getElementById('site-loader');
      if(existing) existing.remove();
    }
  }, 3800);

  // Basic GSAP scroll reveal
  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('section').forEach(sec=>{
      gsap.from(sec,{
        y:30,opacity:0,duration:0.7,stagger:0.05,scrollTrigger:{trigger:sec,start:'top 85%'}
      });
    });
  }

  // Smooth navigation using GSAP ScrollToPlugin (if available)
  function smoothScrollTo(target){
    if(!target) return;
    if(window.gsap && window.gsap.utils && window.gsap.utils.toArray){
      // prefer ScrollToPlugin if registered
      if(gsap.plugins && gsap.plugins.ScrollTo){
        gsap.to(window, {duration:0.9, ease:'power2.out', scrollTo:{y:target, offsetY:80}});
        return;
      }
    }
    // fallback to native smooth
    try{ target.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){ window.scrollTo(0, target.offsetTop); }
  }

  document.querySelectorAll('.nav a').forEach(a=>{
    a.addEventListener('click',e=>{
      const href = a.getAttribute('href');
      if(!href || !href.startsWith('#')) return;
      e.preventDefault();
      const target = document.querySelector(href);
      smoothScrollTo(target);
    });
  });
  // Hero 'View Projects' button: smooth scroll + project entrance animation
  const heroBtn = document.getElementById('hero-projects-btn');
  if(heroBtn){
    heroBtn.addEventListener('click', e=>{
      e.preventDefault();
      const target = document.querySelector('#projects');
      smoothScrollTo(target);
      // small entrance animation for project grid
      const grid = document.querySelector('#projects .grid');
      if(grid && window.gsap){
        gsap.fromTo(grid, {y:20,opacity:0,scale:0.98},{y:0,opacity:1,scale:1,duration:0.8,ease:'power3.out'});
        gsap.utils.toArray('#projects .card').forEach((c,i)=>{
          gsap.fromTo(c,{y:14,opacity:0},{y:0,opacity:1,duration:0.6,delay:0.12 + i*0.06,ease:'power2.out'});
        });
      }
    });
  }
  // Three.js hero scene
  (function setupThreeHero(){
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = document.getElementById('hero-canvas');
    // if the hero canvas is not visible (we're showing centered text only), skip initialization
    if(!container || !window.THREE || reduced) return;
    if(container.offsetParent === null || getComputedStyle(container).display === 'none') return;

    let renderer, scene, camera, mesh, clock;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let mouseX = 0, mouseY = 0;
    function init(){
      scene = new THREE.Scene();
      clock = new THREE.Clock();

      const width = container.clientWidth;
      const height = container.clientHeight;
      camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 0, 3.5);

      renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
      renderer.setPixelRatio(DPR);
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputEncoding = THREE.sRGBEncoding;
      container.appendChild(renderer.domElement);

      // Post-processing: Unreal Bloom (if available)
      let composerAvailable = false;
      try{
        if(window.THREE && THREE.EffectComposer){
          const renderScene = new THREE.RenderPass(scene, camera);
          const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), 0.9, 0.35, 0.85);
          bloomPass.threshold = 0.1;
          bloomPass.strength = 0.9;
          bloomPass.radius = 0.6;
          const composer = new THREE.EffectComposer(renderer);
          composer.setSize(width, height);
          composer.addPass(renderScene);
          composer.addPass(bloomPass);
          // expose composer to animate
          renderer.__composer = composer;
          composerAvailable = true;
        }
      }catch(e){ console.warn('Composer init failed', e); }

      // lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const p = new THREE.PointLight(0xffffff, 1.2);
      p.position.set(5,5,5);
      scene.add(p);

      // create a glowing sprite texture for points (simulates bloom)
      function makeSprite(){
        const size = 128;
        const cvs = document.createElement('canvas');
        cvs.width = cvs.height = size;
        const cx = cvs.getContext('2d');
        const grad = cx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
        grad.addColorStop(0,'rgba(255,255,255,1)');
        grad.addColorStop(0.15,'rgba(255,255,255,0.9)');
        grad.addColorStop(0.35,'rgba(124,92,255,0.6)');
        grad.addColorStop(1,'rgba(0,0,0,0)');
        cx.fillStyle = grad; cx.fillRect(0,0,size,size);
        const tex = new THREE.CanvasTexture(cvs);
        tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
        return tex;
      }

      const sprite = makeSprite();

      const geom = new THREE.IcosahedronGeometry(1, 4);
      // use the vertex positions as point locations
      const pointsGeom = new THREE.BufferGeometry();
      pointsGeom.setAttribute('position', geom.getAttribute('position'));
      pointsGeom.setAttribute('normal', geom.getAttribute('normal'));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime:{value:0},
          uColorA:{value:new THREE.Color(0x7c5cff)},
          uColorB:{value:new THREE.Color(0x00d4ff)},
          uSprite:{value:sprite},
          pixelRatio:{value:Math.min(window.devicePixelRatio||1,2)}
        },
        vertexShader: `
          uniform float uTime; uniform float pixelRatio;
          attribute vec3 normal;
          varying vec3 vColor;
          void main(){
            vec3 pos = position + normal * sin(uTime*2.0 + position.y*3.0) * 0.08;
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            // scale point size with depth
            gl_PointSize = (20.0 + 12.0 * (1.0 - length(position))) * pixelRatio / -mv.z;
            vColor = mix(vec3(0.486,0.361,1.0), vec3(0.0,0.831,1.0), (pos.y+1.0)*0.5);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform sampler2D uSprite;
          varying vec3 vColor;
          void main(){
            vec4 tex = texture2D(uSprite, gl_PointCoord);
            if(tex.a < 0.02) discard;
            gl_FragColor = vec4(vColor * tex.rgb, tex.a);
          }
        `,
        transparent:true,
        depthWrite:false,
        blending:THREE.AdditiveBlending
      });

      mesh = new THREE.Points(pointsGeom, material);
      mesh.scale.set(1.2,1.2,1.2);
      scene.add(mesh);

      window.addEventListener('resize',onResize);
      // slight parallax from mouse movement
      window.addEventListener('mousemove',(ev)=>{
        const rect = container.getBoundingClientRect();
        mouseX = (ev.clientX - rect.left) / rect.width * 2 - 1;
        mouseY = (ev.clientY - rect.top) / rect.height * 2 - 1;
      });
      onResize();
      animate();
    }

    function onResize(){
      const w = container.clientWidth; const h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w,h);
      if(renderer.__composer) renderer.__composer.setSize(w,h);
    }

    function animate(){
      const t = clock.getElapsedTime();
      if(mesh){
        // reactive rotation with mouse influence
        mesh.rotation.y = t * 0.25 + mouseX * 0.6;
        mesh.rotation.x = Math.sin(t * 0.3) * 0.08 + mouseY * 0.35;
        if(mesh.material.uniforms && mesh.material.uniforms.uTime) mesh.material.uniforms.uTime.value = t * 2.0;
      }
      if(renderer.__composer){
        renderer.__composer.render();
      }else{
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    }

    init();
  })();

  // Contact form: simple client-side handler that currently prevents default and shows an alert
  const form = document.getElementById('contact-form');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      // show animated success
      const msg = document.createElement('div');
      msg.className = 'form-success';
      msg.textContent = 'Thanks — your message was sent (demo).';
      document.body.appendChild(msg);
      if(window.gsap){
        gsap.fromTo(msg,{y:40,opacity:0},{y:0,opacity:1,duration:0.5,ease:'power3.out'});
        gsap.to(msg,{y:-40,opacity:0,duration:0.6,delay:2.0,ease:'power2.in',onComplete:()=>msg.remove()});
      }else{
        setTimeout(()=>msg.remove(),2500);
      }
      form.reset();
    });
  }

  // Custom cursor implementation
  (function customCursor(){
    const cursor = document.createElement('div');
    cursor.id = 'cursor';
    document.body.appendChild(cursor);

    let visible = true;
    document.addEventListener('mousemove',e=>{
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      if(!visible){ cursor.classList.remove('cursor--hidden'); visible = true }
    });
    document.addEventListener('mouseleave',()=>{ cursor.classList.add('cursor--hidden'); visible=false });

    // enlarge cursor when hovering interactive elements
    const hoverTargets = 'a, button, .btn, .card';
    document.querySelectorAll(hoverTargets).forEach(el=>{
      el.addEventListener('mouseenter',()=> cursor.classList.add('cursor--hover'));
      el.addEventListener('mouseleave',()=> cursor.classList.remove('cursor--hover'));
    });
  })();

  // Card hover micro-animations using GSAP
  document.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('mouseenter',()=>{
      if(window.gsap) gsap.to(card, {scale:1.03, boxShadow:'0 20px 60px rgba(0,0,0,0.65)', duration:0.28});
    });
    card.addEventListener('mouseleave',()=>{
      if(window.gsap) gsap.to(card, {scale:1, boxShadow:'0 8px 40px rgba(0,0,0,0.6)', duration:0.28});
    });
  });

  // Dynamically load project entries from JSON and render cards
  (async function loadProjects(){
    const grid = document.querySelector('#projects .grid');
    if(!grid) return;

    async function renderList(list){
      grid.innerHTML = '';
      list.forEach(p=>{
        const art = document.createElement('article'); art.className='card';
        art.innerHTML = `
          <img src="${p.image}" alt="${p.title} screenshot" />
          <div class="card-body">
            <h3>${p.title}</h3>
            <p class="muted">${p.short}</p>
            <div class="tags">${(p.tech||[]).map(t=>`<span class="tech-pill">${t}</span>`).join('')}</div>
            <div class="card-actions">
              <a class="btn small" href="${p.live||'#'}" target="_blank">Live</a>
              <a class="btn small ghost" href="${p.repo||'#'}" target="_blank">Code</a>
            </div>
          </div>
        `;
        grid.appendChild(art);
      });
    }

    let projects = null;
    // If served via file://, fetch may be blocked by browser CORS — provide a fallback
    if(location.protocol === 'file:'){
      console.warn('Running from file:// — network fetches may be blocked. Using fallback projects.');
    }

    try{
      const resp = await fetch('assets/projects.json');
      if(resp.ok) projects = await resp.json();
      else console.warn('projects.json fetch returned', resp.status);
    }catch(err){
      console.warn('projects load failed', err);
    }

    if(!projects || !projects.length){
      // fallback sample projects to ensure page renders when opened locally
      projects = [
        { title: 'Sample Project', short: 'Local preview placeholder.', image: 'assets/project-placeholder.svg', tech:['HTML','CSS','JS'], live:'#', repo:'#' }
      ];
    }

    renderList(projects);
  })();

  // Resume download button
  // remove previous download-resume button handler (download now in hero/contact links)
  const oldDl = document.getElementById('download-resume');
  if(oldDl) oldDl.remove();
});
