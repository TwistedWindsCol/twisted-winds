/* Twisted Winds · simulacro en vivo
   Pantalla roja, sirena y vibración cuando el panel lanza el simulacro.
   La verdad está en Supabase (función estado_simulacro); el aviso en vivo
   solo le dice a cada celular que revise ya. Si el aviso no llega,
   cada celular revisa solo cada pocos segundos. */
(function () {
  'use strict';

  var CONFIG = {
    url: 'https://mcfhlwlrsssbtpdvnxwf.supabase.co',
    key: 'sb_publishable_Rys0bb1ubCNFpOclb65-8g_gXF1ZeUH',
    canal: 'twisted-winds-simulacro',
    ventana: 40,          // segundos: quien entra tarde igual lo ve si empezó hace menos de esto
    revisarCada: 5000,    // ms entre revisiones de respaldo
    sirenaMax: 60000      // la sirena se apaga sola al minuto; la pantalla roja sigue hasta "Quitar"
  };

  /* ---------- estilos de la alarma ---------- */
  var css = '' +
    '.tw-alarma{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:space-between;' +
    'padding:max(28px,env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) max(22px,env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px));' +
    'background:#c4000f;color:#fff;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Helvetica Neue",Arial,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none}' +
    '.tw-alarma[hidden]{display:none!important}' +
    '.tw-alarma::before{content:"";position:absolute;inset:-20%;background:radial-gradient(closest-side,#ff2d3d 0%,#e0001a 45%,#9e000c 100%);animation:twPulso 1.4s ease-in-out infinite alternate}' +
    '.tw-alarma>*{position:relative}' +
    '.tw-centro{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(22px,5vh,40px);width:100%;max-width:560px}' +
    '.tw-ico{position:relative;width:min(56vw,240px);aspect-ratio:1;display:grid;place-items:center}' +
    '.tw-ico i{position:absolute;inset:6%;border-radius:50%;border:3px solid rgba(255,255,255,.55);animation:twOnda 2.1s ease-out infinite}' +
    '.tw-ico i:nth-child(2){animation-delay:.7s}.tw-ico i:nth-child(3){animation-delay:1.4s}' +
    '.tw-ico svg{width:78%;height:auto;filter:drop-shadow(0 10px 24px rgba(80,0,0,.45));animation:twLatido 1.4s ease-in-out infinite alternate}' +
    '.tw-txt{margin:0;font-size:clamp(30px,8.4vw,52px);line-height:1.08;font-weight:800;letter-spacing:-.03em;text-wrap:balance;max-width:14ch}' +
    '.tw-sacudir{animation:twSacudir .45s ease-in-out 6}' +
    '.tw-quitar{width:min(100%,440px);min-height:58px;border:0;border-radius:980px;background:#fff;color:#b0000d;font:700 19px/1 -apple-system,BlinkMacSystemFont,"Inter",Arial,sans-serif;letter-spacing:-.01em;cursor:pointer;box-shadow:0 10px 30px rgba(70,0,0,.35);-webkit-tap-highlight-color:transparent}' +
    '.tw-quitar:active{transform:scale(.98)}' +
    '.tw-quitar:focus-visible{outline:3px solid #fff;outline-offset:4px}' +
    '@keyframes twPulso{from{opacity:.55}to{opacity:1}}' +
    '@keyframes twOnda{from{transform:scale(.7);opacity:.9}to{transform:scale(1.35);opacity:0}}' +
    '@keyframes twLatido{from{transform:scale(.94)}to{transform:scale(1.04)}}' +
    '@keyframes twSacudir{0%,100%{transform:none}20%{transform:translate(-6px,2px) rotate(-1deg)}40%{transform:translate(5px,-2px) rotate(1deg)}60%{transform:translate(-4px,1px)}80%{transform:translate(3px,-1px)}}' +
    '@media (prefers-reduced-motion:reduce){.tw-alarma::before,.tw-ico i,.tw-ico svg,.tw-sacudir{animation:none}.tw-ico i{display:none}}';

  var ICONO = '<svg viewBox="0 0 120 108" aria-hidden="true">' +
    '<path d="M60 6c3.2 0 6.1 1.7 7.7 4.5l47.6 82.4c3.4 5.9-.9 13.1-7.7 13.1H12.4c-6.8 0-11.1-7.2-7.7-13.1L52.3 10.5C53.9 7.7 56.8 6 60 6z" fill="#fff"/>' +
    '<path d="M60 36v30" stroke="#c4000f" stroke-width="11" stroke-linecap="round"/>' +
    '<circle cx="60" cy="84" r="6.5" fill="#c4000f"/></svg>';

  var raiz = null, boton = null, abierto = false;

  function montar() {
    if (raiz) return;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    raiz = document.createElement('div');
    raiz.className = 'tw-alarma';
    raiz.id = 'twAlarma';
    raiz.hidden = true;
    raiz.setAttribute('role', 'alertdialog');
    raiz.setAttribute('aria-modal', 'true');
    raiz.setAttribute('aria-labelledby', 'twAlarmaT');
    raiz.innerHTML = '<div class="tw-centro"><div class="tw-ico"><i></i><i></i><i></i>' + ICONO + '</div>' +
      '<h2 class="tw-txt" id="twAlarmaT">Esto es un simulacro de Twisted Winds</h2></div>' +
      '<button type="button" class="tw-quitar" id="twQuitar">Quitar</button>';
    document.body.appendChild(raiz);
    boton = raiz.querySelector('#twQuitar');
    boton.addEventListener('click', function () { quitar(true); });
  }

  /* ---------- sirena (se fabrica aquí mismo, sin descargar nada) ---------- */
  var RATE = 22050, DUR = 4; // 4 s = 2 ciclos de subida y bajada; empalma sin cortes
  function muestrasSirena() {
    var n = RATE * DUR, out = new Float32Array(n), fase = 0, dos = Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var t = i / RATE;
      var f = 900 + 420 * Math.sin(dos * t / 2);       // sube y baja entre ~480 y ~1320 Hz
      fase += dos * f / RATE;
      var s = Math.sin(fase) + 0.32 * Math.sin(3 * fase) + 0.14 * Math.sin(5 * fase);
      out[i] = 0.62 * s;
    }
    return out;
  }
  function wav(muestras) {
    var n = muestras.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function txt(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
    txt(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    txt(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, muestras[i])); v.setInt16(44 + i * 2, x * 32767, true); }
    return new Blob([buf], { type: 'audio/wav' });
  }
  function silencio() { return wav(new Float32Array(RATE / 10)); }

  var muestras = null, urlSirena = null, audio = null, ctx = null, fuente = null, apagarSirena = null, vibrando = null, desbloqueado = false;

  function prepararSonido() {
    if (urlSirena) return;
    try {
      muestras = muestrasSirena();
      urlSirena = URL.createObjectURL(wav(muestras));
      audio = new Audio();
      audio.preload = 'auto';
      audio.setAttribute('playsinline', '');
    } catch (e) { /* sin sonido: igual se muestra la pantalla roja */ }
  }

  /* Llamar dentro de un toque del usuario (botón "Entrar" o "Probar"). */
  function desbloquear() {
    prepararSonido();
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (audio && !desbloqueado) {
      try {
        var mudo = URL.createObjectURL(silencio());
        audio.src = mudo;
        var p = audio.play();
        if (p && p.then) p.then(function () { if (audio.src === mudo) audio.pause(); desbloqueado = true; }).catch(function () {});
      } catch (e) {}
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ctx) ctx = new AC();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  function sonar() {
    prepararSonido();
    var ok = false;
    if (audio && urlSirena) {
      try {
        audio.loop = true;
        if (audio.src !== urlSirena) audio.src = urlSirena;
        audio.currentTime = 0;
        var p = audio.play();
        ok = true;
        if (p && p.catch) p.catch(function () { sonarWebAudio(); });
      } catch (e) { ok = false; }
    }
    if (!ok) sonarWebAudio();
    clearTimeout(apagarSirena);
    apagarSirena = setTimeout(callar, CONFIG.sirenaMax);
  }
  function sonarWebAudio() {
    try {
      if (!ctx || !muestras) return;
      if (ctx.state === 'suspended') ctx.resume();
      var b = ctx.createBuffer(1, muestras.length, RATE);
      b.getChannelData(0).set(muestras);
      pararWebAudio();
      fuente = ctx.createBufferSource();
      fuente.buffer = b; fuente.loop = true;
      fuente.connect(ctx.destination); fuente.start();
    } catch (e) {}
  }
  function pararWebAudio() { try { if (fuente) { fuente.stop(); fuente.disconnect(); } } catch (e) {} fuente = null; }
  function callar() {
    clearTimeout(apagarSirena);
    try { if (audio) { audio.pause(); audio.currentTime = 0; } } catch (e) {}
    pararWebAudio();
    clearInterval(vibrando); vibrando = null;
    try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {}
  }
  function vibrar() {
    if (!('vibrate' in navigator)) return;
    var patron = [600, 250, 600, 250, 600];
    try { navigator.vibrate(patron); } catch (e) {}
    clearInterval(vibrando);
    var hasta = Date.now() + CONFIG.sirenaMax;
    vibrando = setInterval(function () {
      if (Date.now() > hasta) { clearInterval(vibrando); vibrando = null; return; }
      try { navigator.vibrate(patron); } catch (e) {}
    }, 2600);
  }

  /* ---------- mostrar / quitar ---------- */
  var antesFoco = null;
  function mostrar() {
    montar();
    if (!abierto) {
      antesFoco = document.activeElement;
      raiz.hidden = false;
      abierto = true;
      document.documentElement.style.overflow = 'hidden';
    }
    var c = raiz.querySelector('.tw-centro');
    c.classList.remove('tw-sacudir'); void c.offsetWidth; c.classList.add('tw-sacudir');
    sonar();
    vibrar();
    try { boton.focus({ preventScroll: true }); } catch (e) {}
  }
  function quitar(porPersona) {
    callar();
    if (!raiz || !abierto) return;
    raiz.hidden = true;
    abierto = false;
    document.documentElement.style.overflow = '';
    if (porPersona && desdeActual) recordarQuitado(desdeActual);
    if (antesFoco && antesFoco.focus) { try { antesFoco.focus({ preventScroll: true }); } catch (e) {} }
  }
  document.addEventListener('keydown', function (e) {
    if (!abierto) return;
    if (e.key === 'Tab') { e.preventDefault(); boton.focus(); }
    if (e.key === 'Escape') quitar(true);
  });

  /* ---------- escuchar al panel ---------- */
  var sb = null, base, desdeActual = null, listo = false, pendiente = false;

  function quitadoAntes(d) { try { return sessionStorage.getItem('tw-quitado') === String(d); } catch (e) { return false; } }
  function recordarQuitado(d) { try { sessionStorage.setItem('tw-quitado', String(d)); } catch (e) {} }

  function cliente() {
    if (sb) return sb;
    if (!window.supabase || !window.supabase.createClient) return null;
    try {
      sb = window.supabase.createClient(CONFIG.url, CONFIG.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (e) { sb = null; }
    return sb;
  }

  function activar(desde) {
    desdeActual = desde;
    if (!listo) { pendiente = true; return; }
    mostrar();
  }

  var revisando = false;
  async function revisar() {
    var c = cliente();
    if (!c || revisando) return;
    revisando = true;
    try {
      var r = await c.rpc('estado_simulacro');
      if (r.error || !r.data) return;
      var desde = r.data.desde || null, hace = r.data.hace;
      if (base === undefined) {                       // primera respuesta: punto de partida
        base = desde;
        if (desde && hace < CONFIG.ventana && !quitadoAntes(desde)) activar(desde);
        return;
      }
      if (desde === base) return;
      base = desde;
      if (desde && hace < CONFIG.ventana) activar(desde);
      else if (!desde) { pendiente = false; desdeActual = null; quitar(false); } // el panel lo detuvo
    } catch (e) {
      /* sin internet: se intenta de nuevo en la próxima vuelta */
    } finally {
      revisando = false;
    }
  }

  function escuchar() {
    var c = cliente();
    if (!c) return;
    try {
      c.channel(CONFIG.canal, { config: { private: false, broadcast: { self: false } } })
        .on('broadcast', { event: 'aviso' }, function () {
          setTimeout(revisar, Math.random() * 700);   // reparte las consultas
        })
        .subscribe();
    } catch (e) {}
    revisar();
    setInterval(function () { if (!document.hidden) revisar(); }, CONFIG.revisarCada);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) revisar(); });
  }

  /* La persona ya tocó "Entrar": desde ahora la alarma puede sonar. */
  function marcarListo() {
    listo = true;
    if (pendiente) { pendiente = false; mostrar(); }
  }

  window.TWSimulacro = {
    config: CONFIG,
    cliente: cliente,
    desbloquear: desbloquear,
    escuchar: escuchar,
    listo: marcarListo,
    mostrar: function () { desdeActual = null; mostrar(); },
    quitar: function () { quitar(false); }
  };
})();
