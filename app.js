(function () {
  var BASE = 'https://strumentigratisitalia.github.io/whatsapp-wrapped/';
  function track(ev) { try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: ev, title: ev, event: true }); } catch (e) {} }
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n(x) { return Math.round(x).toLocaleString('it-IT'); }
  function dataIt(d) { return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  var MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function meseLungo(k) { return MESI_LUNGHI[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); }
  function ora(h) { return String(h).padStart(2, '0') + ':00'; }

  var stato = { stats: null, anonimo: false, nomi: {}, nomeChat: '' };
  var zona = $('#zona'), input = $('#file'), errore = $('#errore'), statoEl = $('#stato'), ris = $('#risultati'), toast = $('#toast');

  function mostraErrore(msg) { errore.textContent = msg; errore.classList.add('on'); statoEl.textContent = ''; }
  function avviso(msg) { toast.textContent = msg; toast.classList.add('on'); clearTimeout(avviso.t); avviso.t = setTimeout(function () { toast.classList.remove('on'); }, 2600); }

  // Caricamento file
  ['dragenter', 'dragover'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('sopra'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('sopra'); }); });
  zona.addEventListener('drop', function (e) { var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) elabora(f); });
  input.addEventListener('change', function () { if (input.files[0]) elabora(input.files[0]); input.value = ''; });
  $('#demo').addEventListener('click', function () {
    track('demo');
    stato.nomeChat = 'Chat di esempio';
    elaboraTesto(window.WW_DEMO());
  });

  function elabora(file) {
    errore.classList.remove('on');
    statoEl.textContent = 'Leggo il file…';
    stato.nomeChat = (file.name || '').replace(/^Chat WhatsApp con /i, '').replace(/^WhatsApp Chat with /i, '').replace(/\.(txt|zip)$/i, '');
    track('file');
    WW_PARSE.leggiFile(file).then(elaboraTesto).catch(function (e) { mostraErrore(e && e.message ? e.message : 'Non riesco a leggere questo file. Serve il .txt o lo .zip esportato da WhatsApp.'); });
  }

  function elaboraTesto(testo) {
    var parsed;
    try { parsed = WW_PARSE.parse(testo); } catch (e) { parsed = null; }
    if (!parsed || parsed.messaggi.length < 20) {
      mostraErrore('In questo file non trovo messaggi di una chat WhatsApp. Controlla di aver esportato la chat (vedi la guida qui sotto) e di caricare il file .txt o lo .zip, non una foto.');
      return;
    }
    statoEl.textContent = '';
    stato.stats = WW_STATS.calcola(parsed);
    stato.nomi = {};
    stato.stats.autori.forEach(function (a, i) { stato.nomi[a.nome] = 'Persona ' + (i + 1); });
    render();
    ris.classList.add('on');
    ris.scrollIntoView({ behavior: 'smooth', block: 'start' });
    track('risultati');
  }

  function nome(a) { return stato.anonimo ? stato.nomi[a] || a : a; }

  // Grafico a barre: una sola serie, una tinta, la barra più alta evidenziata, tooltip al passaggio, tabella sotto
  function barre(valori, etichette, tipLabel, classeAssi) {
    var max = Math.max.apply(null, valori) || 1;
    var wrap = el('div');
    var g = el('div', 'grafico'); g.setAttribute('role', 'img');
    var iMax = valori.indexOf(max);
    valori.forEach(function (v, i) {
      var b = el('div', 'b' + (i === iMax ? ' top' : ''));
      b.style.height = Math.max(2, v / max * 100) + '%';
      b.appendChild(el('span', 'tip', esc(tipLabel(i)) + ': ' + n(v)));
      g.appendChild(b);
    });
    var assi = el('div', 'assi ' + (classeAssi || ''));
    etichette.forEach(function (t) { assi.appendChild(el('span', '', esc(t))); });
    var det = el('details', 'tabella-dati');
    var rows = valori.map(function (v, i) { return '<tr><td>' + esc(tipLabel(i)) + '</td><td>' + n(v) + '</td></tr>'; }).join('');
    det.innerHTML = '<summary>Vedi i numeri in tabella</summary><table><tr><th>Quando</th><th>Messaggi</th></tr>' + rows + '</table>';
    wrap.appendChild(g); wrap.appendChild(assi); wrap.appendChild(det);
    g.setAttribute('aria-label', 'Grafico a barre: ' + valori.length + ' valori, massimo ' + n(max) + ' (' + tipLabel(iMax) + ')');
    return wrap;
  }

  function slide(colore, inner) { var s = el('section', 'slide ' + colore); var c = el('div', 'stretto'); inner(c); s.appendChild(c); return s; }

  function render() {
    var s = stato.stats, cont = $('#slides');
    cont.innerHTML = '';
    $('#nomeChat').textContent = stato.nomeChat || 'La tua chat';

    // 1. Riepilogo
    cont.appendChild(slide('notte', function (c) {
      c.appendChild(el('p', 'intro', 'Dal ' + dataIt(s.primo) + ' al ' + dataIt(s.ultimo)));
      c.appendChild(el('span', 'numerone', n(s.totale)));
      c.appendChild(el('p', 'dida', 'messaggi in ' + n(s.span) + ' giorni, scritti da ' + s.autori.length + ' persone. Avete parlato in ' + n(s.giorniAttivi) + ' giorni diversi, in media ' + s.mediaAlGiorno.toFixed(1).replace('.', ',') + ' messaggi al giorno.'));
      var g = el('div', 'griglia-dati');
      g.innerHTML = '<div class="dato"><b>' + n(s.media) + '</b><span>foto, video, sticker e GIF</span></div>' +
        '<div class="dato"><b>' + n(s.vocali) + '</b><span>messaggi vocali</span></div>' +
        (s.record ? '<div class="dato"><b>' + n(s.record.n) + '</b><span>messaggi nel giorno record, il ' + esc(dataIt(new Date(s.record.data + 'T12:00:00'))) + '</span></div>' : '');
      c.appendChild(g);
    }));

    // 2. Classifica
    cont.appendChild(slide('lime', function (c) {
      c.appendChild(el('h2', '', 'Chi parla di più'));
      c.appendChild(el('p', 'intro', 'Messaggi scritti da ciascuno, con la fetta sul totale.'));
      var ul = el('ul', 'classifica');
      var max = s.autori[0].msgs || 1;
      s.autori.slice(0, 12).forEach(function (a) {
        var li = el('li');
        li.innerHTML = '<span class="chi">' + esc(nome(a.nome)) + '</span><span class="quanto">' + n(a.msgs) + ' messaggi, ' + Math.round(a.quota * 100) + '%</span><span class="barra-h"><i style="width:' + (a.msgs / max * 100) + '%"></i></span>';
        ul.appendChild(li);
      });
      c.appendChild(ul);
      if (s.autori.length > 12) c.appendChild(el('p', 'intro', 'E altre ' + (s.autori.length - 12) + ' persone.'));
    }));

    // 3. Orari e giorni
    cont.appendChild(slide('panna', function (c) {
      c.appendChild(el('h2', '', 'L\'ora di punta: ' + ora(s.oraTop)));
      c.appendChild(el('p', 'intro', 'Messaggi per ora del giorno. Il giorno della settimana in cui scrivete di più è ' + s.giornoTop + '.'));
      c.appendChild(barre(s.perOra, s.perOra.map(function (_, i) { return i % 3 === 0 ? String(i) : ''; }), function (i) { return 'ore ' + ora(i); }));
      var g7 = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return s.perGiorno[d]; });
      var lab7 = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
      c.appendChild(el('h3', '', 'Giorno per giorno'));
      c.appendChild(barre(g7, lab7, function (i) { return lab7[i]; }, 'sette'));
    }));

    // 4. Mesi
    if (s.mesi.length > 1) cont.appendChild(slide('cielo', function (c) {
      var top = s.mesi.slice().sort(function (a, b) { return b.n - a.n; })[0];
      c.appendChild(el('h2', '', 'Il mese più caldo: ' + meseLungo(top.k)));
      c.appendChild(el('p', 'intro', n(top.n) + ' messaggi in un mese solo.'));
      var mesi = s.mesi.slice(-24);
      c.appendChild(barre(mesi.map(function (m) { return m.n; }), mesi.map(function (m, i) { return mesi.length > 12 && i % 2 ? '' : m.label; }), function (i) { return mesi[i].label; }));
    }));

    // 5. Emoji e parole
    cont.appendChild(slide('lampone', function (c) {
      c.appendChild(el('h2', '', s.topEmoji.length ? 'Le vostre emoji' : 'Le vostre parole'));
      if (s.topEmoji.length) {
        var eg = el('div', 'emoji-grandi');
        s.topEmoji.slice(0, 6).forEach(function (e) { eg.appendChild(el('div', 'e', '<span class="s">' + esc(e[0]) + '</span><small>' + n(e[1]) + ' volte</small>')); });
        c.appendChild(eg);
      }
      if (s.topParole.length) {
        c.appendChild(el('p', 'intro', 'Le parole che tornano più spesso (senza quelle comuni come "che", "non", "ok").'));
        var ch = el('div', 'chips');
        s.topParole.forEach(function (p) { ch.appendChild(el('span', '', esc(p[0]) + '<b>' + n(p[1]) + '</b>')); });
        c.appendChild(ch);
      }
    }));

    // 6. Premi
    if (s.premi.length) cont.appendChild(slide('notte', function (c) {
      c.appendChild(el('h2', '', 'I premi del gruppo'));
      c.appendChild(el('p', 'intro', 'Ogni premio ha un\'immagine da scaricare e mandare in chat.'));
      var g = el('div', 'premi');
      s.premi.forEach(function (p, i) {
        var card = el('article', 'premio');
        card.innerHTML = '<h3>' + esc(p.titolo) + '</h3><div class="vincitore">' + esc(nome(p.nome)) + '</div><p class="valore">' + esc(p.valore) + '</p><p class="perche">' + esc(p.descr) + '</p>';
        var b = el('button', 'btn piccolo', 'Scarica l\'immagine');
        b.addEventListener('click', function () { scaricaCard(cardPremio(p, i)); track('card-premio'); });
        card.appendChild(b);
        g.appendChild(card);
      });
      c.appendChild(g);
    }));

    // 7. Persona per persona
    cont.appendChild(slide('panna', function (c) {
      c.appendChild(el('h2', '', 'Persona per persona'));
      var box = el('div', 'persone');
      s.autori.forEach(function (a) {
        var d = el('details');
        var risp = a.rispostaMediana === null ? 'non abbastanza dati' : a.rispostaMediana < 1 ? 'meno di un minuto' : a.rispostaMediana < 60 ? Math.round(a.rispostaMediana) + ' min' : (a.rispostaMediana / 60).toFixed(1).replace('.', ',') + ' ore';
        d.innerHTML = '<summary>' + esc(nome(a.nome)) + ' <span style="font-weight:400;opacity:.75">' + n(a.msgs) + ' messaggi</span></summary>' +
          '<dl><div><dt>Parole a messaggio</dt><dd>' + a.mediaParole.toFixed(1).replace('.', ',') + '</dd></div>' +
          '<div><dt>Parole scritte</dt><dd>' + n(a.parole) + '</dd></div>' +
          '<div><dt>Vocali</dt><dd>' + n(a.vocali) + '</dd></div>' +
          '<div><dt>Foto e video</dt><dd>' + n(a.foto + a.video) + '</dd></div>' +
          '<div><dt>Sticker e GIF</dt><dd>' + n(a.sticker + a.gif) + '</dd></div>' +
          '<div><dt>Emoji preferite</dt><dd>' + (a.topEmoji.length ? a.topEmoji.map(function (e) { return esc(e[0]); }).join(' ') : '–') + '</dd></div>' +
          '<div><dt>Ora preferita</dt><dd>' + ora(a.oraPreferita) + '</dd></div>' +
          '<div><dt>Tempo di risposta</dt><dd>' + risp + '</dd></div>' +
          '<div><dt>Conversazioni iniziate</dt><dd>' + n(a.iniziati) + '</dd></div>' +
          '<div><dt>Giorni attivi</dt><dd>' + n(a.nGiorniAttivi) + '</dd></div>' +
          '<div><dt>Messaggi di notte</dt><dd>' + n(a.notte) + '</dd></div>' +
          '<div><dt>Parole tipiche</dt><dd>' + (a.topParole.length ? a.topParole.map(function (p) { return esc(p[0]); }).join(', ') : '–') + '</dd></div></dl>';
        box.appendChild(d);
      });
      c.appendChild(box);
    }));

    // 8. Condividi
    cont.appendChild(slide('viola', function (c) {
      c.appendChild(el('h2', '', 'Mandalo al gruppo'));
      c.appendChild(el('p', 'intro', 'Scarica il riepilogo come immagine e mettilo in chat. Nessun dato è uscito dal tuo telefono: chi vuole la sua versione carica la chat da sé.'));
      var az = el('div', 'azioni');
      var b1 = el('button', 'btn chiaro', 'Scarica il riepilogo');
      b1.addEventListener('click', function () { scaricaCard(cardRiepilogo()); track('card-riepilogo'); });
      var b2 = el('button', 'btn chiaro', 'Copia il link del sito');
      b2.addEventListener('click', function () { copia(BASE); track('copia-link'); });
      var b3 = el('button', 'btn chiaro', 'Analizza un\'altra chat');
      b3.addEventListener('click', function () { ris.classList.remove('on'); stato.stats = null; window.scrollTo({ top: 0, behavior: 'smooth' }); });
      az.appendChild(b1); az.appendChild(b2); az.appendChild(b3);
      c.appendChild(az);
    }));
  }

  $('#anonimo').addEventListener('change', function (e) { stato.anonimo = e.target.checked; if (stato.stats) render(); track('anonimo'); });

  function copia(t) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { avviso('Link copiato'); }, function () { avviso('Non riesco a copiare: ' + t); });
    else avviso(t);
  }

  // Card da condividere: 1080x1350 (formato storia/feed)
  function fitText(ctx, text, maxW, size, peso, fam) {
    while (size > 24) { ctx.font = peso + ' ' + size + 'px ' + fam; if (ctx.measureText(text).width <= maxW) break; size -= 4; }
    return size;
  }
  function righe(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  var SYNE = 'Syne, "Arial Black", sans-serif', SANS = '"Instrument Sans", Arial, sans-serif';
  function baseCard(bg, fg) {
    var cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.roundRect(80, 80, 52, 52, [26, 26, 26, 6]); ctx.fill();
    ctx.font = '800 40px ' + SYNE; ctx.textBaseline = 'middle'; ctx.fillText('WhatsApp Wrapped', 152, 106);
    ctx.font = '500 30px ' + SANS; ctx.textBaseline = 'alphabetic';
    ctx.fillText('strumentigratisitalia.github.io/whatsapp-wrapped', 80, 1290);
    return { cv: cv, ctx: ctx };
  }
  function scrivi(ctx, text, x, y, size, peso, fam, maxW, passo) {
    ctx.font = peso + ' ' + size + 'px ' + fam;
    righe(ctx, text, maxW).forEach(function (l) { ctx.fillText(l, x, y); y += size * (passo || 1.15); });
    return y;
  }
  function cardPremio(p, i) {
    var pal = [['#d9ff57', '#1b1038'], ['#8fd9ff', '#1b1038'], ['#ff4d7d', '#1b1038'], ['#1b1038', '#fff7ea']][i % 4];
    var c = baseCard(pal[0], pal[1]), ctx = c.ctx;
    ctx.font = '500 40px ' + SANS; ctx.fillText('Premio', 80, 320);
    var size = fitText(ctx, p.titolo, 920, 120, '800', SYNE);
    var y = scrivi(ctx, p.titolo, 80, 330 + size, size, '800', SYNE, 920, 1.05);
    y += 50; ctx.font = '500 44px ' + SANS; ctx.fillText('va a', 80, y);
    var sn = fitText(ctx, nome(p.nome), 920, 150, '800', SYNE);
    y += 30 + sn; ctx.fillText(nome(p.nome), 80, y);
    y += 90; y = scrivi(ctx, p.valore, 80, y, 44, '500', SANS, 920, 1.3);
    y += 10; ctx.globalAlpha = .75; scrivi(ctx, p.descr, 80, y, 34, '400', SANS, 920, 1.3); ctx.globalAlpha = 1;
    return c.cv;
  }
  function cardRiepilogo() {
    var s = stato.stats, c = baseCard('#1b1038', '#fff7ea'), ctx = c.ctx;
    ctx.font = '500 40px ' + SANS;
    ctx.fillText(righe(ctx, stato.nomeChat || 'La nostra chat', 920)[0], 80, 300);
    ctx.fillStyle = '#d9ff57';
    var sz = fitText(ctx, n(s.totale), 920, 230, '800', SYNE); ctx.fillText(n(s.totale), 72, 320 + sz);
    ctx.fillStyle = '#fff7ea';
    var sub = 'messaggi in ' + n(s.span) + ' giorni';
    var ss = fitText(ctx, sub, 920, 64, '800', SYNE); ctx.fillText(sub, 80, 400 + sz);
    var y = 470 + sz;
    var righeTxt = [
      s.autori.length + ' persone, ' + n(s.giorniAttivi) + ' giorni di chiacchiere',
      'Ora di punta: ' + ora(s.oraTop) + ', giorno preferito: ' + s.giornoTop,
      n(s.media) + ' tra foto, video e sticker, ' + n(s.vocali) + ' vocali',
    ];
    if (s.topEmoji[0]) righeTxt.push('Emoji preferita: ' + s.topEmoji[0][0] + ', ' + n(s.topEmoji[0][1]) + ' volte');
    righeTxt.forEach(function (t) { y = scrivi(ctx, t, 80, y, 38, '500', SANS, 920, 1.3); });
    y += 40; ctx.font = '800 50px ' + SYNE; ctx.fillText('Chi parla di più', 80, y); y += 64;
    s.autori.slice(0, 4).forEach(function (a, i) { ctx.font = '500 38px ' + SANS; var t = (i + 1) + '. ' + nome(a.nome) + ', ' + Math.round(a.quota * 100) + '%'; if (y < 1240) { ctx.fillText(righe(ctx, t, 920)[0], 80, y); y += 50; } });
    return c.cv;
  }
  function scaricaCard(cv) {
    var fine = function () {
      cv.toBlob(function (blob) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'whatsapp-wrapped.png';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        avviso('Immagine scaricata');
      }, 'image/png');
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fine); else fine();
  }
  // Pre-carica i font per il canvas
  if (document.fonts) { try { document.fonts.load('800 40px Syne'); document.fonts.load('500 30px "Instrument Sans"'); } catch (e) {} }
})();
