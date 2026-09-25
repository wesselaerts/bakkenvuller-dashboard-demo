/* ==================================================================
   NABOOTSING VAN DE BRUG, IN DE BROWSER: de deelversie (25-09-2026)
   ------------------------------------------------------------------
   Dit is gereedschap\hmi-nabootsing\nabootsing.py, regel voor regel
   overgezet naar JavaScript, zodat het dashboard als gewone website
   werkt (GitHub Pages, of dubbelklikken op index.html) zonder server.
   Hij onderschept de verzoeken van het dashboard aan de brug (/snapshot,
   /events, /command/..., inloggen, adviesbladen) en beantwoordt ze zelf,
   met de testgegevens uit stand.json (hieronder ingebouwd).

   - Sinds 25-09 (middag) draait er een echte machine achter: machine.js
     (het rekenmodel van gereedschap\machine-nabootsing\model.py, in
     JavaScript) en plc.js (de stappenketens van het ontwerp). Bakken
     lopen vol en leeg, de flowmeter telt, beurten lopen door; wat het
     scherm laat zien komt van die twee, niet meer uit vaste testwaarden.
     stand.json levert alleen nog de begintoestand (niveaus, instellingen,
     configuratie, kalibratie, recepten).
   - Het is een nabootsing: het blok bridge zegt "bron": "nabootsing" en
     het dashboard toont de paarse balk. Er is geen PLC en geen netwerk.
   - Wat een collega wijzigt, blijft in zijn eigen browser (localStorage);
     de knop "Opnieuw beginnen" of ?opnieuw in het adres wist alles.
   - Bediening is open (geen wachtwoord); Service en Configuratie hebben
     de democode. Die beveiligt niets: dit is een testpagina.
   - Adviesbladen (pdf) blijven alleen in het geheugen: na herladen weg.
   - Gebouwd door gereedschap\hmi-deel\bouw_deel.py; wijzig dit bestand
     daar, niet in de deelmap.
   ================================================================== */
