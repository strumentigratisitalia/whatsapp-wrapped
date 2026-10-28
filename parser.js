// Lettura dell'esportazione di una chat WhatsApp (.txt o .zip), tutta nel browser.
// Gestisce i formati Android e iPhone, in italiano e in inglese, con date
// giorno/mese o mese/giorno, orari a 12 o 24 ore, messaggi su più righe.
(function (global) {
  // Android:  28/10/26, 06:12 - Nome: testo      oppure  28/10/2026 06:12 - Nome: testo
  // iPhone:   [28/10/26, 06:12:34] Nome: testo   (spesso con caratteri invisibili U+200E)
  var RE = /^‎?\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|AM|PM)?\]?\s*(?:-\s*)?(.*)$/;

  var MEDIA = /^(?:<Media omessi>|<Media omitted>|<Medien ausgeschlossen>|<Archivo omitido>|(?:immagine|video|audio|GIF|sticker|documento|image|video|audio|GIF|sticker|document)\s(?:omess[oa]|omitted|non inclus[oa])|.*\.(?:jpg|jpeg|png|webp|mp4|opus|m4a|aac|pdf|gif)\s*(?:\(file allegato\)|\(file attached\))?)$/i;
  var TIPO_MEDIA = [
    [/audio|opus|m4a|aac|vocale/i, 'vocali'],
    [/sticker|webp/i, 'sticker'],
    [/video|mp4/i, 'video'],
    [/gif/i, 'gif'],
    [/immagine|image|jpg|jpeg|png|foto/i, 'foto'],
    [/documento|document|pdf/i, 'documenti'],
  ];
  var ELIMINATO = /^(?:Hai eliminato questo messaggio|Questo messaggio è stato eliminato|You deleted this message|This message was deleted)\.?$/i;
  var SISTEMA = /(?:crittografati end-to-end|end-to-end encrypted|ha creato il gruppo|created group|ha aggiunto|added|ha abbandonato|left$|ha cambiato|changed the|ha rimosso|removed|è entrat[oa]|joined using|cambiato l'oggetto|changed the subject|messaggi effimeri|disappearing messages|ha modificato le impostazioni|chiamata vocale|voice call|videochiamata|video call|Chiamata persa|Missed)/i;

  function clean(s) { return s.replace(/[‎‏‪-‮⁦-⁩]/g, ''); }

  // Restituisce { messaggi: [{t: Date, autore, testo, tipo}], autori: [...], avvisi: [] }
  function parse(text) {
    var lines = clean(text).replace(/\r\n?/g, '\n').split('\n');
    var raw = [];
    var cur = null;
    for (var i = 0; i < lines.length; i++) {
      var m = RE.exec(lines[i]);
      if (m) {
        cur = { d: +m[1], mo: +m[2], y: +m[3], h: +m[4], mi: +m[5], ampm: m[7] ? m[7].toLowerCase().replace(/\./g, '') : '', resto: m[8] };
        raw.push(cur);
      } else if (cur && lines[i].length) {
        cur.resto += '\n' + lines[i];
      }
    }
    if (!raw.length) return null;

    // Giorno/mese o mese/giorno? Se un primo campo supera 12 è giorno/mese (Italia).
    var dmy = true, mdy = false;
    for (var k = 0; k < raw.length; k++) {
      if (raw[k].d > 12) { mdy = false; dmy = true; break; }
      if (raw[k].mo > 12) { mdy = true; dmy = false; break; }
    }
    if (!dmy && !mdy) dmy = true;

    var msgs = [], autori = {}, sistema = 0;
    for (var j = 0; j < raw.length; j++) {
      var r = raw[j];
      var y = r.y < 100 ? 2000 + r.y : r.y;
      var h = r.h;
      if (r.ampm === 'pm' && h < 12) h += 12;
      if (r.ampm === 'am' && h === 12) h = 0;
      var t = mdy ? new Date(y, r.d - 1, r.mo, h, r.mi) : new Date(y, r.mo - 1, r.d, h, r.mi);
      if (isNaN(t)) continue;
      // "Nome: testo" (il nome può contenere spazi ed emoji, ma non due punti seguiti da spazio)
      var sep = r.resto.indexOf(': ');
      if (sep < 0 || sep > 60) { sistema++; continue; }
      var autore = r.resto.slice(0, sep).trim();
      var testo = r.resto.slice(sep + 2);
      if (!autore || SISTEMA.test(testo) && testo.length < 80 && !/[.!?]$/.test(testo) && /^(?:ha |changed|added|removed|left|joined)/i.test(testo)) { sistema++; continue; }
      var tipo = 'testo';
      var t1 = testo.trim();
      if (MEDIA.test(t1)) {
        tipo = 'media';
        for (var q = 0; q < TIPO_MEDIA.length; q++) if (TIPO_MEDIA[q][0].test(t1)) { tipo = TIPO_MEDIA[q][1]; break; }
        if (tipo === 'media') tipo = 'foto';
      } else if (ELIMINATO.test(t1)) tipo = 'eliminato';
      else if (/^(?:Posizione|Location): https?:\/\/maps/i.test(t1) || /^https?:\/\/maps\.google/i.test(t1)) tipo = 'posizione';
      else if (/^(?:Messaggio vocale|Voice message)/i.test(t1)) tipo = 'vocali';
      msgs.push({ t: t, autore: autore, testo: tipo === 'testo' ? testo : '', tipo: tipo });
      autori[autore] = (autori[autore] || 0) + 1;
    }
    var lista = Object.keys(autori).sort(function (a, b) { return autori[b] - autori[a]; });
    return { messaggi: msgs, autori: lista, sistema: sistema, formato: mdy ? 'mese/giorno' : 'giorno/mese' };
  }

  // Legge un file .txt o .zip (dentro il quale cerca il .txt della chat).
  function leggiFile(file) {
    var nome = (file.name || '').toLowerCase();
    if (nome.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      return file.arrayBuffer().then(estraiTxtDaZip);
    }
    return file.text();
  }

  // Parser minimo dello zip: scorre le voci locali e decomprime la prima .txt
  // (stored o deflate) con DecompressionStream.
  function estraiTxtDaZip(buf) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf);
    var pos = 0, best = null;
    while (pos + 30 <= u8.length && dv.getUint32(pos, true) === 0x04034b50) {
      var method = dv.getUint16(pos + 8, true);
      var csize = dv.getUint32(pos + 18, true), usize = dv.getUint32(pos + 22, true);
      var nlen = dv.getUint16(pos + 26, true), elen = dv.getUint16(pos + 28, true);
      var name = new TextDecoder().decode(u8.subarray(pos + 30, pos + 30 + nlen));
      var start = pos + 30 + nlen + elen;
      var flags = dv.getUint16(pos + 6, true);
      if (flags & 8) { // dimensioni nel data descriptor: cerchiamo nel central directory
        var cd = cercaCentral(dv, u8, name);
        if (cd) { csize = cd.csize; usize = cd.usize; method = cd.method; }
      }
      if (/\.txt$/i.test(name) && (!best || usize > best.usize)) best = { name: name, method: method, start: start, csize: csize, usize: usize };
      pos = start + csize;
      if (flags & 8) pos += 16; // salta il data descriptor (può avere firma di 4 byte)
    }
    if (!best) throw new Error('Nello zip non c\'è un file .txt della chat.');
    var data = u8.subarray(best.start, best.start + best.csize);
    if (best.method === 0) return Promise.resolve(new TextDecoder().decode(data));
    if (best.method !== 8 || typeof DecompressionStream !== 'function') throw new Error('Questo zip non si riesce ad aprire qui: esporta la chat senza file multimediali, oppure estrai il .txt.');
    var ds = new DecompressionStream('deflate-raw');
    var w = ds.writable.getWriter(); w.write(data); w.close();
    return new Response(ds.readable).text();
  }

  function cercaCentral(dv, u8, name) {
    // Cerca la firma di fine central directory dalla coda
    for (var i = u8.length - 22; i >= 0 && i > u8.length - 70000; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        var n = dv.getUint16(i + 10, true), off = dv.getUint32(i + 16, true);
        var p = off;
        for (var k = 0; k < n && p + 46 <= u8.length; k++) {
          if (dv.getUint32(p, true) !== 0x02014b50) return null;
          var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
          var nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
          var nm = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
          if (nm === name) return { method: method, csize: csize, usize: usize };
          p += 46 + nl + el + cl;
        }
        return null;
      }
    }
    return null;
  }

  global.WW_PARSE = { parse: parse, leggiFile: leggiFile };
})(typeof window !== 'undefined' ? window : global);
