// Statistiche della chat: tutto calcolato in locale a partire dai messaggi.
(function (global) {
  var STOP = new Set(('a ad al alla alle allo agli ai anche ancora avere avevo aveva avete hanno ha ho hai abbiamo c che chi ci cosa come con contro cui da dal dalla dalle dallo dagli dai de dei del della delle dello degli di dopo dove e è ed era erano essere fa fai fare fatto fra gli ha hai ho i il in io la le lei li lo loro lui ma me mi mia mie miei mio molto ne nei nel nella nelle nello negli no noi non nostro o ora per perché però più poi può qua quando quanto quella quelle quelli quello questa queste questi questo qui sa se sei sempre si sì sia siamo siete solo sono sta stata stato su sua sue sui suo suoi sul sulla sulle sullo tra tu tua tue tuo tuoi tutti tutto un una uno va vai vi voi vostro allora adesso così comunque cioè oh ah eh boh ok okay va bene già sto stai sta ancora vabbè vabbe dai niente nulla quindi anzi proprio ieri oggi domani cmq xk x ke nn pk tt qst qlc qlcs raga ragazzi ragazze mo mai dove li gliel glielo che cosa dove come quando quale quali ogni ora altro altra altri altre essa esso quel quei senza sotto sopra verso tanto tanta tanti tante poco pochi poca troppo certo forse pure magari infatti insomma appunto ecco qualcosa qualcuno nessuno ognuno tipo cioe mamma mia the and you to of is it in that for on with this be are was not have at as do but i my me we he she they so if or an').split(' '));
  var EMOJI = /\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*/gu;
  var RISATA = /\b(?:a?h[ae](?:h[ae])+h?|lol|lmao|rotfl|xd)\b|😂|🤣|💀/i;
  var LINK = /https?:\/\/\S+/i;
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

  function top(map, n) {
    return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n);
  }
  function mediana(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }); var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function calcola(parsed) {
    var msgs = parsed.messaggi;
    var autori = {};
    parsed.autori.forEach(function (a) {
      autori[a] = { nome: a, msgs: 0, parole: 0, caratteri: 0, testi: 0, media: 0, foto: 0, video: 0, vocali: 0, sticker: 0, gif: 0, documenti: 0, emoji: 0, emojiMap: {}, risate: 0, link: 0, eliminati: 0, notte: 0, mattina: 0, risposte: [], iniziati: 0, parole_map: {}, perOra: new Array(24).fill(0), giorniAttivi: {}, domande: 0, maiuscole: 0, lungo: 0 };
    });
    var perOra = new Array(24).fill(0), perGiorno = new Array(7).fill(0), perMese = {}, perGiornoData = {};
    var emojiTot = {}, paroleTot = {};
    var prev = null;
    msgs.forEach(function (m) {
      var a = autori[m.autore]; if (!a) return;
      a.msgs++;
      var h = m.t.getHours();
      perOra[h]++; a.perOra[h]++; perGiorno[m.t.getDay()]++;
      var mk = m.t.getFullYear() + '-' + String(m.t.getMonth() + 1).padStart(2, '0');
      perMese[mk] = (perMese[mk] || 0) + 1;
      var dk = dayKey(m.t);
      perGiornoData[dk] = (perGiornoData[dk] || 0) + 1;
      a.giorniAttivi[dk] = 1;
      if (h < 6) a.notte++;
      if (h >= 6 && h < 9) a.mattina++;
      if (m.tipo !== 'testo') {
        if (m.tipo === 'eliminato') a.eliminati++;
        else if (m.tipo === 'posizione') { /* niente */ }
        else { a.media++; if (a[m.tipo] !== undefined) a[m.tipo]++; }
      } else {
        a.testi++;
        var testo = m.testo;
        a.caratteri += testo.length;
        if (testo.length > 300) a.lungo++;
        if (/\?\s*$/.test(testo)) a.domande++;
        if (testo.length > 8 && testo === testo.toUpperCase() && /[A-Z]/.test(testo)) a.maiuscole++;
        if (LINK.test(testo)) a.link++;
        if (RISATA.test(testo)) a.risate++;
        var em = testo.match(EMOJI);
        if (em) { a.emoji += em.length; em.forEach(function (e) { a.emojiMap[e] = (a.emojiMap[e] || 0) + 1; emojiTot[e] = (emojiTot[e] || 0) + 1; }); }
        var words = testo.toLowerCase().replace(EMOJI, ' ').replace(LINK, ' ').replace(/[^\p{L}\p{N}' ]+/gu, ' ').split(/\s+/).filter(Boolean);
        a.parole += words.length;
        words.forEach(function (w) {
          if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) return;
          a.parole_map[w] = (a.parole_map[w] || 0) + 1; paroleTot[w] = (paroleTot[w] || 0) + 1;
        });
      }
      if (prev) {
        var gap = (m.t - prev.t) / 60000; // minuti
        if (gap >= 360) a.iniziati++;
        else if (prev.autore !== m.autore && gap <= 720) a.risposte.push(gap);
      } else a.iniziati++;
      prev = m;
    });

    var lista = Object.keys(autori).map(function (k) { return autori[k]; }).sort(function (x, y) { return y.msgs - x.msgs; });
    var totale = msgs.length;
    lista.forEach(function (a) {
      a.quota = totale ? a.msgs / totale : 0;
      a.mediaParole = a.testi ? a.parole / a.testi : 0;
      a.rispostaMediana = mediana(a.risposte);
      a.topEmoji = top(a.emojiMap, 3);
      a.topParole = top(a.parole_map, 5);
      a.nGiorniAttivi = Object.keys(a.giorniAttivi).length;
      a.oraPreferita = a.perOra.indexOf(Math.max.apply(null, a.perOra));
    });

    var giorni = Object.keys(perGiornoData).sort();
    var record = top(perGiornoData, 1)[0];
    var primo = msgs[0].t, ultimo = msgs[msgs.length - 1].t;
    var span = Math.max(1, Math.round((ultimo - primo) / 86400000) + 1);
    var oraTop = perOra.indexOf(Math.max.apply(null, perOra));
    var giornoTop = perGiorno.indexOf(Math.max.apply(null, perGiorno));
    var mesi = Object.keys(perMese).sort().map(function (k) { return { k: k, label: MESI[+k.slice(5) - 1] + ' ' + k.slice(2, 4), n: perMese[k] }; });

    // Premi: ogni persona può vincere più titoli; servono almeno 2 persone
    var premi = [];
    function premio(titolo, descr, chiave, min, fmtv) {
      var best = null;
      lista.forEach(function (a) { var v = chiave(a); if (v !== null && v !== undefined && (best === null || v > best.v)) best = { a: a, v: v }; });
      if (best && best.v >= (min || 1)) premi.push({ titolo: titolo, descr: descr, nome: best.a.nome, valore: fmtv ? fmtv(best.v, best.a) : best.v });
    }
    function premioMin(titolo, descr, chiave, fmtv) {
      var best = null;
      lista.forEach(function (a) { var v = chiave(a); if (v !== null && v !== undefined && (best === null || v < best.v)) best = { a: a, v: v }; });
      if (best) premi.push({ titolo: titolo, descr: descr, nome: best.a.nome, valore: fmtv ? fmtv(best.v, best.a) : best.v });
    }
    if (lista.length >= 2) {
      premio('La voce del gruppo', 'Chi ha scritto più messaggi', function (a) { return a.msgs; }, 1, function (v, a) { return v + ' messaggi, il ' + Math.round(a.quota * 100) + '% di tutto'; });
      premio('Il romanziere', 'Messaggi più lunghi in media', function (a) { return a.testi >= 20 ? a.mediaParole : null; }, 1, function (v) { return v.toFixed(1).replace('.', ',') + ' parole a messaggio'; });
      premioMin('Il telegrafico', 'Messaggi più corti in media', function (a) { return a.testi >= 20 ? a.mediaParole : null; }, function (v) { return v.toFixed(1).replace('.', ',') + ' parole a messaggio'; });
      premio('Il nottambulo', 'Quota più alta di messaggi tra mezzanotte e le 6', function (a) { return a.notte >= 3 ? a.notte / a.msgs : null; }, 0.0001, function (v, a) { return a.notte + ' messaggi di notte, il ' + Math.round(v * 100) + '% dei suoi'; });
      premio('Il mattiniero', 'Quota più alta di messaggi tra le 6 e le 9', function (a) { return a.mattina >= 3 ? a.mattina / a.msgs : null; }, 0.0001, function (v, a) { return a.mattina + ' messaggi all\'alba, il ' + Math.round(v * 100) + '% dei suoi'; });
      premio('Re dei vocali', 'Quota più alta di messaggi vocali', function (a) { return a.vocali >= 3 ? a.vocali / a.msgs : null; }, 0.0001, function (v, a) { return a.vocali + ' vocali'; });
      premio('Il fotografo', 'Quota più alta di foto e video', function (a) { return a.foto + a.video >= 3 ? (a.foto + a.video) / a.msgs : null; }, 0.0001, function (v, a) { return (a.foto + a.video) + ' tra foto e video'; });
      premio('Lo stickeraro', 'Quota più alta di sticker e GIF', function (a) { return a.sticker + a.gif >= 3 ? (a.sticker + a.gif) / a.msgs : null; }, 0.0001, function (v, a) { return (a.sticker + a.gif) + ' tra sticker e GIF'; });
      premio('Ride sempre', 'Quota più alta di messaggi con una risata', function (a) { return a.risate >= 3 ? a.risate / Math.max(1, a.testi) : null; }, 0.0001, function (v, a) { return a.risate + ' messaggi con una risata'; });
      premio('Emoji dipendente', 'Più emoji per messaggio', function (a) { return a.testi >= 20 ? a.emoji / a.testi : null; }, 0.2, function (v, a) { return a.emoji + ' emoji, preferita ' + (a.topEmoji[0] ? a.topEmoji[0][0] : ''); });
      premio('Apre le danze', 'Inizia più conversazioni dopo ore di silenzio', function (a) { return a.iniziati; }, 2, function (v) { return v + ' conversazioni iniziate'; });
      premioMin('Risposta lampo', 'Risponde più in fretta agli altri', function (a) { return a.risposte.length >= 10 ? a.rispostaMediana : null; }, function (v) { return v < 1 ? 'meno di un minuto' : v < 60 ? Math.round(v) + ' minuti in media' : (v / 60).toFixed(1).replace('.', ',') + ' ore in media'; });
      premio('Il ritardatario', 'Risponde con più calma', function (a) { return a.risposte.length >= 10 ? a.rispostaMediana : null; }, 1, function (v) { return v < 60 ? Math.round(v) + ' minuti in media' : (v / 60).toFixed(1).replace('.', ',') + ' ore in media'; });
      premio('Il punto interrogativo', 'Quota più alta di domande', function (a) { return a.domande >= 5 ? a.domande / Math.max(1, a.testi) : null; }, 0.0001, function (v, a) { return a.domande + ' domande'; });
      premio('Il condivisore', 'Manda più link', function (a) { return a.link; }, 3, function (v) { return v + ' link'; });
      premio('Ci ha ripensato', 'Più messaggi eliminati', function (a) { return a.eliminati; }, 2, function (v) { return v + ' messaggi eliminati'; });
      premio('SCRIVE COSÌ', 'Più messaggi tutti in maiuscolo', function (a) { return a.maiuscole; }, 3, function (v) { return v + ' messaggi urlati'; });
      premio('Sempre presente', 'Ha scritto in più giorni diversi', function (a) { return a.nGiorniAttivi; }, 2, function (v) { return v + ' giorni diversi'; });
    }
    // Evita che "ritardatario" e "lampo" siano la stessa persona quando c'è una sola con dati
    premi = premi.filter(function (p, i, arr) { return !(p.titolo === 'Il ritardatario' && arr.some(function (q) { return q.titolo === 'Risposta lampo' && q.nome === p.nome; })); });
    premi = premi.filter(function (p, i, arr) { return !(p.titolo === 'Il telegrafico' && arr.some(function (q) { return q.titolo === 'Il romanziere' && q.nome === p.nome; })); });

    return {
      totale: totale, autori: lista, primo: primo, ultimo: ultimo, span: span, giorniAttivi: giorni.length,
      mediaAlGiorno: totale / Math.max(1, giorni.length),
      perOra: perOra, perGiorno: perGiorno, mesi: mesi, oraTop: oraTop, giornoTop: GIORNI[giornoTop],
      record: record ? { data: record[0], n: record[1] } : null,
      topEmoji: top(emojiTot, 10), topParole: top(paroleTot, 12), premi: premi,
      media: lista.reduce(function (s, a) { return s + a.media; }, 0),
      vocali: lista.reduce(function (s, a) { return s + a.vocali; }, 0),
      sistema: parsed.sistema,
    };
  }

  global.WW_STATS = { calcola: calcola, GIORNI: GIORNI, MESI: MESI };
})(typeof window !== 'undefined' ? window : global);
