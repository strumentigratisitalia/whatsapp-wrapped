// Chat di esempio generata al volo, per provare il sito senza caricare niente.
window.WW_DEMO = function () {
  var nomi = ['Giulia', 'Marco', 'Sara', 'Luca', 'Chiara'];
  var frasi = [
    'raga stasera pizza?', 'io ci sono', 'a che ora?', 'alle 9 da Gino', 'ahahahah no dai', 'non posso, ho la partita', 'ma domani?',
    'qualcuno ha visto il mio caricatore', 'buongiornooo ☀️', 'ok', 'va bene per me', 'mandatemi la posizione', 'sto arrivando 🏃',
    'chi porta il dolce?', 'io prendo il vino 🍷', 'AUGURIIII 🎉🎉', 'ahaha sei un mito', 'vabbè dai', 'che poi era chiuso', 'lol', 'mi sa che piove',
    'domenica mare? 🌊', 'ci sto', 'siamo in 6 allora', 'ho prenotato', 'grazie ❤️', 'boh vediamo', 'perfetto', 'https://maps.google.com/?q=Gino',
    'avete visto la partita?', 'che ridere ieri 😂😂', 'notte raga 🌙', 'sveglia!!', 'chi viene al cinema?', 'io no, lavoro', 'uffa', 'dai che poi andiamo a bere qualcosa',
    'hai fatto la torta?', 'sì ma è venuta male ahah', 'foto o non è successo', 'ok vi mando', 'STUPENDA', 'mitica', 'quando ci vediamo?', 'sabato?', 'sabato ok',
  ];
  var media = ['<Media omessi>', '<Media omessi>', 'audio omesso', 'sticker omesso', 'GIF omessa', 'immagine omessa', 'video omesso'];
  var seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  var out = ['28/01/26, 09:12 - I messaggi e le chiamate sono crittografati end-to-end.'];
  var t = new Date(2026, 0, 28, 9, 12);
  var peso = [0.34, 0.26, 0.2, 0.12, 0.08];
  for (var i = 0; i < 1400; i++) {
    var r = rnd(), k = 0, acc = 0;
    for (k = 0; k < nomi.length; k++) { acc += peso[k]; if (r < acc) break; }
    if (k >= nomi.length) k = nomi.length - 1;
    var gapMin = rnd() < 0.7 ? Math.floor(rnd() * 12) : Math.floor(rnd() * 600);
    t = new Date(t.getTime() + gapMin * 60000);
    var h = t.getHours();
    if (h >= 2 && h < 8 && rnd() < 0.85) t = new Date(t.getTime() + (8 - h) * 3600000);
    var testo = rnd() < 0.18 ? media[Math.floor(rnd() * media.length)] : frasi[Math.floor(rnd() * frasi.length)];
    if (k === 3 && rnd() < 0.5) testo = 'audio omesso';
    if (k === 2 && rnd() < 0.3) testo = testo + ' 😂';
    var d = String(t.getDate()).padStart(2, '0') + '/' + String(t.getMonth() + 1).padStart(2, '0') + '/' + String(t.getFullYear()).slice(2);
    var hm = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    out.push(d + ', ' + hm + ' - ' + nomi[k] + ': ' + testo);
  }
  return out.join('\n');
};