(function () {
  'use strict';
  const STAND = /*@STAND@*/{"machine":{"modus":"AUTO","fout":0,"doseerkring":"A","ketens":{"A":{"fase":42,"meststof":"Kali 50%","doelL":208.0,"geteldL":131.4}}},"kanalen":{"SE6-1-5":{"v":true},"SE6-2-1":{"v":true},"SE6-1-15":{"v":true},"SE6-1-16":{"v":true},"SE6-2-6":{"v":true},"SE6-2-2":{"v":true},"SE4-2-1":{"v":1287340},"SE4-3-1":{"v":30000},"SE6-5-2":{"v":32770}},"bus":{},"waarden":{"BM-FCS1":{"v":true},"HM-FCS1":{"v":true},"BM-VP02":{"v":true},"BM-MTBA":{"v":true},"FC01":{"v":62.4,"u":"l/min"},"FCS1":{"v":50,"u":"Hz"},"LT-TBA":{"v":310,"u":"L"},"LT-TBB":{"v":0,"u":"L","q":"bad"},"LT-A1":{"v":612,"u":"L"},"LT-A2":{"v":455,"u":"L"},"LT-A3":{"v":295,"u":"L"},"LT-B1":{"v":590,"u":"L"},"LT-B2":{"v":470,"u":"L"},"LT-B3":{"v":290,"u":"L"},"LT-ZB":{"v":140,"u":"L"},"LT-SP1":{"v":96,"u":"L"},"LT-SP2":{"v":88,"u":"L"},"LT-SP3":{"v":101,"u":"L"}},"instellingen":{"P_VolSpoel":{"v":30,"u":"L"},"P_VolFijn":{"v":2.0,"u":"L"},"P_TijdPomp":{"v":90,"u":"s"},"P_VolNaloop":{"v":0.35,"u":"L"},"P_MinGift":{"v":0.5,"u":"L"},"P_TijdMengen":{"v":30,"u":"s"},"P_TijdMengenEind":{"v":180,"u":"s"},"P_TolLektestNiveau":{"v":5.0,"u":"L"},"P_NivStart":{"A1":{"v":30,"u":"%"},"A2":{"v":30,"u":"%"},"A3":{"v":30,"u":"%"},"B1":{"v":30,"u":"%"},"B2":{"v":30,"u":"%"},"B3":{"v":30,"u":"%"},"ZB":{"v":30,"u":"%"},"SP1":{"v":35,"u":"%"},"SP2":{"v":30,"u":"%"},"SP3":{"v":30,"u":"%"}},"P_NivRoerderAan":{"SP1":{"v":25,"u":"%"},"SP2":{"v":60,"u":"%"},"SP3":{"v":25,"u":"%"}},"P_TijdRoerderAan":{"SP1":{"v":2,"u":"min"},"SP2":{"v":10,"u":"min"},"SP3":{"v":5,"u":"min"}},"P_TijdRoerderRust":{"SP1":{"v":3,"u":"min"},"SP2":{"v":50,"u":"min"},"SP3":{"v":55,"u":"min"}},"P_TijdRoerderNaVullen":{"SP1":{"v":15,"u":"min"},"SP2":{"v":20,"u":"min"},"SP3":{"v":15,"u":"min"}}},"configuratie":{"versie":1,"aantalMeststof":10,"aantalSporenbak":3,"zuurbakGroep":"B","volReferentie":1000,"volWerkbak":{"A1":1000,"A2":1000,"A3":1000,"B1":1000,"B2":1000,"B3":1000},"volTussenbak":{"TBA":1000,"TBB":1000},"volBatch":700,"volZuurbak":500,"volSporenbak":[150,150,150],"bronnen":[{"nr":1,"naam":"Salpeterzuur","groep":"AB","lektestS":20},{"nr":2,"naam":"Fosforzuur","groep":"B","lektestS":30},{"nr":3,"naam":"Ammoniumnitraat","groep":"AB","lektestS":20},{"nr":4,"naam":"Kali 50%","groep":"AB","lektestS":25},{"nr":5,"naam":"Kalksalpeter","groep":"B","lektestS":20},{"nr":6,"naam":"CalciumChloride","groep":"B","lektestS":25},{"nr":7,"naam":"Bitterzout","groep":"AB","lektestS":20},{"nr":8,"naam":"Zwavelzuur","groep":"B","lektestS":30},{"nr":9,"naam":"Optifos","groep":"A","lektestS":20},{"nr":10,"naam":"IJzer","groep":"AB","lektestS":20},{"nr":21,"naam":"Sporen 1","groep":"AB","lektestS":25},{"nr":22,"naam":"Sporen 2","groep":"B","lektestS":25},{"nr":23,"naam":"Sporen 3","groep":"A","lektestS":25}]},"kalibratie":{"versie":1,"pulsGewicht":0.003968,"pulsDatum":20260921,"niveau":{"LT-TBA":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-TBB":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-A1":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-A2":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-A3":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-B1":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-B2":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-B3":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":1000,"datum":20260921},"LT-ZB":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":500,"datum":20260921},"LT-SP1":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":150,"datum":20260921},"LT-SP2":{"rawNul":0,"literNul":0,"rawTop":30000,"literTop":150,"datum":20260921}}},"recepten":{"A1":[30,0,90,260,0,0,80,0,40,0,0,0,0,0,0,0,0,0,0,0,10,0,0],"A2":[25,0,80,220,0,0,70,0,35,0,0,0,0,0,0,0,0,0,0,0,10,0,0],"A3":[20,0,0,200,0,0,60,0,30,0,0,0,0,0,0,0,0,0,0,0,8,0,0],"B1":[0,0,0,0,300,40,0,0,0,15,0,0,0,0,0,0,0,0,0,0,0,10,0],"B2":[0,0,0,0,280,35,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,10,0],"B3":[0,20,0,0,260,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,8,0],"ZB":[30,10,0,0,0,0,0,20,0,0],"SP1":[0,0,0,0,0,0,0,0,0,40],"SP2":[0,0,0,0,0,0,25,0,0,0],"SP3":[0,0,0,0,0,0,0,0,20,0]},"receptopbouw":{"A1":{"versie":1,"stappen":[1,3,4,7,9,21],"water":[150,null,null,null,null,null,null],"standaard":{"1":30,"3":90,"4":250,"7":80,"9":40,"21":10}},"A2":{"versie":1,"stappen":[1,3,4,7,9,21],"water":[null,null,null,null,null,null,null],"standaard":{"1":25,"3":80,"4":220,"7":70,"9":35,"21":10}},"A3":{"versie":1,"stappen":[1,4,7,9,21],"water":[null,null,null,null,null,null],"standaard":{"1":20,"4":200,"7":60,"9":30,"21":8}},"B1":{"versie":1,"stappen":[5,6,10,22],"water":[100,null,null,null,null],"standaard":{"5":300,"6":40,"10":15,"22":10}},"B2":{"versie":1,"stappen":[5,6,10,22],"water":[null,null,null,null,null],"standaard":{"5":280,"6":35,"10":12,"22":10}},"B3":{"versie":1,"stappen":[2,5,10,22],"water":[null,null,null,null,null],"standaard":{"2":20,"5":260,"10":12,"22":8}}},"events":[{"id":"nb-1","code":"W-TEST","sev":"warn","aud":"op","text":"Testmelding uit de nabootsing","source":"nabootsing","cause":"Alleen om het meldingenscherm te testen.","check":"Niets: dit is geen echte machine.","minutenGeleden":5}]}/*@/STAND@*/;
  const GEMAAKT = /*@GEMAAKT@*/"2026-09-25 15:09"/*@/GEMAAKT@*/;
  const DEMO_CODE = '0000';
  const SPOREN_START = 20;
  const WERKBAKKEN = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];
  const GROEPEN = ['A', 'B', 'AB'];
  const ONTWERP_WAARDEN = {
    P_VolVoorwater: { v: 50, u: 'L' }, P_Hz_Hoog: { v: 50, u: 'Hz' }, P_Hz_Laag: { v: 30, u: 'Hz' },
    P_NivStart: Object.fromEntries(WERKBAKKEN.map(b => [b, { v: 40, u: '%' }]))
  };
  const GRENZEN = {
    P_NivStart: { min: 30, max: 40 }, P_VolSpoel: { min: 15, max: 30 },
    P_NivRoerderAan: { min: 10, max: 90 }, P_TijdRoerderAan: { min: 1, max: 60 },
    P_TijdRoerderRust: { min: 0, max: 240 }, P_TijdRoerderNaVullen: { min: 0, max: 120 }
  };
  const PER_BRON = ['P_VolSpoel', 'P_VolFijn', 'P_TijdPomp', 'P_VolNaloop'];
  const BATCH_MIN = 100;
  const PULS_ONTWERP = 1 / 252;
  const NIVEAUS = ['bediening', 'service', 'configuratie'];
  const RANG = { bediening: 0, service: 1, configuratie: 2 };
  const MIN_LENGTE = { bediening: 4, service: 6, configuratie: 6 };
  const STIL_MAX_MS = 30 * 60 * 1000;
  const POGINGEN_MAX = 5, BLOKKEER_MS = 60 * 1000;
  const NODIG = { '/command/instelling': 'service', '/command/recept': 'bediening', '/command/receptopbouw': 'service',
    '/command/configuratie': 'configuratie', '/command/kalibratie': 'service' };
  const ADVIES_MAX_BESTAND = 8 * 1024 * 1024, ADVIES_MAX_TOTAAL = 50 * 1024 * 1024;
  const SLEUTEL = 'bv-deel-stand', SLEUTEL_SESSIE = 'bv-deel-sessie';

  /* ---------------- de machine: uit MACHINE in de pagina, bij het eerste gebruik ---------------- */
  let M = null;
  function machine() {
    if (M) return M;
    const loc = MACHINE.locaties;
    const hwMest = loc.filter(l => l.groep === 'Voorraadtank').length;
    const hwSporen = loc.filter(l => l.groep === 'Sporentank').length;
    const sporen = Array.from({ length: hwSporen }, (_, i) => 'SP' + (i + 1));
    const receptBakken = WERKBAKKEN.concat(['ZB'], sporen);
    M = {
      hwMest, hwSporen, sporen, receptBakken, vulBakken: receptBakken,
      bronNummers: Array.from({ length: hwMest }, (_, i) => i + 1).concat(sporen.map((_, i) => SPOREN_START + i + 1)),
      perBak: { P_NivStart: receptBakken, P_NivRoerderAan: sporen, P_TijdRoerderAan: sporen, P_TijdRoerderRust: sporen, P_TijdRoerderNaVullen: sporen },
      schaal: Object.assign(Object.fromEntries(WERKBAKKEN.concat(['TBA', 'TBB']).map(b => [b, 1000])), { ZB: 500 },
        Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['SP' + (i + 1), 150])))
    };
    return M;
  }
  const kanalen = () => MACHINE.kanalen;
  const componenten = () => MACHINE.componenten;
  function genKanaal(adres) { const k = kanalen().find(x => x.adres === adres); return k ? k.sleutel : null; }

  /* ---------------- hulpjes ---------------- */
  const kopie = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const isInt = x => typeof x === 'number' && Number.isInteger(x);
  const isGetal = x => typeof x === 'number' && isFinite(x);
  function getal(x) { if (x && typeof x === 'object') x = x.v; return isGetal(x) ? x : null; }
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function nu() { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  function tijd(ms) { return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  function meng(a, b) {
    Object.keys(b || {}).forEach(k => {
      const v = b[k];
      if (isObj(v) && isObj(a[k])) meng(a[k], v);
      else if (Array.isArray(v) && Array.isArray(a[k])) { v.forEach((x, i) => { if (x === null || x === undefined) return; while (a[k].length <= i) a[k].push(null); a[k][i] = kopie(x); }); }
      else a[k] = kopie(v);
    });
    return a;
  }
  const standExtra = () => STAND;

  /* ---------------- de stand: wat 'de PLC' heeft, bewaard in de browser ---------------- */
  function vers() {
    return { wijzigingen: {}, receptWijzigingen: {}, CONFIG: isObj(STAND.configuratie) ? kopie(STAND.configuratie) : null,
      KAL: isObj(STAND.kalibratie) ? kopie(STAND.kalibratie) : null, RECEPTOPBOUW: isObj(STAND.receptopbouw) ? kopie(STAND.receptopbouw) : null,
      RESULTAAT: { teller: 0, code: 0, bron: 0 }, KAL_RESULTAAT: { teller: 0, code: 0, sensor: 0 }, RB_RESULTAAT: { teller: 0, code: 0, bak: '' },
      WACHTWOORD: { service: DEMO_CODE, configuratie: DEMO_CODE }, AUDIT: [], acks: {} };
  }
  function laad() {
    try { const t = localStorage.getItem(SLEUTEL); if (t) { const s = JSON.parse(t); if (s && s.gemaakt === GEMAAKT) return s; } } catch (_) { }
    return null;
  }
  const S = laad() || Object.assign(vers(), { gemaakt: GEMAAKT });
  let insCache = null, cfgCache = null;   // de PLC vraagt instellingen en configuratie tientallen keren per scan: één kopie per wijziging
  function bewaar() { insCache = null; cfgCache = null; if (gestopt) return; try { localStorage.setItem(SLEUTEL, JSON.stringify(S)); } catch (_) { } }
  const ADVIES = {};          // bak -> [{id, naam, grootte, datum, niveau, blob}], nieuwste eerst; alleen in het geheugen
  const POGINGEN = {};        // niveau -> {fout, tot}
  const blobUrls = {};

  /* ---------------- de machine en de PLC: machine.js (het rekenmodel) en plc.js (de stappenketens) ---------------- */
  const DT = 0.05;                 // s per rekenstap; de PLC-nabootsing scant elke stap (de echte PLC elke 10 ms)
  const TIK_MS = 200;              // hoe vaak de browser rekent
  const TEMPOS = [1, 5, 20];       // sneller kijken: dezelfde fysica, meer stappen per seconde
  const DEMO_VERBRUIK = { werkbak: 3.0, zuurbak: 0.3 };   // l/min: wat de kas uit de bakken haalt [aangenomen, alleen voor deze demo]
  let DEF = null, ENGINE = null, PLC = null;   // komen er zodra MACHINE bestaat: het dashboardscript laadt ná dit bestand
  const BRON = {   // wat de PLC uit zijn geheugen haalt: hier uit de nabootsing van de brug
    instellingen: () => insCache || (insCache = instellingenNu()),
    configuratie: () => cfgCache || (cfgCache = S.CONFIG ? Object.assign({}, S.CONFIG, { geldig: toetsConfig(S.CONFIG) === null }) : null),
    kalibratie: () => S.KAL, recepten: () => receptenNu(), receptopbouw: () => S.RECEPTOPBOUW,
    reken: bak => { const rb = (S.RECEPTOPBOUW || {})[bak]; if (!rb || !Array.isArray(rb.stappen)) return null; return rekenRecept(rb.stappen, rb.water || [], telerWaarden(receptenNu(), bak, rb.stappen), matenNu(bak)); },
    pulsGewicht: () => pulsGewicht(S.KAL), hzNaarRuw: hz => ENGINE.hzNaarRuw(hz), nuIso: () => nu(),
    leidingL: () => ENGINE.p['leiding.inhoud_l']   // de inhoud van de doseerleiding, als service-constante van de PLC [aangenomen: parameters.json]
  };
  function sim() {   // de machine en de PLC, gebouwd bij het eerste gebruik
    if (PLC) return PLC;
    if (typeof MACHINE === 'undefined') throw new Error('nabootsing: MACHINE bestaat nog niet');
    DEF = BvMachine.definitie(MACHINE);
    if (DEF.fouten.length) console.warn('nabootsing: de machinedefinitie heeft gaten', DEF.fouten);
    ENGINE = new BvMachine.Model(DEF, null, 7);
    PLC = new BvPlc.Plc(DEF, BRON);
    if (!simHerstel()) simBegin();
    PLC.auto = !S.rust;
    return PLC;
  }
  let tempo = 1, laatsteTik = 0, laatstBewaard = 0;
  function bakIdVan(loc) {   // LOC-A1 → A1, LOC-TBA → TBA, LOC-ZB → ZB, de s-de sporentank → SPs
    const b = DEF.bakken[loc]; if (!b) return null;
    if (b.soort === 'werkbak') return b.naam.trim().split(/\s+/).pop();
    if (b.soort === 'tussenbak') return 'TB' + b.kant;
    if (b.soort === 'zuurbak') return 'ZB';
    if (b.soort === 'sporen') { const l = Object.values(DEF.bakken).filter(x => x.soort === 'sporen').sort((x, y) => x.volgorde - y.volgorde); return 'SP' + (l.indexOf(b) + 1); }
    return null;
  }
  function simBegin() {   // de begintoestand: de niveaus uit stand.json, de tussenbakken leeg, de kas verbruikt
    const w = STAND.waarden || {};
    Object.keys(ENGINE.bakken).forEach(loc => {
      const b = ENGINE.bakken[loc]; const bak = bakIdVan(loc); if (!bak) return;
      if (b.soort === 'tussenbak') { b.zetVolume(0); return; }
      const x = w['LT-' + bak]; const L = x && typeof x === 'object' ? Number(x.v) : NaN; if (isFinite(L)) b.zetVolume(L);
      if (b.soort === 'werkbak') b.verbruikLpm = DEMO_VERBRUIK.werkbak; if (b.soort === 'zuurbak') b.verbruikLpm = DEMO_VERBRUIK.zuurbak;
    });
    ENGINE._rekenIngangen(0);
  }
  function simHerstel() { const s = S.sim; if (s && s.engine && s.plc && ENGINE.herstel(s.engine) && PLC.herstel(s.plc)) { tempo = TEMPOS.includes(s.tempo) ? s.tempo : 1; return true; } return false; }
  function simBewaar() { if (!PLC) return; S.sim = { engine: ENGINE.bewaar(), plc: PLC.bewaar(), tempo }; bewaar(); }
  function simTik() {
    if (typeof MACHINE === 'undefined' || gestopt) return;
    sim();
    const nuMs = Date.now(); if (!laatsteTik) laatsteTik = nuMs;
    const dtEcht = Math.min(2.0, (nuMs - laatsteTik) / 1000); laatsteTik = nuMs;   // ook als het tabblad even op de achtergrond stond, hoogstens 2 s inhalen
    const stappen = Math.min(800, Math.round(dtEcht * tempo / DT));
    for (let i = 0; i < stappen; i++) { PLC.scan(DT, ENGINE.ingangen); ENGINE.zetUitgangen(PLC.uitgangen); ENGINE.step(DT); }
    if (nuMs - laatstBewaard > 5000) { laatstBewaard = nuMs; simBewaar(); }
    if (typeof tekenKnoppen === 'function') tekenKnoppen();
  }
  function zetTempo(t) { tempo = TEMPOS.includes(t) ? t : 1; simBewaar(); tekenKnoppen(true); }
  setInterval(simTik, TIK_MS);

  /* ---------------- de configuratie ---------------- */
  function actief(c) {
    if (!c || !isInt(c.aantalMeststof)) return [];
    const nS = isInt(c.aantalSporenbak) ? c.aantalSporenbak : 0;
    const uit = [];
    for (let n = 1; n <= Math.min(20, c.aantalMeststof); n++) uit.push(n);
    for (let s = 1; s <= Math.min(5, nS); s++) uit.push(SPOREN_START + s);
    return uit;
  }
  function bronVan(c, n) { return ((c && c.bronnen) || []).find(b => isObj(b) && b.nr === n) || null; }
  function groepBak(c, bak) {
    if (['TBA', 'A1', 'A2', 'A3'].includes(bak)) return 'A';
    if (['TBB', 'B1', 'B2', 'B3'].includes(bak)) return 'B';
    if (bak === 'ZB') return (c || {}).zuurbakGroep;
    const m = /^SP([1-5])$/.exec(bak || ''); if (m) { const b = bronVan(c, SPOREN_START + Number(m[1])); return b ? b.groep : null; }
    return null;
  }
  const past = (stof, bak) => GROEPEN.includes(stof) && GROEPEN.includes(bak) && (stof === 'AB' || stof === bak);
  const naamGroep = g => ({ A: 'A', B: 'B', AB: 'A+B' })[g] || 'geen';
  function inhoudVan(c, bak) {
    c = c || {};
    if (WERKBAKKEN.includes(bak)) return getal((c.volWerkbak || {})[bak]);
    if (bak === 'TBA' || bak === 'TBB') return getal((c.volTussenbak || {})[bak]);
    if (bak === 'ZB') return getal(c.volZuurbak);
    const m = /^SP([1-5])$/.exec(bak || ''); if (m) { const vs = c.volSporenbak || []; const i = Number(m[1]) - 1; return i < vs.length ? getal(vs[i]) : null; }
    return null;
  }
  function toetsConfig(d, huidig, mach) {
    if (mach) { const modus = mach.modus; if (!['IDLE', 'INIT', 'FAULT', 'SAFE'].includes(modus) || mach.doseerkring) return [423, 190, 'de machine is niet in rust (modus ' + modus + ')', 0]; }
    if (huidig && d.basisVersie !== huidig.versie) return [409, 191, 'de configuratie in de PLC is intussen gewijzigd (nu versie ' + huidig.versie + ')', 0];
    const nM = d.aantalMeststof, nS = d.aantalSporenbak;
    if (!(isInt(nM) && nM >= 3 && nM <= 20 && isInt(nS) && nS >= 0 && nS <= 5)) return [400, 192, 'aantal mestbakken 3 tot 20, sporenbakken 0 tot 5', 0];
    const m = machine();
    if (nM > m.hwMest || nS > m.hwSporen) return [400, 192, 'meer bakken dan de IO-mapping heeft (' + m.hwMest + ' mestbakken, ' + m.hwSporen + ' sporenbakken)', 0];
    const namen = new Set();
    for (const n of actief(d)) {
      const b = bronVan(d, n) || {}; const naam = String(b.naam || '').trim();
      if (!naam || naam.length > 20 || namen.has(naam.toLowerCase())) return [400, 195, 'bron ' + n + ': naam ontbreekt, is langer dan 20 tekens of staat er al', n];
      namen.add(naam.toLowerCase());
      if (!GROEPEN.includes(b.groep)) return [400, 193, 'bron ' + n + ' (' + naam + ') heeft geen groep', n];
      const t = b.lektestS; if (!(isInt(t) && t >= 5 && t <= 45)) return [400, 194, 'bron ' + n + ' (' + naam + '): lektest 5 tot 45 s', n];
    }
    if (!GROEPEN.includes(d.zuurbakGroep)) return [400, 193, 'de zuurbak heeft geen groep', 0];
    const vs = Array.isArray(d.volSporenbak) ? d.volSporenbak : [];
    const inhoud = [d.volReferentie, d.volZuurbak].concat(WERKBAKKEN.map(b => (d.volWerkbak || {})[b]));
    for (let s = 1; s <= nS; s++) inhoud.push(vs.length >= s ? vs[s - 1] : null);
    inhoud.push((d.volTussenbak || {}).TBA, (d.volTussenbak || {}).TBB);
    if (!inhoud.every(v => isGetal(v) && v > 0)) return [400, 196, 'een inhoud kan niet (leeg, 0 of minder)', 0];
    const batch = d.volBatch, kl = Math.min(d.volTussenbak.TBA, d.volTussenbak.TBB);
    if (!(isGetal(batch) && batch >= BATCH_MIN && batch <= kl)) return [400, 197, 'het batchvolume (' + batch + ' L) moet tussen ' + BATCH_MIN + ' L en de kleinste tussenbak (' + kl + ' L) liggen', 0];
    return null;
  }

  /* ---------------- de instellingen ---------------- */
  function perBronUitvouwen(ins) {
    const m = machine();
    PER_BRON.forEach(naam => {
      const x = ins[naam];
      if (isObj(x) && 'v' in x) { const mx = Math.max.apply(null, m.bronNummers); ins[naam] = Array.from({ length: mx }, (_, i) => m.bronNummers.includes(i + 1) ? kopie(x) : null); }
    });
  }
  function instellingenNu() {
    const ins = kopie(ONTWERP_WAARDEN);
    meng(ins, kopie(STAND.instellingen || {}));
    perBronUitvouwen(ins);
    meng(ins, S.wijzigingen);
    return ins;
  }
  const grenzenNu = () => kopie(GRENZEN);
  const pulsGewicht = kal => { const v = (kal || {}).pulsGewicht; return isGetal(v) && v > 0 ? v : PULS_ONTWERP; };
  const isFoutcode = raw => isGetal(raw) && [0x8001, 0x8002].includes(Math.trunc(raw) & 0xFFFF);

  /* ---------------- de kalibratie ---------------- */
  function toetsKal(d, huidig, mach) {
    const modus = mach.modus;
    if (!['IDLE', 'INIT', 'FAULT', 'SAFE'].includes(modus) || mach.doseerkring) return [423, 200, 'de machine is niet in rust (modus ' + modus + '): ijken kan alleen in rust', null];
    if (d.basisVersie !== huidig.versie) return [409, 201, 'de kalibratie in de PLC is intussen gewijzigd (nu versie ' + huidig.versie + ')', null];
    if (d.soort === 'flowmeter') {
      const v = d.pulsGewicht;
      if (!(isGetal(v) && v >= 1 / 315 && v <= 1 / 200)) return [400, 202, 'het pulsgewicht ligt buiten 200 tot 315 pulsen per liter', null];
      return null;
    }
    if (d.soort === 'niveau') {
      const ref = d.sensor;
      if (!componenten().some(c => c.ref === ref && c.soort === 'Niveausensor')) return [400, 203, 'onbekende niveaumeting ' + ref, ref];
      const rn = d.rawNul, rt = d.rawTop, ln = d.literNul, lt = d.literTop;
      if (![rn, rt, ln, lt].every(isGetal)) return [400, 203, 'nulpunt en toppunt: ruw en liters invullen', ref];
      if (isFoutcode(rn) || isFoutcode(rt)) return [400, 204, 'een ruwe waarde is een foutcode van de module (open klem of boven het bereik)', ref];
      if (rt - rn < 1000 || !(lt > ln)) return [400, 203, 'nul en top liggen te dicht bij elkaar, of het toppunt ligt niet boven het nulpunt', ref];
      const cap = inhoudVan(S.CONFIG, ref.split('-').slice(1).join('-'));
      if (ln < 0 || (cap && lt > cap)) return [400, 205, 'de liters liggen buiten 0 tot de inhoud van de bak (' + cap + ' L)', ref];
      return null;
    }
    return [400, 203, 'onbekende soort kalibratie', null];
  }

  /* ---------------- het rekenmodel: dezelfde regel als het dashboard (rbReken) ---------------- */
  function minSpoel(m, n) { const s = (m || {}).minS; if (isGetal(s)) return s; if (isObj(s)) { const v = s[String(n)]; return isGetal(v) ? v : null; } return null; }
  function rekenRecept(stappen, water, bedragen, m) {
    const r = rbReken(stappen, water, bedragen, m);
    if (!r) return null;
    return { stof: r.stofL, somStof: r.somStof, water: r.w, somWater: r.somW, totaal: r.totaal, teVeel: r.teVeel, vrij: r.vrij, nAuto: r.nAuto, teLaag: r.teLaag, past: r.past };
  }
  function matenNu(bak, ins) {
    ins = ins || instellingenNu();
    const sp = ins.P_VolSpoel; let minS;
    if (Array.isArray(sp)) { minS = {}; sp.forEach((x, i) => { if (getal(x) !== null) minS[String(i + 1)] = getal(x); }); if (!Object.keys(minS).length) minS = null; }
    else minS = getal(sp);
    return { batch: getal((S.CONFIG || {}).volBatch), minV: getal(ins.P_VolVoorwater), minS, ref: getal((S.CONFIG || {}).volReferentie), cap: inhoudVan(S.CONFIG, 'TB' + bak[0]), tb: 'TB' + bak[0] };
  }
  function receptenNu() {
    const r = kopie(STAND.recepten || {});
    Object.keys(S.receptWijzigingen).forEach(bak => { const lijst = r[bak] || (r[bak] = []); Object.keys(S.receptWijzigingen[bak]).forEach(n => { n = Number(n); while (lijst.length < n) lijst.push(null); lijst[n - 1] = kopie(S.receptWijzigingen[bak][n]); }); });
    return r;
  }
  function telerWaarden(rec, bak, stappen) { const lijst = (rec || {})[bak] || []; return stappen.map(n => n <= lijst.length ? (getal(lijst[n - 1]) || 0) : 0); }
  function balans(s) {
    if (!S.RECEPTOPBOUW) return null;
    const L1 = v => Math.round(v * 10) / 10; const uit = {};
    WERKBAKKEN.forEach(bak => {
      const rb = S.RECEPTOPBOUW[bak]; if (!isObj(rb) || !Array.isArray(rb.stappen)) return;
      const r = rekenRecept(rb.stappen, rb.water || [], telerWaarden(s.recepten, bak, rb.stappen), matenNu(bak, s.instellingen));
      if (!r) return;
      uit[bak] = { batch: L1(r.totaal - r.teVeel), stoffen: r.stof.map(L1), water: r.water.map(L1), somStof: L1(r.somStof), somWater: L1(r.somWater), vrij: L1(r.vrij), teVeel: L1(r.teVeel), past: r.past };
      if (!r.past) uit[bak].reden = r.teVeel > 0 ? (r.teVeel.toFixed(1) + ' L te veel voor het batchvolume') : 'een vaste waterportie ligt onder zijn minimum';
    });
    return uit;
  }
  function toetsReceptopbouw(d, huidig) {
    huidig = huidig || {};
    if (d.basisVersie !== huidig.versie) return [409, 211, 'het recept van ' + d.bak + ' in de PLC is intussen gewijzigd (nu versie ' + huidig.versie + ')'];
    const bak = d.bak; if (!WERKBAKKEN.includes(bak)) return [400, 212, 'onbekende bak ' + bak + ': de receptopbouw geldt voor de werkbakken A1 tot B3'];
    const st = d.stappen, wa = d.water, sd = d.standaard; const act = new Set(actief(S.CONFIG));
    if (!Array.isArray(st) || st.length > 20 || !st.every(isInt) || new Set(st).size !== st.length) return [400, 213, 'de stappen kloppen niet (hoogstens 20, elke stof één keer)'];
    for (const n of st) {
      if (!act.has(n)) return [400, 213, 'bron ' + n + ' is niet in gebruik'];
      const b = bronVan(S.CONFIG, n) || {};
      if (!past(b.groep, groepBak(S.CONFIG, bak))) return [400, 214, (b.naam || 'bron ' + n) + ' (' + naamGroep(b.groep) + ') past niet in ' + bak + ' (groep ' + naamGroep(groepBak(S.CONFIG, bak)) + ')'];
    }
    const m = matenNu(bak);
    if (!Array.isArray(wa) || wa.length !== st.length + 1 || wa[wa.length - 1] !== null) return [400, 215, 'het water moet ' + (st.length + 1) + ' porties hebben, en de laatste is de rest'];
    for (let i = 0; i < wa.length - 1; i++) { const v = wa[i]; const mi = i === 0 ? m.minV : minSpoel(m, st[i - 1]); if (v !== null && (!isGetal(v) || (isGetal(mi) && v < mi))) return [400, 215, 'waterportie ' + i + ' ligt onder zijn minimum (' + mi + ' L)']; }
    if (!isObj(sd)) return [400, 217, 'de standaard ontbreekt'];
    const ref = m.ref || 0;
    for (const n of st) { const v = sd[String(n)]; if (!isGetal(v) || v < 0 || (ref && v > ref)) return [400, 217, 'de standaard van bron ' + n + ' ligt buiten 0 tot ' + ref + ' L per 1000 L']; }
    const r = rekenRecept(st, wa, st.map(n => sd[String(n)]), m);
    if (!r) return [400, 216, 'de PLC mist het batchvolume, de minima of het referentievolume'];
    if (!r.past) return [400, 216, 'de standaard past niet: ' + r.teVeel.toFixed(1) + ' L te veel'];
    if (!d.ookTeler) {
      const rec = receptenNu(); const oud = ((S.RECEPTOPBOUW || {})[bak] || {}).stappen || [];
      const tw = st.map(n => oud.includes(n) ? telerWaarden(rec, bak, [n])[0] : sd[String(n)]);
      const r2 = rekenRecept(st, wa, tw, m);
      if (!r2 || !r2.past) return [400, 216, 'met de liters van de teler past het niet (' + (((r2 || {}).teVeel) || 0).toFixed(1) + ' L te veel); zet ze op de standaard'];
    }
    return null;
  }

  /* ---------------- de momentopname ---------------- */
  function modulesUit(klem, afwijking) {
    const uit = [];
    MACHINE.modules.forEach((m, i0) => {
      const i = i0 + 1;
      const ks = kanalen().filter(k => k.bp === m.bp && k.slot === m.slot).sort((a, b) => a.ch - b.ch);
      const voor = { DI: 'IN', DO: 'OUT' }[m.type] || 'UI';
      let mod = { slot: i, naam: m.module, artikel: m.art, soort: m.type, kanalen: m.kanalen, onbekend: false, diag: [], leeftijdSec: 0,
        kanalen_live: ks.map(k => ({ naam: voor + String(k.ch).padStart(2, '0'), ch: k.ch, waarde: klem[k.sleutel] === undefined ? null : klem[k.sleutel], richting: (k.type === 'DO' || k.type === 'AO') ? 'uit' : 'in' })) };
      if (String(i) in afwijking) { const anders = afwijking[String(i)]; if (anders === null) return; mod = Object.assign({}, anders, { slot: i, onbekend: !!anders.onbekend, diag: anders.diag || [], kanalen_live: [] }); }
      uit.push(mod);
    });
    return uit;
  }
  function inGebruik(bak) {
    if (WERKBAKKEN.includes(bak) || bak === 'ZB') return true;
    const m = /^SP([1-5])$/.exec(bak || ''); return !!m && S.CONFIG !== null && actief(S.CONFIG).includes(SPOREN_START + Number(m[1]));
  }
  function momentopname() {
    const extra = standExtra(); const hmi = sim().hmi();
    /* de klemmen: wat de PLC stuurt (uitgangen) en wat de machine meldt (ingangen), allebei uit de nabootsing */
    const klem = {}; kanalen().forEach(k => { klem[k.sleutel] = (k.type === 'DO' || k.type === 'DI') ? false : 0; });
    Object.assign(klem, ENGINE.uitgangen, ENGINE.ingangen);
    const waarden = {};
    componenten().forEach(c => {
      if (c.soort === 'Niveausensor') waarden[c.ref] = { v: 0.0, u: 'L' };
      else if (['Niveauschakelaar', 'Bedrijfsmelding', 'Storingsmelding', 'Drukschakelaar'].includes(c.soort)) { const k = c.io && c.io.length ? genKanaal(c.io[0]) : null; waarden[c.ref] = { v: k ? !!klem[k] : false }; }
    });
    waarden.FC01 = { v: hmi.flowLpm, u: 'l/min' };   // wat de PLC uit de pulsen rekent, met zijn pulsgewicht
    waarden.FCS1 = { v: hmi.hz, u: 'Hz' };           // het setpoint dat de PLC stuurt
    const s = { versie: 1, ts: nu(),
      bridge: { bron: 'nabootsing', bronNaam: 'de machine en de PLC nagebootst in je browser', plcOk: true, plcDraait: null, plcToestand: 'nabootsing', statusAgeSec: 0 },
      systeem: { gemeten: false, reden: GEEN_CONTROLLER }, controller: { gemeten: false, reden: GEEN_CONTROLLER },
      machine: hmi.machine, waarden, instellingen: kopie(ONTWERP_WAARDEN), grenzen: grenzenNu() };
    const rest = {}; Object.keys(extra).forEach(k => { if (!['events', 'beurten', 'kanalen', 'bus', 'configuratie', 'kalibratie', 'waarden', 'machine', 'mengers'].includes(k) && !k.startsWith('_')) rest[k] = extra[k]; });
    meng(s, rest);
    if (S.CONFIG !== null) { const c = kopie(S.CONFIG); c.geldig = toetsConfig(S.CONFIG) === null; c.resultaat = Object.assign({}, S.RESULTAAT); c.leiding = hmi.machine.leiding || 'schoon'; s.configuratie = c; }   // wat de PLC uit de pulsen weet, niet wat de machine echt heeft
    if (S.RECEPTOPBOUW !== null) s.receptopbouw = Object.assign(kopie(S.RECEPTOPBOUW), { resultaat: Object.assign({}, S.RB_RESULTAAT) });
    delete s.volgorde;
    perBronUitvouwen(s.instellingen); meng(s.instellingen, S.wijzigingen);
    const nl = s.instellingen.P_VolNaloop;   // de geleerde naloop komt van de PLC [doc §9.1: automatisch]
    if (Array.isArray(nl)) Object.keys(hmi.naloop).forEach(n => { const i = Number(n) - 1; if (nl[i]) nl[i] = { v: Math.round(hmi.naloop[n] * 100) / 100, u: 'L' }; });
    Object.keys(S.receptWijzigingen).forEach(bak => { const lijst = (s.recepten = s.recepten || {})[bak] || (s.recepten[bak] = []); Object.keys(S.receptWijzigingen[bak]).forEach(n => { n = Number(n); while (lijst.length < n) lijst.push(null); lijst[n - 1] = kopie(S.receptWijzigingen[bak][n]); }); });
    s.balans = balans(s);
    const kal = kopie(S.KAL); const kalRes = Object.assign({}, S.KAL_RESULTAAT);
    if (kal !== null) {
      componenten().forEach(c => {
        if (c.soort !== 'Niveausensor') return;
        const k = genKanaal(c.io[0]); const raw = k ? (hmi.niveauRuw && typeof hmi.niveauRuw[k] === 'number' ? hmi.niveauRuw[k] : klem[k]) : null; const ij = (kal.niveau || {})[c.ref];   // de liters van de PLC: het gemiddelde signaal; Live I/O toont de losse meting
        if (!isGetal(raw)) return;
        if (isFoutcode(raw)) s.waarden[c.ref] = { v: 0, u: 'L', q: 'bad' };
        else if (ij && ij.datum && ij.rawTop !== ij.rawNul) s.waarden[c.ref] = { v: Math.round((ij.literNul + (raw - ij.rawNul) * (ij.literTop - ij.literNul) / (ij.rawTop - ij.rawNul)) * 10) / 10, u: 'L' };
        else delete s.waarden[c.ref];
      });
      s.kalibratie = Object.assign(kal, { resultaat: kalRes });
    }
    s.mengers = hmi.mengers;
    s.modules = modulesUit(klem, extra.bus || {});
    s.axioSamenstelling = { bron: 'nabootsing: afgeleid uit de IO-mapping, niet van een controller gelezen', gemeten: true };
    return s;
  }
  const GEEN_CONTROLLER = 'nabootsing: er is geen controller. Identiteit, stand, gezondheid en het statusregister van de bus komen alleen van een echte controller.';
  function events() { return sim().hmi().events.map(e => { const x = Object.assign({}, e); if (S.acks[x.id]) x.ackTs = S.acks[x.id]; return x; }); }

  /* ---------------- inloggen: zoals brug 0.5, met Bediening open ---------------- */
  function sessie(verleng) {
    let s = null; try { s = JSON.parse(sessionStorage.getItem(SLEUTEL_SESSIE) || 'null'); } catch (_) { }
    if (!s) return null;
    const t = Date.now();
    if (t - s.laatst > STIL_MAX_MS) { sessionStorage.removeItem(SLEUTEL_SESSIE); return null; }
    if (verleng !== false) { s.laatst = t; try { sessionStorage.setItem(SLEUTEL_SESSIE, JSON.stringify(s)); } catch (_) { } }
    return s;
  }
  const bedieningOpen = () => !('bediening' in S.WACHTWOORD);
  function wie(verleng) { const s = sessie(verleng); if (!s && bedieningOpen()) return { niveau: 'bediening', open: true }; return s; }
  function sessieInfo() {
    const s = wie(false); const open = !!(s && s.open);
    return { niveau: s ? s.niveau : null, open, verlooptS: s && !open ? Math.trunc((s.laatst + STIL_MAX_MS - Date.now()) / 1000) : null,
      ingesteld: Object.fromEntries(NIVEAUS.map(n => [n, n in S.WACHTWOORD])), bedieningOpen: bedieningOpen(), eersteKeer: !('configuratie' in S.WACHTWOORD) };
  }
  function nieuweSessie(niveau) { const t = Date.now(); try { sessionStorage.setItem(SLEUTEL_SESSIE, JSON.stringify({ niveau, begin: t, laatst: t })); } catch (_) { } }
  function audit(niveau, wat, ok, code) { S.AUDIT.push({ ts: nu(), niveau, ip: 'browser', wat: String(wat).slice(0, 300), ok: !!ok, code: code === undefined ? null : code }); S.AUDIT = S.AUDIT.slice(-1000); bewaar(); }
  function login(d) {
    const niveau = d.niveau, ww = d.wachtwoord;
    if (!NIVEAUS.includes(niveau) || typeof ww !== 'string') return json(400, { ok: false, fout: 'niveau en wachtwoord invullen' });
    const p = POGINGEN[niveau] || { fout: 0, tot: 0 }; const wacht = Math.trunc((p.tot - Date.now()) / 1000);
    if (wacht > 0) return json(423, { ok: false, fout: 'te veel foute pogingen; probeer het over ' + wacht + ' s opnieuw', wachtS: wacht });
    if (!(niveau in S.WACHTWOORD)) return json(409, { ok: false, fout: 'voor ' + niveau + ' is nog geen wachtwoord ingesteld', geenWachtwoord: true });
    const goed = S.WACHTWOORD[niveau] === ww;
    if (goed) delete POGINGEN[niveau]; else { p.fout += 1; POGINGEN[niveau] = p.fout >= POGINGEN_MAX ? { fout: 0, tot: Date.now() + BLOKKEER_MS } : p; }
    audit(niveau, 'inloggen', goed);
    if (!goed) return json(401, { ok: false, fout: 'het wachtwoord klopt niet' });
    nieuweSessie(niveau);
    return json(200, { ok: true, niveau });
  }
  function logout() { const s = sessie(false); if (s) { sessionStorage.removeItem(SLEUTEL_SESSIE); audit(s.niveau, 'uitloggen', true); } return json(200, { ok: true }); }
  function wachtwoord(d) {
    const niveau = d.niveau, nieuw = d.nieuw;
    if (!NIVEAUS.includes(niveau) || typeof nieuw !== 'string') return json(400, { ok: false, fout: 'niveau en nieuw wachtwoord invullen' });
    const eerste = niveau === 'configuratie' && !('configuratie' in S.WACHTWOORD); const s = sessie();
    if (!eerste && (!s || s.niveau !== 'configuratie')) return json(401, { ok: false, fout: 'log eerst in als configuratie', nodig: 'configuratie' });
    if (nieuw.length < MIN_LENGTE[niveau]) return json(400, { ok: false, fout: 'minstens ' + MIN_LENGTE[niveau] + ' tekens' });
    S.WACHTWOORD[niveau] = nieuw;
    if (s && s.niveau === niveau && !eerste) { /* wie op dat niveau zat, logt opnieuw in: hier alleen de eigen sessie */ }
    audit(s ? s.niveau : null, 'wachtwoord ' + niveau + (eerste ? ' (eerste keer)' : ''), true);
    if (eerste) nieuweSessie('configuratie');
    bewaar();
    return json(200, { ok: true });
  }

  /* ---------------- de opdrachten ---------------- */
  function machineNu() { return sim().hmi().machine; }
  function instelling(d) {
    const naam = d.naam, index = d.index, w = d.waarde; const m = machine();
    if (typeof naam !== 'string' || !naam.startsWith('P_')) return json(400, { ok: false, fout: 'onbekende instelling' });
    if (naam === 'P_VolNaloop' || naam === 'P_PulsGewicht') return json(400, { ok: false, fout: naam + ' wijzig je niet hier' });
    if (naam === 'P_VolBatch') return json(400, { ok: false, fout: 'het batchvolume staat sinds 22-09 in de configuratie (volBatch)' });
    if (naam === 'P_TussenbakVanBak') { if (w !== 'A' && w !== 'B') return json(400, { ok: false, fout: 'kies A of B' }); }
    else {
      if (!isGetal(w)) return json(400, { ok: false, fout: 'geen getal' });
      const g = grenzenNu()[naam]; if (g && !(g.min <= w && w <= g.max)) return json(400, { ok: false, fout: 'buiten de grenzen ' + g.min + ' - ' + g.max });
    }
    if (naam in m.perBak) {
      if (!m.perBak[naam].includes(index)) return json(400, { ok: false, fout: naam + ' bestaat niet voor bak ' + index });
      if (m.sporen.includes(index) && !inGebruik(index)) return json(400, { ok: false, fout: 'sporenbak ' + index + ' is niet in gebruik (configuratie)' });
    }
    if (PER_BRON.includes(naam)) {
      const n = isInt(index) || /^\d+$/.test(String(index)) ? Number(index) : null;
      if (n === null || !actief(S.CONFIG).includes(n)) return json(400, { ok: false, fout: naam + ': bron ' + index + ' is niet in gebruik (configuratie)' });
      if (!(w >= 0)) return json(400, { ok: false, fout: 'een volume kan niet onder 0' });
    }
    const eenheid = { P_NivStart: '%', P_NivRoerderAan: '%', P_VolBak: 'L', P_TijdLektest: 's', P_TijdPomp: 's', P_VolSpoel: 'L', P_VolFijn: 'L', P_TijdRoerderAan: 'min', P_TijdRoerderRust: 'min', P_TijdRoerderNaVullen: 'min' }[naam] || '';
    if (index === null || index === undefined || index === '') S.wijzigingen[naam] = { v: w, u: eenheid };
    else if (isInt(index) || /^\d+$/.test(String(index))) { const lijst = Array.isArray(S.wijzigingen[naam]) ? S.wijzigingen[naam] : []; const i = Number(index) - 1; while (lijst.length <= i) lijst.push(null); lijst[i] = { v: w, u: eenheid }; S.wijzigingen[naam] = lijst; }
    else { if (!isObj(S.wijzigingen[naam])) S.wijzigingen[naam] = {}; S.wijzigingen[naam][String(index)] = { v: w, u: eenheid }; }
    bewaar();
    return json(200, { ok: true });
  }
  function recept(d) {
    const bak = d.bak; const m = machine(); let waarden;
    if (isObj(d.waarden)) { waarden = {}; for (const k of Object.keys(d.waarden)) { const n = Number(k); if (!isInt(n)) return json(400, { ok: false, fout: 'de waarden kloppen niet' }); waarden[n] = d.waarden[k]; } }
    else waarden = { [d.n]: d.waarde };
    if (!m.receptBakken.includes(bak)) return json(400, { ok: false, fout: 'onbekende bak' });
    const c = S.CONFIG; const act = actief(c);
    if (m.sporen.includes(bak) && !act.includes(SPOREN_START + Number(bak.slice(2)))) return json(400, { ok: false, fout: 'deze sporenbak is niet in gebruik' });
    for (const ns of Object.keys(waarden)) {
      const n = Number(ns), w = waarden[ns];
      if (!isInt(n) || !act.includes(n)) return json(400, { ok: false, fout: 'bron ' + ns + ' is niet in gebruik' });
      if (!WERKBAKKEN.includes(bak) && n > SPOREN_START) return json(400, { ok: false, fout: 'een sporenbak is geen grondstof voor de zuurbak of een sporenbak' });
      const b = bronVan(c, n) || {};
      if (!past(b.groep, groepBak(c, bak))) return json(400, { ok: false, fout: (b.naam || 'bron ' + n) + ' (' + naamGroep(b.groep) + ') past niet in ' + bak + ' (groep ' + naamGroep(groepBak(c, bak)) + ')' });
      if (!isGetal(w) || w < 0) return json(400, { ok: false, fout: 'geen geldig getal (0 of meer)' });
    }
    const rb = WERKBAKKEN.includes(bak) ? (S.RECEPTOPBOUW || {})[bak] : null;
    if (isObj(rb) && Array.isArray(rb.stappen)) {
      const buiten = Object.keys(waarden).map(Number).filter(n => !rb.stappen.includes(n));
      if (buiten.length) { S.RB_RESULTAAT = { teller: S.RB_RESULTAAT.teller + 1, code: 218, bak }; bewaar(); return json(400, { ok: false, code: 218, fout: 'bron ' + buiten[0] + ' staat niet in het recept van de service' }); }
      const nieuw = telerWaarden(receptenNu(), bak, rb.stappen);
      rb.stappen.forEach((n, k) => { if (n in waarden) nieuw[k] = Number(waarden[n]); });
      const r = rekenRecept(rb.stappen, rb.water || [], nieuw, matenNu(bak));
      if (!r || !r.past) { S.RB_RESULTAAT = { teller: S.RB_RESULTAAT.teller + 1, code: 216, bak }; bewaar(); const tv = (r || {}).teVeel || 0; return json(400, { ok: false, code: 216, teVeel: Math.round(tv * 10) / 10, fout: 'past niet: ' + tv.toFixed(1) + ' L te veel; verlaag eerst iets in liters' }); }
    }
    Object.keys(waarden).forEach(n => { (S.receptWijzigingen[bak] = S.receptWijzigingen[bak] || {})[n] = { v: waarden[n], u: 'L/1000 L' }; });
    bewaar();
    return json(200, { ok: true });
  }
  function receptopbouw(d) {
    if (!isObj(d)) return json(400, { ok: false, fout: 'geen receptopbouw' });
    if (S.RECEPTOPBOUW === null) return json(501, { ok: false, fout: 'nabootsing: er staat geen receptopbouw in stand.json', ontbreekt: true });
    const huidig = isObj(S.RECEPTOPBOUW[d.bak]) ? S.RECEPTOPBOUW[d.bak] : {};
    const fout = toetsReceptopbouw(d, huidig); S.RB_RESULTAAT.teller += 1;
    if (fout) { S.RB_RESULTAAT.code = fout[1]; S.RB_RESULTAAT.bak = d.bak || ''; bewaar(); return json(fout[0], { ok: false, fout: fout[2], code: fout[1] }); }
    const bak = d.bak; const oud = (S.RECEPTOPBOUW[bak] || {}).stappen || []; const st = d.stappen.map(Number);
    const versie = ((S.RECEPTOPBOUW[bak] || {}).versie || 0) + 1;
    S.RECEPTOPBOUW[bak] = { versie, stappen: st, water: d.water.map(v => v === null ? null : Number(v)), standaard: Object.fromEntries(st.map(n => [String(n), Number(d.standaard[String(n)])])) };
    oud.forEach(n => { if (!st.includes(n)) (S.receptWijzigingen[bak] = S.receptWijzigingen[bak] || {})[n] = { v: 0, u: 'L/1000 L' }; });
    st.forEach(n => { if (d.ookTeler || !oud.includes(n)) (S.receptWijzigingen[bak] = S.receptWijzigingen[bak] || {})[n] = { v: Number(d.standaard[String(n)]), u: 'L/1000 L' }; });
    S.RB_RESULTAAT.code = 0; S.RB_RESULTAAT.bak = ''; bewaar();
    return json(200, { ok: true, versie });
  }
  function configuratie(d) {
    if (!isObj(d)) return json(400, { ok: false, fout: 'geen configuratie' });
    const fout = toetsConfig(d, S.CONFIG || { versie: null }, machineNu()); S.RESULTAAT.teller += 1;
    if (fout) { S.RESULTAAT.code = fout[1]; S.RESULTAAT.bron = fout[3]; bewaar(); return json(fout[0], { ok: false, fout: fout[2], code: fout[1], bron: fout[3] }); }
    const oud = new Set(actief(S.CONFIG)); const versie = ((S.CONFIG || {}).versie || 0) + 1;
    const nieuw = {}; ['aantalMeststof', 'aantalSporenbak', 'zuurbakGroep', 'volReferentie', 'volBatch', 'volWerkbak', 'volTussenbak', 'volZuurbak', 'volSporenbak'].forEach(k => { nieuw[k] = kopie(d[k]); });
    nieuw.versie = versie;
    nieuw.bronnen = actief(d).map(n => { const b = bronVan(d, n); return { nr: n, naam: String(b.naam).trim(), groep: b.groep, lektestS: b.lektestS }; });
    const weg = [...oud].filter(n => !actief(d).includes(n)).sort((a, b) => a - b);
    weg.forEach(n => { machine().receptBakken.forEach(bak => { (S.receptWijzigingen[bak] = S.receptWijzigingen[bak] || {})[n] = { v: 0, u: 'L/1000 L' }; }); });
    if (weg.length && S.RECEPTOPBOUW) {
      WERKBAKKEN.forEach(bak => {
        const rb = S.RECEPTOPBOUW[bak]; if (!isObj(rb) || !Array.isArray(rb.stappen)) return;
        const wa = (rb.water || Array(rb.stappen.length + 1).fill(null)).slice();
        for (let k = rb.stappen.length - 1; k >= 0; k--) if (weg.includes(rb.stappen[k])) { rb.stappen.splice(k, 1); wa.splice(k + 1, 1); }
        wa[wa.length - 1] = null; rb.water = wa;
        weg.forEach(n => { if (rb.standaard) delete rb.standaard[String(n)]; });
        rb.versie = (rb.versie || 0) + 1;
      });
    }
    S.CONFIG = nieuw; S.RESULTAAT.code = 0; S.RESULTAAT.bron = 0; bewaar();
    return json(200, { ok: true, versie });
  }
  function kalibratie(d) {
    if (!isObj(d)) return json(400, { ok: false, fout: 'geen kalibratie' });
    if (S.KAL === null) return json(501, { ok: false, fout: 'nabootsing: er staat geen kalibratie in stand.json', ontbreekt: true });
    const fout = toetsKal(d, S.KAL, machineNu()); S.KAL_RESULTAAT.teller += 1;
    if (fout) { S.KAL_RESULTAAT.code = fout[1]; S.KAL_RESULTAAT.sensor = fout[3] || 0; bewaar(); return json(fout[0], { ok: false, fout: fout[2], code: fout[1], sensor: fout[3] }); }
    const nuD = new Date(); const datum = Number(nuD.toISOString().slice(0, 10).replace(/-/g, ''));
    S.KAL.versie = (S.KAL.versie || 0) + 1;
    if (d.soort === 'flowmeter') { S.KAL.pulsGewicht = Number(d.pulsGewicht); S.KAL.pulsDatum = datum; }
    else { (S.KAL.niveau = S.KAL.niveau || {})[d.sensor] = { rawNul: Math.round(d.rawNul), literNul: Number(d.literNul), rawTop: Math.round(d.rawTop), literTop: Number(d.literTop), datum }; }
    S.KAL_RESULTAAT.code = 0; S.KAL_RESULTAAT.sensor = 0; bewaar();
    return json(200, { ok: true, versie: S.KAL.versie });
  }

  /* ---------------- de adviesbladen: alleen in het geheugen ---------------- */
  const adviesMeta = a => ({ id: a.id, naam: a.naam, grootte: a.grootte, datum: a.datum, niveau: a.niveau });
  function adviesLijst() {
    const uit = {}; let gebruikt = 0;
    Object.keys(ADVIES).forEach(b => { const l = ADVIES[b]; uit[b] = { actueel: l.length ? adviesMeta(l[0]) : null, eerder: l.slice(1).map(adviesMeta) }; l.forEach(a => { gebruikt += a.grootte; }); });
    return { bakken: uit, gebruikt, max: ADVIES_MAX_TOTAAL, maxBestand: ADVIES_MAX_BESTAND };
  }
  function adviesZoek(id) { for (const b of Object.keys(ADVIES)) for (const a of ADVIES[b]) if (a.id === id) return [b, a]; return [null, null]; }
  function hex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, x => x.toString(16).padStart(2, '0')).join(''); }
  async function adviesPost(pad, init) {
    const delen = pad.replace(/^\/+|\/+$/g, '').split('/');
    if (delen.length === 3 && delen[2] === 'weg') {
      const s = sessie(); if (!s || RANG[s.niveau] < RANG.service) return weiger('service');
      const [bak, a] = adviesZoek(delen[1]); if (!a) return json(404, { ok: false, fout: 'dit adviesblad bestaat niet (meer)' });
      ADVIES[bak] = ADVIES[bak].filter(x => x !== a); if (blobUrls[a.id]) { URL.revokeObjectURL(blobUrls[a.id]); delete blobUrls[a.id]; }
      audit(s.niveau, 'adviesblad weg ' + bak + ' ' + a.naam, true);
      return json(200, { ok: true });
    }
    if (delen.length !== 2 || !machine().receptBakken.includes(delen[1])) return json(404, { ok: false, fout: 'onbekende bak' });
    const s = wie(); if (!s) return weiger('bediening');
    let data = init.body;
    if (data instanceof Blob) data = await data.arrayBuffer();
    if (!(data instanceof ArrayBuffer)) return json(415, { ok: false, fout: 'dit is geen pdf' });
    if (data.byteLength > ADVIES_MAX_BESTAND) return json(413, { ok: false, fout: 'het bestand is groter dan ' + (ADVIES_MAX_BESTAND / 1048576) + ' MB' });
    const kop = new Uint8Array(data.slice(0, 5)); if (String.fromCharCode.apply(null, kop) !== '%PDF-') return json(415, { ok: false, fout: 'dit is geen pdf' });
    const gebruikt = Object.values(ADVIES).flat().reduce((t, a) => t + a.grootte, 0);
    if (gebruikt + data.byteLength > ADVIES_MAX_TOTAAL) return json(507, { ok: false, fout: 'de ruimte voor adviesbladen is vol (' + (ADVIES_MAX_TOTAAL / 1048576) + ' MB); laat de service eerst oude weghalen' });
    let naam = 'advies.pdf'; try { naam = decodeURIComponent(kopVan(init, 'X-Bestandsnaam') || 'advies.pdf'); } catch (_) { }
    naam = naam.replace(/[^A-Za-z0-9 ._()+,-]/g, '_').slice(0, 120) || 'advies.pdf';
    const a = { id: hex(8), naam, grootte: data.byteLength, datum: nu(), niveau: s.niveau, blob: new Blob([data], { type: 'application/pdf' }) };
    (ADVIES[delen[1]] = ADVIES[delen[1]] || []).unshift(a);
    audit(s.niveau, 'adviesblad ' + delen[1] + ' ' + naam + ' (' + Math.max(1, Math.round((data.byteLength + 512) / 1024)) + ' kB)', true);
    return json(200, { ok: true, advies: adviesMeta(a) });
  }
  function adviesUrl(id) { const [, a] = adviesZoek(id); if (!a) return 'about:blank'; if (!blobUrls[id]) blobUrls[id] = URL.createObjectURL(a.blob); return blobUrls[id]; }

  /* ---------------- de verzoeken: fetch onderscheppen ---------------- */
  function json(code, obj) { return new Response(JSON.stringify(obj), { status: code, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
  const weiger = nodig => json(401, { ok: false, fout: 'log eerst in als ' + nodig, nodig });
  function kopVan(init, naam) {
    const h = init && init.headers; if (!h) return null;
    if (typeof h.get === 'function') return h.get(naam);
    for (const k of Object.keys(h)) if (k.toLowerCase() === naam.toLowerCase()) return h[k];
    return null;
  }
  function padVan(u) {
    let pad = String(u || '');
    try { if (/^https?:/i.test(pad)) { const x = new URL(pad); if (x.host !== location.host) return null; pad = x.pathname; } } catch (_) { return null; }
    pad = pad.split('?')[0].split('#')[0];
    if (!pad.startsWith('/')) pad = '/' + pad;
    pad = pad.replace(/^\/\.\//, '/');
    return /^\/(snapshot|events|sessie|advies|auditlog|beurten|gezond|login|logout|wachtwoord|command|ack)(\/|$)/.test(pad) ? pad : null;
  }
  async function afhandel(pad, init) {
    const methode = String((init && init.method) || 'GET').toUpperCase();
    if (methode === 'GET') {
      if (pad === '/snapshot') { const s = momentopname(); s.sessie = sessieInfo(); return json(200, s); }
      if (pad === '/sessie') return json(200, sessieInfo());
      if (pad === '/advies') return json(200, adviesLijst());
      if (pad.startsWith('/advies/')) { const [, a] = adviesZoek(pad.slice(8)); if (!a) return json(404, { ok: false, fout: 'dit adviesblad bestaat niet (meer)' }); return new Response(a.blob, { status: 200, headers: { 'Content-Type': 'application/pdf' } }); }
      if (pad === '/auditlog') { const s = wie(); if (!s || RANG[s.niveau] < RANG.service) return weiger('service'); return json(200, S.AUDIT.slice().reverse()); }
      if (pad === '/events') return json(200, events());
      if (pad === '/beurten') return json(200, sim().hmi().beurten);
      if (pad === '/gezond') return json(200, { ok: true });
      return json(404, { ok: false, fout: 'niet gevonden' });
    }
    if (kopVan(init, 'X-Bakkenvuller') !== '1') return json(403, { ok: false, fout: 'verzoek zonder kenmerk van het dashboard' });
    if (pad.startsWith('/advies/')) return adviesPost(pad, init);
    let data = {};
    try { const b = init.body; if (typeof b === 'string' && b) data = JSON.parse(b); else if (b instanceof Blob) data = JSON.parse(await b.text()); } catch (_) { return json(400, { ok: false, fout: 'geen geldige JSON' }); }
    if (!isObj(data)) return json(400, { ok: false, fout: 'verwacht een object' });
    if (pad === '/ack') { const i = String(data.id || ''); if (!sim().events.some(e => String(e.id) === i)) return json(404, { ok: false, fout: 'onbekende melding' }); S.acks[i] = nu(); bewaar(); return json(200, { ok: true }); }
    if (pad === '/login') return login(data);
    if (pad === '/logout') return logout();
    if (pad === '/sessie/verleng') { const s = wie(); return json(s ? 200 : 401, { ok: !!s }); }
    if (pad === '/wachtwoord') return wachtwoord(data);
    const nodig = NODIG[pad];
    if (nodig) {
      const s = wie();
      if (!s || RANG[s.niveau] < RANG[nodig]) { audit(s ? s.niveau : null, pad.slice(9), false, 'inlog'); return weiger(nodig); }
      const r = pad === '/command/instelling' ? instelling(data) : pad === '/command/recept' ? recept(data) : pad === '/command/configuratie' ? configuratie(data)
        : pad === '/command/kalibratie' ? kalibratie(data) : receptopbouw(data);
      const antwoord = await r.clone().json().catch(() => ({}));
      audit(s.niveau, pad.slice(9) + ' ' + JSON.stringify(data).slice(0, 200), r.status === 200, antwoord.code);
      return r;
    }
    return json(501, { ok: false, fout: 'nabootsing: deze opdracht bestaat nog niet', ontbreekt: false });
  }
  const echtFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const u = typeof input === 'string' ? input : (input && input.url) || '';
    const pad = padVan(u);
    if (pad === null) return echtFetch(input, init);
    try { return afhandel(pad, init || {}).catch(e => json(500, { ok: false, fout: 'nabootsing: ' + (e && e.message || e) })); }
    catch (e) { return Promise.resolve(json(500, { ok: false, fout: 'nabootsing: ' + (e && e.message || e) })); }
  };

  /* ---------------- opnieuw beginnen, en de koppeling voor het pdf-venster ---------------- */
  let gestopt = false;   // na 'opnieuw' niets meer bewaren: anders schrijft een tik van de nabootsing de oude stand terug vóór de pagina herlaadt
  function opnieuw() { gestopt = true; try { localStorage.removeItem(SLEUTEL); sessionStorage.removeItem(SLEUTEL_SESSIE); } catch (_) { } location.replace(location.pathname + location.hash); }
  if (/[?&]opnieuw\b/.test(location.search)) opnieuw();
  function rust(aan) { S.rust = !!aan; sim().zetAuto(!S.rust); simBewaar(); tekenKnoppen(true); if (typeof haalBron === 'function') haalBron(); }
  function kwiteer() { sim().kwiteer(); tekenKnoppen(true); }
  function afvoeren(kant) { sim(); Object.keys(ENGINE.bakken).forEach(loc => { const b = ENGINE.bakken[loc]; if (b.soort === 'tussenbak' && b.kant === kant) { b.zetVolume(0); ENGINE.melding('info', 'Tussenbak ' + kant + ' met de hand afgevoerd (knop in de nabootsing).'); } }); ENGINE._rekenIngangen(0); tekenKnoppen(true); }
  window.BV_DEEL = { adviesUrl, opnieuw, rust, kwiteer, afvoeren, zetTempo, tempo: () => tempo, sim: { engine: () => ENGINE, plc: () => sim(), def: () => DEF, DT }, versie: GEMAAKT };
  const KNOP = 'padding:8px 12px;border-radius:999px;border:1px solid #4b3fa0;background:#4b3fa0;color:#fff;font:600 12px system-ui,sans-serif;cursor:pointer;opacity:.9';
  const KNOP_LICHT = KNOP + ';background:#fff;color:#4b3fa0';
  const KNOP_ROOD = KNOP + ';background:#b3261e;border-color:#b3261e';
  let knoppenSleutel = '';
  function tekenKnoppen(altijd) {
    const fout = PLC ? PLC.fout : 0;
    const halve = PLC ? ['A', 'B'].map(k => PLC.restant[k] && PLC.restant[k].half ? k + Math.round(PLC.restant[k].liters) : '').join('') : '';
    const sleutel = [S.rust, tempo, fout, halve].join('|');
    if (!altijd && sleutel === knoppenSleutel && document.getElementById('bv-deel-knoppen')) return;
    knoppenSleutel = sleutel;
    let vak = document.getElementById('bv-deel-knoppen');
    if (!vak) { if (!document.body) return; vak = document.createElement('div'); vak.id = 'bv-deel-knoppen'; vak.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;display:flex;gap:8px;flex-wrap:wrap;align-items:center'; document.body.appendChild(vak); }
    vak.innerHTML = '';
    const knop = (tekst, stijl, titel, klik) => { const b = document.createElement('button'); b.type = 'button'; b.style.cssText = stijl; b.textContent = tekst; b.title = titel; b.onclick = klik; vak.appendChild(b); return b; };
    if (fout) knop('Storing ' + fout + ' kwiteren', KNOP_ROOD, 'De storing is verholpen (in deze nabootsing altijd): de machine weer vrijgeven, zoals de resetknop op de kast', kwiteer);
    ['A', 'B'].forEach(kant => { const r = PLC && PLC.restant[kant]; if (r && r.half) knop('Tussenbak ' + kant + ' afvoeren (' + Math.round(r.liters) + ' L)', KNOP_ROOD, 'Een halve batch neemt de machine nooit mee: in het echt voert de operator hem af; hier maakt deze knop de tussenbak leeg', function () { afvoeren(kant); }); });
    knop(S.rust ? 'Machine starten' : 'Machine stilzetten', KNOP, S.rust ? 'Automatisch bedrijf weer aan: bakken die om een vulling vragen, krijgen er een' : 'Lopende beurten afbreken, alles uit, geen nieuwe beurt: dan kun je ook Configuratie toepassen en ijken', function () { rust(!S.rust); });
    const groep = document.createElement('span'); groep.style.cssText = 'display:inline-flex;gap:2px;background:#fff;border:1px solid #4b3fa0;border-radius:999px;padding:2px';
    groep.title = 'Sneller kijken: dezelfde machine, dezelfde rekensom, alleen meer seconden per seconde';
    TEMPOS.forEach(t => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t + '×'; b.style.cssText = 'padding:5px 9px;border-radius:999px;border:0;font:600 12px system-ui,sans-serif;cursor:pointer;' + (t === tempo ? 'background:#4b3fa0;color:#fff' : 'background:transparent;color:#4b3fa0'); b.onclick = function () { zetTempo(t); }; groep.appendChild(b); });
    vak.appendChild(groep);
    knop('Opnieuw beginnen', KNOP_LICHT, 'Alles wat in deze browser is gewijzigd wissen, en de proef opnieuw beginnen met de begintoestand', function () { if (confirm('Alles wat je in deze proef hebt gewijzigd wissen, en opnieuw beginnen?')) opnieuw(); });
  }
  document.addEventListener('DOMContentLoaded', function () { tekenKnoppen(true); });
})();
