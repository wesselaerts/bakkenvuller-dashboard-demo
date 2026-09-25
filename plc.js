/* ==================================================================
   DE PLC, NAGEBOOTST IN DE BROWSER: de stappenketens (25-09-2026)
   ------------------------------------------------------------------
   Dit is wat het PLC-programma straks doet, volgens "Bakkenvuller -
   hoe de software werkt" (versie 8 en 11: de fysica en de fasetabellen
   zijn in beide gelijk) en de besluiten van Wessel van 22-09
   (naar-engineer\2026-09-22_RECEPTOPBOUW-IN-DE-PLC.md §6 en
   2026-09-22_VULLEN-EN-MENGERS-IN-DE-PLC.md §4 en §5):

   - de modusbeheerder met de doseerkring als resource   [doc §4.1, §4.3]
   - de batchbeurt, fase 0-99, twee ketens A en B        [doc §5.1, bijlage C]
   - de directe beurt voor de zuurbak en de sporenbakken [doc §5.2, figuur 4]
   - doseren in twee trappen met de geleerde naloop      [doc §6.2]
   - de pomptijd als tweede bewaking                     [doc §6.3]
   - de lektest als vrijgave                             [doc §8.2, besluit 21-09]
   - de harde regels en de foutcodes                     [doc §8.1, §8.4]
   - de aanvragen en de mengers van de sporenbakken      [besluiten 22-09]

   Hij leest de ingangen van het rekenmodel (machine.js) en schrijft
   zijn uitgangen; instellingen, configuratie, kalibratie en recepten
   krijgt hij van de nabootsing van de brug (nabootsing.js), zoals de
   echte PLC ze uit zijn geheugen haalt. Alles wat het scherm laat
   zien (modus, fase, aanvragen, mengers, meldingen, logboek) komt
   hiervandaan.

   Wat het ontwerp open laat, staat hier als [aangenomen] met de keuze;
   de lijst staat in kennisbank\6-simulatie-en-proeven\01-machine-engine.md.
   ================================================================== */
(function () {
  'use strict';
  const WERKBAKKEN = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];
  const SPOREN_START = 20;
  const T_GEEN_PULS = 3.0;      // s: pomp draait, geen pulsen → 141 [doc §8.1 'binnen enkele seconden']
  const T_STIL = 2.0;           // s zonder pulsen = 'de flowmeter staat stil' [doc bijlage C: tGeenPuls > 2.0]
  const T_KLEP = 1.0;           // s wachten tot een klep open is: er is geen terugmelding in de IO-mapping [aangenomen: looptijd 0,7 s + marge]
  const LEK_VENSTER = 2.0;      // s middelen van het niveau bij de lektest [aangenomen]
  const NALOOP_MAX = 3.0;       // L: een naloop groter dan dit is een defect, geen kalibratie [doc §6.2 'een paar liter']
  const WD = { 10: 2, 20: 180, 30: 60, 40: 10, 42: 300, 44: 180, 46: 15, 50: 180, 55: 120, 60: 1, 70: 600, 75: 600, 80: 900, 90: 60 };   // [doc §5.1]
  const WD_Z = { 10: 2, 20: 180, 30: 60, 40: 300, 45: 1, 50: 600, 60: 1, 70: 60 };   // [aangenomen: zoals de batchbeurt; Z50 vult de bak aan met water, zoals fase 70]
  const DIRECT_VUL_PCT = 90;    // een directe beurt vult tot dit percentage van de bak [aangenomen: het ontwerp noemt geen maat]
  const MENGPOMP_HZ = 0;        // (de meng-/transportpompen hebben geen frequentieregelaar)
  const LIMIT = (lo, x, hi) => Math.max(lo, Math.min(hi, x));
  const r1 = x => Math.round(x * 10) / 10;

  function Plc(def, bron) {
    this.d = def;                 // de definitie uit machine.js: rollen → klemmen
    this.bron = bron;             // {instellingen(), configuratie(), kalibratie(), recepten(), receptopbouw(), reken(...), nuIso()}
    this.opnieuw();
  }
  Plc.prototype.opnieuw = function () {
    this.t = 0.0; this.scanNr = 0;
    this.modus = 'INIT'; this.fout = 0; this.foutTekst = '';
    this.auto = true;             // automatisch bedrijf; onwaar = de operator heeft de machine stilgezet
    this.doseerkring = '';        // '' A B ZB SP1..SP5
    this.uitgangen = {}; this.d.kanalen.forEach(k => { if (k.richting === 'uit') this.uitgangen[k.id] = k.soort === 'AO' ? 0 : false; });
    this.ketens = { A: this._nieuweKeten('A'), B: this._nieuweKeten('B'), D: this._nieuweKeten('D') };
    this.aanvragen = [];          // bakken in volgorde van aanvraag
    this.restant = { A: null, B: null };   // {bak, liters}: een batch die niet helemaal in zijn werkbak paste
    this.geweigerd = {};          // bak → t van de geweigerde start (16x/17x); 10 minuten later mag hij opnieuw vragen
    this.naloop = {};             // bronnummer → geleerde naloop in L (P_VolNaloop[n])
    this.mengers = {};            // sporenbak → {stand, reden, restS, sinds, naVullen}
    this.events = []; this.eventNr = 0;
    this.beurten = []; this.beurtNr = 0;
    this.pulsVorige = null; this.pulsRate = 0.0; this.pulsStilS = 0.0; this.pulsTeller = 0;
    this.pulsVenster = [];        // [t, teller] van de laatste seconde, voor het debiet op het scherm
    this.luchtOk = true; this.pompStoring = null;
    this.reset = false;           // opgaande flank: de operator kwiteert
    this.hzDoel = 0; this.hoog = false; this.vrijgave = false;
  };
  Plc.prototype._nieuweKeten = function (k) {
    return { k, fase: 0, tFase: 0, bak: null, kant: k === 'D' ? null : k, wacht: '', n: 0, stoffen: [], porties: [], doelL: 0, geteldL: 0, pulsBegin: 0, vSchakel: 0, lekBegin: 0, lekNiveau: null, lekStilS: 0, lekT: 0, tDosering: 0, tRest: 0, start: null, restant: 0, beurtId: null, klepDichtT: 0, afgeleverd: 0, nivBegin: 0, sub: 0 };
  };

  /* ---------------- hulpjes: rollen → klemmen ---------------- */
  Plc.prototype.bakDef = function (bak) {   // 'A1' → de bak uit de definitie (onthouden: de definitie verandert niet)
    if (!this._bakDef) this._bakDef = {};
    if (bak in this._bakDef) return this._bakDef[bak];
    const soort = /^[AB][1-3]$/.test(bak) ? 'werkbak' : bak === 'ZB' ? 'zuurbak' : /^SP\d$/.test(bak) ? 'sporen' : /^TB[AB]$/.test(bak) ? 'tussenbak' : null;
    const lijst = Object.values(this.d.bakken).filter(b => b.soort === soort).sort((a, b) => a.volgorde - b.volgorde);
    let uit = null;
    if (soort === 'werkbak') uit = lijst.find(b => b.kant === bak[0] && b.naam.trim().endsWith(bak[1])) || lijst.find(b => b.naam.includes(bak)) || null;
    else if (soort === 'tussenbak') uit = lijst.find(b => b.kant === bak[2]) || null;
    else if (soort === 'sporen') uit = lijst[Number(bak.slice(2)) - 1] || null;
    else uit = lijst[0] || null;
    this._bakDef[bak] = uit; return uit;
  };
  Plc.prototype.bronDef = function (nr) {   // bronnummer → de bak uit de definitie (mestbak n = n-de voorraadtank, sporenbak s = s-de sporentank)
    if (!this._bronDef) this._bronDef = {};
    if (nr in this._bronDef) return this._bronDef[nr];
    let uit;
    if (nr === 0) uit = Object.values(this.d.bakken).find(b => b.soort === 'water') || null;
    else { const soort = nr > SPOREN_START ? 'sporen' : 'voorraad'; const i = nr > SPOREN_START ? nr - SPOREN_START - 1 : nr - 1; uit = Object.values(this.d.bakken).filter(b => b.soort === soort).sort((a, b) => a.volgorde - b.volgorde)[i] || null; }
    this._bronDef[nr] = uit; return uit;
  };
  Plc.prototype.bakNaam = function (bak) { const b = this.bakDef(bak); return b ? b.naam : bak; };
  Plc.prototype.bakVan = function (loc) { return Object.keys(this.d.bakken).includes(loc) ? loc : null; };

  /* ---------------- ingangen: liters via de kalibratie van de PLC, pulsen, schakelaars ---------------- */
  Plc.prototype.liters = function (bak, ing) {   // null = onbekend (niet geijkt, storing) [niet gemeten is niet nul]
    const b = this.bakDef(bak); if (!b || !b.sensor) return null;
    const raw = ing[b.sensor]; if (typeof raw !== 'number') return null;
    if ((raw & 0xFFFF) === 0x8001 || (raw & 0xFFFF) === 0x8002 || raw >= 32768) return null;
    const kal = this.bron.kalibratie(); const ref = 'LT-' + bak; const ij = kal && kal.niveau ? kal.niveau[ref] : null;
    if (!ij || !ij.datum || ij.rawTop === ij.rawNul) return null;
    return ij.literNul + (raw - ij.rawNul) * (ij.literTop - ij.literNul) / (ij.rawTop - ij.rawNul);
  };
  Plc.prototype.schakelaar = function (bak, hoogte, ing) { const b = this.bakDef(bak); if (!b) return null; const s = b.schakelaars.find(x => hoogte ? x[1] === hoogte : true); return s ? !!ing[s[0]] : null; };
  Plc.prototype.inhoud = function (bak) {
    const c = this.bron.configuratie(); if (!c) return null; let v = null;
    if (/^[AB][1-3]$/.test(bak)) v = c.volWerkbak && c.volWerkbak[bak]; else if (/^TB[AB]$/.test(bak)) v = c.volTussenbak && c.volTussenbak[bak]; else if (bak === 'ZB') v = c.volZuurbak;
    else { const m = /^SP([1-5])$/.exec(bak); if (m && Array.isArray(c.volSporenbak)) v = c.volSporenbak[Number(m[1]) - 1]; }
    v = Number(v); return isFinite(v) && v > 0 ? v : null;
  };
  Plc.prototype.pct = function (bak, ing) { const L = this.liters(bak, ing); const cap = this.inhoud(bak); return L === null || !cap ? null : L / cap * 100; };
  Plc.prototype.perBron = function (naam, nr) { const x = (this.bron.instellingen() || {})[naam]; if (Array.isArray(x)) { const v = x[nr - 1]; return v && typeof v === 'object' ? Number(v.v) : (typeof v === 'number' ? v : null); } return x && typeof x === 'object' && 'v' in x ? Number(x.v) : null; };
  Plc.prototype.ins = function (naam, bak) { const x = (this.bron.instellingen() || {})[naam]; if (!x) return null; if (bak !== undefined) { const y = x[bak]; return y && typeof y === 'object' ? Number(y.v) : null; } return typeof x === 'object' && 'v' in x ? Number(x.v) : null; };
  Plc.prototype.actieveBronnen = function () { const c = this.bron.configuratie(); if (!c) return []; const a = []; const nM = Math.floor(Number(c.aantalMeststof)) || 0, nS = Math.floor(Number(c.aantalSporenbak)) || 0; for (let n = 1; n <= nM; n++) a.push(n); for (let s = 1; s <= nS; s++) a.push(SPOREN_START + s); return a; };
  Plc.prototype.bronCfg = function (nr) { const c = this.bron.configuratie(); return c && Array.isArray(c.bronnen) ? (c.bronnen.find(b => b && Number(b.nr) === nr) || null) : null; };
  Plc.prototype.stofNaam = function (nr) { const b = this.bronCfg(nr); if (b && b.naam) return String(b.naam); const d = this.bronDef(nr); return d ? d.naam : 'bron ' + nr; };
  Plc.prototype.inGebruik = function (bak) { if (WERKBAKKEN.includes(bak) || bak === 'ZB') return true; const m = /^SP([1-5])$/.exec(bak); return !!m && this.actieveBronnen().includes(SPOREN_START + Number(m[1])); };
  Plc.prototype.sporenBakken = function () { const c = this.bron.configuratie(); const n = c ? Math.floor(Number(c.aantalSporenbak)) || 0 : 0; return Array.from({ length: n }, (_, i) => 'SP' + (i + 1)).filter(b => this.bakDef(b)); };

  /* ---------------- meldingen en logboek ---------------- */
  Plc.prototype.melding = function (code, sev, aud, text, extra) {
    this.eventNr += 1; extra = extra || {};
    const ts = this.bron.nuIso();
    const e = Object.assign({ id: 'plc-' + this.eventNr, code: String(code), sev, aud, text, source: 'PLC-nabootsing', ts, loc: '', cause: '', check: '' }, extra);
    if (sev === 'info') e.ackTs = ts;   // een bericht, geen melding die aandacht vraagt: staat in de lijst, telt niet mee
    this.events.push(e); if (this.events.length > 200) this.events.shift();
    return e;
  };
  Plc.prototype.storing = function (code, tekst, keten, extra) {   // een vergrendelde fout: de eerste wint [doc §8.4]
    if (code >= 160 && code < 180) return this.weiger(code, tekst, keten, extra);   // 16x en 17x: de start weigeren, niet de machine vergrendelen [doc §8.4]
    if (this.fout) return;
    this.fout = code; this.foutTekst = tekst;
    this.melding(code, 'alarm', 'op', tekst, Object.assign({ cause: (extra && extra.cause) || '', check: (extra && extra.check) || 'Kwiteer de storing na het verhelpen van de oorzaak (knop links onder).' }, extra || {}));
    Object.values(this.ketens).forEach(k => { if (k.fase && k.fase !== 99) { this.beurtKlaar(k, 'afgebroken', code); this.restantVastleggen(k); k.fase = 99; k.tFase = 0; } });
    this.doseerkring = '';
    this.modus = code >= 100 && code < 120 ? 'SAFE' : 'FAULT';
  };
  /* een afgebroken beurt: wat er in de tussenbak staat, blijft staan en wordt gemeld [doc §2.7, §8.4 10x].
     Tijdens de opbouw (fase 20-75) is het een halve batch: met de hand afvoeren, tot dan geen batch aan die kant.
     Bij het afleveren (80-90) is het een klare batch: die gaat naar dezelfde bak bij zijn volgende aanvraag. */
  Plc.prototype.restantVastleggen = function (k) {
    if (k.k === 'D' || !k.bak) return;
    const rest = this.liters('TB' + k.k, this._ing || {});
    if (rest === null || rest <= 25) return;
    const half = k.fase >= 20 && k.fase < 80;
    this.restant[k.k] = { bak: k.bak, liters: rest, half };
    if (half) this.melding('', 'warn', 'op', 'Halve batch van ' + r1(rest) + ' L in tussenbak ' + k.k + ': met de hand afvoeren. Tot de tussenbak leeg is, start er geen batch aan kant ' + k.k + '.', { check: 'Voer de tussenbak af (in deze nabootsing: de knop links onder). De machine neemt een halve batch nooit stilzwijgend mee.' });
  };
  Plc.prototype.restantBijwerken = function (ing) {   // een halve batch die is afgevoerd (tussenbak leeg tot de laag-schakelaar) is weg
    ['A', 'B'].forEach(kant => {
      const r = this.restant[kant]; if (!r || !r.half) return;
      if (this.schakelaar('TB' + kant, 'laag', ing) === false) { this.restant[kant] = null; this.melding('', 'info', 'op', 'Tussenbak ' + kant + ' is afgevoerd; kant ' + kant + ' kan weer een batch maken.'); }
    });
  };
  Plc.prototype.weiger = function (code, tekst, k, extra) {   // gift te klein, waterbalans, recept, voorraad: de beurt start niet; de bak vraagt na een poos opnieuw
    this.melding(code, 'alarm', 'op', tekst, Object.assign({ check: 'Pas het recept, de instellingen of de configuratie aan; de bak vraagt over 10 minuten opnieuw.' }, extra || {}));
    if (k) { this.geweigerd[k.bak] = this.t; this.geefKring(k); k.fase = 0; k.bak = null; k.meststof = ''; k.doelL = 0; k.geteldL = 0; k.wacht = ''; }
  };
  Plc.prototype.beurtStart = function (k, bak, recept) {
    this.beurtNr += 1;
    k.beurtId = this.beurtNr; k.start = this.bron.nuIso(); k.afgeleverd = 0;
    this.beurten.unshift({ id: k.beurtId, start: k.start, kant: k.k === 'D' ? 'direct' : k.k, werkbak: this.bakNaam(bak), recept, liters: null, status: 'loopt', fout: null });
    if (this.beurten.length > 100) this.beurten.pop();
  };
  Plc.prototype.beurtKlaar = function (k, status, code) {
    const b = this.beurten.find(x => x.id === k.beurtId); if (!b) return;
    b.status = status; b.fout = code || null; b.liters = k.k === 'D' ? r1(k.afgeleverd) : r1(k.afgeleverd || k.geteldTotaal || 0);
  };

  /* ---------------- de scan: elke dt seconden, zoals de cyclische taak ---------------- */
  Plc.prototype.scan = function (dt, ing) {
    this.t += dt; this.scanNr += 1;
    const d = this.d;
    // 0. alle uitgangen uit; alleen de eigenaar zet daarna iets aan [doc §4.1]
    if (!this._ao) { this._ao = new Set(d.kanalen.filter(x => x.soort === 'AO').map(x => x.id)); }
    Object.keys(this.uitgangen).forEach(k => { this.uitgangen[k] = this._ao.has(k) ? 0 : false; });
    this.vrijgave = false; this.hzDoel = 0; this.hoog = false;
    // 1. de flowmeter: pulsen sinds de vorige scan, en 'staat hij stil'
    const fk = d.overig.flowmeter; const teller = typeof ing[fk] === 'number' ? ing[fk] : 0;
    if (this.pulsVorige === null) this.pulsVorige = teller;
    let delta = teller - this.pulsVorige; if (delta < 0) delta += 4294967296;
    this.pulsVorige = teller; this.pulsTeller += delta;
    this.pulsStilS = delta > 0 ? 0 : this.pulsStilS + dt;
    this.pulsVenster.push([this.t, this.pulsTeller]); while (this.pulsVenster.length > 1 && this.t - this.pulsVenster[0][0] > 1.0) this.pulsVenster.shift();
    const v0 = this.pulsVenster[0]; const span = this.t - v0[0]; this.pulsRate = span > 0.2 ? (this.pulsTeller - v0[1]) / span : (delta / dt);
    // 2. veiligheid: luchtdruk (SAFE, herstelt vanzelf), pompstoringen (10x), noodstop (pomp gestuurd zonder bedrijfsmelding) [doc §8.1, §8.3, §8.4]
    const lk = d.overig.luchtdruk; const luchtLaag = lk ? !!ing[lk] : false;
    if (luchtLaag && this.modus !== 'SAFE' && this.modus !== 'INIT') this.storing(111, 'Luchtdruk laag: alles uit. Zonder perslucht kan geen klep dicht.', null, { cause: 'De drukschakelaar op de perslucht meldt laag.', check: 'Controleer de persluchtvoorziening. De machine herstelt zodra de druk terug is; de afgebroken beurt blijft in de tussenbak staan.' });
    if (this.modus === 'SAFE' && !luchtLaag && this.fout === 111) { this.fout = 0; this.foutTekst = ''; this.modus = 'IDLE'; this.melding(111, 'info', 'op', 'Luchtdruk terug: de machine staat weer in rust.', { clearedTs: this.bron.nuIso() }); Object.values(this.ketens).forEach(k => { k.fase = 0; }); }
    if (!this.bmWeg) this.bmWeg = { SYS: 0, A: 0, B: 0 };
    [['SYS', 'Systeempomp'], ['A', 'Meng-/transportpomp A'], ['B', 'Meng-/transportpomp B']].forEach(([s, naam], i) => {
      const pd = d.pompen[s]; const st = pd.storing ? !!ing[pd.storing] : false;
      if (st && this.fout === 0) this.storing(101 + i, naam + ': storingsmelding (motorbeveiliging of thermostaat).', null, { cause: 'De pomp meldt een storing terwijl de besturing hem nodig heeft.', check: 'Reset de motorbeveiliging in de kast; kwiteer daarna de storing.' });
      // commando aan terwijl de bedrijfsmelding wegblijft: noodstop of motorbeveiliging [doc v8 §8.3; IO-mapping 21-09]
      const gestuurd = s === 'SYS' ? !!this._vorigeVrijgave : !!this._vorigeUitgangen && !!this._vorigeUitgangen[pd.aan];
      const bedrijf = pd.bedrijf ? !!ing[pd.bedrijf] : true;
      this.bmWeg[s] = (gestuurd && !bedrijf) ? this.bmWeg[s] + dt : 0;
      if (this.bmWeg[s] > 2.0 && this.fout === 0) this.storing(104 + i, naam + ' is gestuurd maar meldt geen bedrijf: noodstop of motorbeveiliging.', null, { cause: 'De besturing stuurt de pomp aan, maar de bedrijfsmelding blijft weg. Buiten de PLC om is de voeding weggevallen.', check: 'Controleer de noodstop en de motorbeveiliging in de kast; kwiteer daarna. De afgebroken beurt blijft in de tussenbak staan.' });
    });
    if (this.modus === 'INIT') { if (this.t >= 1.0) this.modus = 'IDLE'; this._hmiAfronden(ing); return this.uitgangen; }
    if (this.reset) { this.reset = false; if (this.fout && this.fout !== 111) { const oud = this.fout; this.fout = 0; this.foutTekst = ''; this.modus = 'IDLE'; Object.values(this.ketens).forEach(k => { if (k.fase === 99) k.fase = 0; }); this.melding(oud, 'info', 'op', 'Storing ' + oud + ' gekwiteerd door de operator.', { clearedTs: this.bron.nuIso() }); this.events.forEach(e => { if (e.sev === 'alarm' && !e.clearedTs) e.clearedTs = this.bron.nuIso(); }); } }
    // 3. aanvragen [besluit 22-09 §4]; een afgevoerde halve batch vrijgeven
    this.restantBijwerken(ing);
    this._aanvragen(ing);
    // 4. de ketens
    if (this.modus !== 'SAFE' && this.modus !== 'FAULT') {
      this._toewijzen();
      ['A', 'B'].forEach(k => this._batch(this.ketens[k], dt, ing));
      this._direct(this.ketens.D, dt, ing);
      const loopt = Object.values(this.ketens).some(k => k.fase > 0 && k.fase < 99);
      if (this.modus !== 'SAFE' && this.modus !== 'FAULT') this.modus = loopt ? 'AUTO' : 'IDLE';   // een storing uit een keten wint
    }
    // 5. de mengers van de sporenbakken [besluit 22-09 §5]
    this._mengers(dt, ing);
    // 6. de systeempomp: vrijgave, hoog toeren en het setpoint volgen wat de eigenaar vroeg
    const sp = d.pompen.SYS;
    if (this.vrijgave && this.hzDoel > 0) { this.uitgangen[sp.vrijgave] = true; if (sp.hoog) this.uitgangen[sp.hoog] = this.hzDoel >= 40; this.uitgangen[sp.setpoint] = this.bron.hzNaarRuw(this.hzDoel); }
    this._vorigeVrijgave = this.vrijgave && this.hzDoel > 0; this._vorigeUitgangen = Object.assign({}, this.uitgangen);
    this._hmiAfronden(ing);
    return this.uitgangen;
  };
  Plc.prototype._hmiAfronden = function (ing) { this._ing = ing; };

  /* ---------------- aanvragen: een bak onder zijn grens vraagt om een vulling ---------------- */
  Plc.prototype._aanvragen = function (ing) {
    const bakken = WERKBAKKEN.concat(['ZB'], this.sporenBakken());
    bakken.forEach(bak => {
      if (!this.inGebruik(bak)) return;
      const bezig = Object.values(this.ketens).some(k => k.fase > 0 && k.fase < 99 && k.bak === bak) || this.aanvragen.includes(bak)
        || (bak in this.geweigerd && this.t - this.geweigerd[bak] < 600);
      const pc = this.pct(bak, ing); const grens = this.ins('P_NivStart', bak);
      if (pc === null || grens === null) { if (!bezig && !this._gemeldOnbekend) { /* niet gemeten is niet nul: geen aanvraag */ } return; }
      if (!bezig && pc < LIMIT(30, grens, 40)) { this.aanvragen.push(bak); this.melding('', 'info', 'op', this.bakNaam(bak) + ' vraagt om een vulling (' + Math.round(pc) + ' %, grens ' + Math.round(LIMIT(30, grens, 40)) + ' %).'); }
    });
    this.aanvragen = this.aanvragen.filter(b => this.inGebruik(b));
  };
  /* de doseerkring toewijzen: de eerste aanvraag in de rij waarvan de keten vrij is [doc §4.1] */
  Plc.prototype._toewijzen = function () {
    if (!this.auto) return;
    for (const bak of this.aanvragen.slice()) {
      const kn = /^[AB][1-3]$/.test(bak) ? bak[0] : 'D'; const k = this.ketens[kn];
      if (k.fase !== 0) continue;
      if (kn !== 'D') {   // een restant in de tussenbak: een halve batch blokkeert de kant; een klare batch gaat eerst naar zijn eigen bak [aangenomen; doc §2.7, O9/O10]
        const r = this.restant[kn];
        if (r && (r.half || r.bak !== bak)) { continue; }
      }
      this.aanvragen = this.aanvragen.filter(b => b !== bak);
      k.bak = bak; k.fase = 10; k.tFase = 0; k.n = 0; k.wacht = '';
      return;
    }
  };
  Plc.prototype.kringVrij = function (k) { return this.doseerkring === '' || this.doseerkring === (k.k === 'D' ? k.bak : k.k); };
  Plc.prototype.neemKring = function (k) { if (this.doseerkring === '') { this.doseerkring = k.k === 'D' ? k.bak : k.k; return true; } return this.doseerkring === (k.k === 'D' ? k.bak : k.k); };
  Plc.prototype.geefKring = function (k) { if (this.doseerkring === (k.k === 'D' ? k.bak : k.k)) this.doseerkring = ''; };

  /* ---------------- de batchbeurt [doc §5.1, bijlage C; besluit 22-09 §6] ---------------- */
  Plc.prototype._batch = function (k, dt, ing) {
    const d = this.d; const kant = k.k; const tb = 'TB' + kant; const tbDef = this.bakDef(tb); const pd = d.pompen[kant];
    if (k.fase === 0) return;
    k.tFase += dt;
    const bakDef = k.bak ? this.bakDef(k.bak) : null;
    const water = d.pompen.SYS; const wk = this.bronDef(0);
    const open = (kid, aan) => { if (kid) this.uitgangen[kid] = !!aan; };
    const pomp = hz => { this.vrijgave = true; this.hzDoel = hz; };
    const geteld = () => (this.pulsTeller - k.pulsBegin) * this.bron.pulsGewicht();
    const lsl = this.schakelaar(tb, 'laag', ing);   // 'niveau bereikt': waar zolang de vloeistof tot aan de laag-schakelaar staat
    const tbLaag = lsl === false;                     // onwaar = de tussenbak is leeg tot de schakelaar
    /* rondpompen: eerst de mengklep open, de pomp pas als die open is (looptijd); de laag-schakelaar stopt de pomp [doc §8.1].
       De vraag van de vorige scan wordt hier uitgevoerd, zodat elke fase gewoon mengpompAan() kan zeggen. */
    if (k.mengVraag && !tbLaag) { open(pd.mengklep, true); k.mengT = (k.mengT || 0) + dt; if (k.mengT >= T_KLEP) open(pd.aan, true); } else k.mengT = 0;
    k.mengVraag = false;
    const mengpompAan = () => { k.mengVraag = true; };
    const wd = WD[k.fase];   // de fase-watchdog; zolang een keten wácht (op de doseerkring, een menger, de andere kant) staat hij stil
    if (wd && k.tFase > wd && k.fase !== 99) { this.storing(120 + Math.min(9, Math.floor(k.fase / 10)), 'Fase ' + k.fase + ' van keten ' + kant + ' duurt te lang (' + Math.round(k.tFase) + ' s, toegestaan ' + wd + ' s).', k, { cause: 'De fase-watchdog liep af.', check: 'Kijk wat er in die fase niet gebeurde: een klep, de pomp, de flowmeter of een niveau.' }); return; }
    const hzHoog = this.ins('P_Hz_Hoog') || 50, hzLaag = this.ins('P_Hz_Laag') || 30;
    switch (k.fase) {
      case 10: {   // AANVRAAG: rekenen en controleren; wacht op de doseerkring
        if (!this.neemKring(k)) { k.wacht = 'wacht op de doseerkring'; k.tFase = 0; return; }
        k.wacht = '';
        const r = this.restant[kant];
        if (r && r.bak === k.bak) {   // eerst het restant van de vorige batch afleveren, zonder nieuwe batch [aangenomen]
          this.geefKring(k); k.stoffen = []; k.porties = []; k.restant = 0; k.fase = 80; k.tFase = 0; k.klepDichtT = 0; k.nivBegin = this.liters(k.bak, ing) || 0;
          this.beurtStart(k, k.bak, 'restant ' + r1(r.liters) + ' L'); this.melding('', 'info', 'op', 'Tussenbak ' + kant + ': het restant van ' + r1(r.liters) + ' L gaat naar ' + this.bakNaam(k.bak) + '.'); return;
        }
        const rb = (this.bron.receptopbouw() || {})[k.bak]; const cfg = this.bron.configuratie();
        if (!rb || !Array.isArray(rb.stappen) || !cfg || cfg.geldig === false) { this.storing(175, 'Batch voor ' + this.bakNaam(k.bak) + ' kan niet starten: geen receptopbouw of geen geldige configuratie.', k); return; }
        const rec = this.bron.reken(k.bak);
        if (!rec) { this.storing(176, 'Batch voor ' + this.bakNaam(k.bak) + ': het recept is niet compleet (instellingen of maten ontbreken).', k); return; }
        if (!rec.past) { this.storing(171, 'Batch voor ' + this.bakNaam(k.bak) + ' past niet in het batchvolume: ' + r1(rec.teVeel) + ' L te veel.', k, { cause: 'De som van de meststoffen, het voorwater en het spoelwater is groter dan het batchvolume.', check: 'Verlaag iets in het recept, of vergroot het batchvolume in de configuratie.' }); return; }
        const minGift = this.ins('P_MinGift') || 0;
        const stoffen = []; for (let i = 0; i < rb.stappen.length; i++) { const L = rec.stof[i]; if (L > 0) stoffen.push({ nr: rb.stappen[i], doelL: L, portie: rec.water[i + 1] }); }
        const teKlein = stoffen.find(s => s.doelL < minGift);
        if (teKlein) { this.storing(161, 'Batch voor ' + this.bakNaam(k.bak) + ': de gift van ' + this.stofNaam(teKlein.nr) + ' (' + r1(teKlein.doelL) + ' L) is kleiner dan de kleinste gift (' + minGift + ' L).', k, { check: 'Verhoog de liters van die stof of verlaag de kleinste gift (Service).' }); return; }
        for (const s of stoffen) {   // een sporenbak is geen bron zolang zijn menger draait of zijn niveau onbekend/leeg is [doc §8.1, §2.5]
          if (s.nr > SPOREN_START) {
            const sb = 'SP' + (s.nr - SPOREN_START); const m = this.mengers[sb]; const L = this.liters(sb, ing);
            if (this.ketens.D.fase > 0 && this.ketens.D.bak === sb) { this.storing(172, 'Batch voor ' + this.bakNaam(k.bak) + ': ' + this.bakNaam(sb) + ' is nodig als bron, maar wordt zelf nog gevuld.', k); return; }
            if (L === null || L < s.doelL + 5) { this.storing(173, 'Batch voor ' + this.bakNaam(k.bak) + ': te weinig in ' + this.bakNaam(sb) + ' (' + (L === null ? 'niveau onbekend' : r1(L) + ' L') + ', nodig ' + r1(s.doelL) + ' L).', k, { check: 'Laat de sporenbak eerst vullen.' }); return; }
            if (m && m.stand === 'draait') { k.wacht = 'wacht tot de menger van ' + this.bakNaam(sb) + ' stilstaat'; k.tFase = 0; return; }
          }
        }
        k.wacht = '';
        k.stoffen = stoffen; k.porties = rec.water.slice(); k.n = 0; k.geteldTotaal = 0; k.restant = 0;
        k.lekS = this.bronCfg(stoffen.length ? stoffen[0].nr : 1); k.lekS = k.lekS && isFinite(Number(k.lekS.lektestS)) ? Number(k.lekS.lektestS) : 30;
        k.nivBegin = this.liters(tb, ing) || 0;
        this.beurtStart(k, k.bak, stoffen.map(s => this.stofNaam(s.nr)).join(', '));
        this.melding('', 'info', 'op', 'Batch voor ' + this.bakNaam(k.bak) + ' gestart in tussenbak ' + kant + ': ' + stoffen.length + ' stoffen, ' + r1(rec.totaal - rec.teVeel) + ' L.');
        k.fase = 20; k.tFase = 0; k.pulsBegin = this.pulsTeller; k.doelL = k.porties[0]; k.geteldL = 0; k.meststof = 'voorwater';
        return;
      }
      case 20: {   // VOORVULLEN: water + vulklep tussenbak, 50 Hz, tot portie 0 [besluit: geteld op FC 01]
        open(wk.aanzuig, true); open(tbDef.vul, true); pomp(hzHoog); k.geteldL = geteld(); k.doelL = k.porties[0];
        this._pulsBewaking(k, 'voorvullen');
        if (k.geteldL >= k.doelL) { k.geteldTotaal += k.geteldL; k.fase = 30; k.tFase = 0; k.lekBegin = this.pulsTeller; k.lekNiveau = null; k.lekStilS = 0; k.meststof = 'lektest'; k.doelL = 0; k.geteldL = 0; }
        return;
      }
      case 30: {   // LEKTEST: alle kleppen dicht, de pomp draait door; FC 01 moet stilvallen binnen de lektesttijd, het niveau mag niet verlopen [doc §8.2]
        pomp(hzLaag);
        this.lekNiveauMeten(k, tb, ing);
        if (k.tFase > T_KLEP + 1.0 + LEK_VENSTER && this.pulsStilS >= T_STIL) {
          const tol = this.ins('P_TolLektestNiveau'); const verloop = this.lekVerloop(k);
          if (tol !== null && Math.abs(verloop) > tol) { this.storing(132, 'Lektest keten ' + kant + ': het niveau van tussenbak ' + kant + ' verliep ' + r1(verloop) + ' L (toegestaan ' + tol + ' L).', k, { cause: 'Zakken is weglekken; stijgen is een klep die niet dicht is.', check: 'Controleer de kleppen rond tussenbak ' + kant + '.' }); return; }
          this.melding('', 'info', 'svc', 'Lektest keten ' + kant + ' geslaagd na ' + r1(k.tFase) + ' s: de flowmeter staat stil (naloop ' + Math.round(this.pulsTeller - k.lekBegin) + ' pulsen), niveauverloop ' + r1(verloop) + ' L.');
          k.fase = 60; k.tFase = 0; k.n = 0; return;   // naar VOLGENDE: n := 1, dan MESTSTOF 1
        }
        if (k.tFase > T_KLEP + k.lekS) { this.storing(131, 'Lektest keten ' + kant + ' mislukt: de flowmeter geeft nog pulsen na ' + k.lekS + ' s.', k, { cause: 'Ergens is een klep niet dicht; met een draaiende pomp erachter is dat meteen zichtbaar.', check: 'Controleer de aanzuigkleppen en de vulkleppen. Geen automatische herhaling.' }); }
        return;
      }
      case 40: {   // MESTSTOF n: aanzuigklep n + vulklep tussenbak; er is geen terugmelding, dus wachten op de looptijd [aangenomen]
        const s = k.stoffen[k.n - 1]; const bd = this.bronDef(s.nr);
        if (!bd) { this.storing(181, 'Bron ' + s.nr + ' bestaat niet op deze machine.', k); return; }
        k.meststof = this.stofNaam(s.nr); k.doelL = s.doelL; k.geteldL = 0;
        if (s.nr > SPOREN_START) {   // uit een sporenbak doseren wacht tot zijn menger stilstaat [besluit 22-09 §5, doc §8.1]
          const m = this.mengers['SP' + (s.nr - SPOREN_START)];
          if (m && m.stand === 'draait') { k.wacht = 'wacht tot de menger van ' + this.bakNaam('SP' + (s.nr - SPOREN_START)) + ' stilstaat'; k.tFase = 0; open(tbDef.vul, true); mengpompAan(); return; }
          k.wacht = '';
        }
        open(bd.aanzuig, true); open(tbDef.vul, true); mengpompAan();
        if (k.tFase >= T_KLEP) { k.pulsBegin = this.pulsTeller; k.tDosering = 0; const volFijn = this.perBron('P_VolFijn', s.nr) || 0; k.fase = s.doelL <= volFijn ? 44 : 42; k.tFase = 0; }
        return;
      }
      case 42: case 44: {   // DOSEREN GROF op 50 Hz tot (doel − fijnvolume); DOSEREN FIJN op 30 Hz tot het schakelpunt (doel − geleerde naloop) [doc §6.2]
        const s = k.stoffen[k.n - 1]; const bd = this.bronDef(s.nr);
        open(bd.aanzuig, true); open(tbDef.vul, true); mengpompAan(); k.tDosering += dt;
        k.geteldL = geteld();
        const volFijn = this.perBron('P_VolFijn', s.nr) || 0; const naloop = this.naloopVan(s.nr);
        this._pulsBewaking(k, k.meststof);
        const tPomp = this.pompTijdMax(s.nr, s.doelL);
        if (tPomp && k.tDosering > tPomp) { this.storing(143, 'Dosering van ' + k.meststof + ' duurt langer dan de pomptijd (' + Math.round(tPomp) + ' s voor ' + r1(s.doelL) + ' L): er komt minder door de leiding dan er hoort.', k, { cause: 'Een verstopping, een klep die niet ver genoeg opengaat, of een lege voorraadtank.', check: 'Controleer de voorraad en de aanzuigklep van ' + k.meststof + '.' }); return; }
        if (k.fase === 42) { pomp(hzHoog); if (k.geteldL >= s.doelL - volFijn) { k.fase = 44; k.tFase = 0; } }
        else { pomp(hzLaag); k.vSchakel = s.doelL - naloop; if (k.geteldL >= k.vSchakel) { open(bd.aanzuig, false); k.fase = 46; k.tFase = 0; } }
        return;
      }
      case 46: {   // KLEP DICHT: aanzuigklep dicht, pomp uit, naloop tellen; de correctie langzaam bijstellen [doc §6.2]
        const s = k.stoffen[k.n - 1];
        open(tbDef.vul, true); mengpompAan(); k.geteldL = geteld();
        if (k.tFase > 0.5 && this.pulsStilS >= T_STIL) {
          const vEind = geteld(); const na = vEind - k.vSchakel;
          if (Math.abs(na) < NALOOP_MAX) this.naloop[s.nr] = 0.8 * this.naloopVan(s.nr) + 0.2 * na;
          else this.melding(144, 'warn', 'svc', 'Naloop van ' + k.meststof + ' is ' + r1(na) + ' L: te groot voor een kalibratie, niet overgenomen.');
          k.geteldTotaal += vEind;
          this.melding('', 'info', 'op', k.meststof + ' gedoseerd: ' + r1(vEind) + ' L (doel ' + r1(s.doelL) + ' L, naloop ' + r1(na) + ' L).');
          /* de waterportie na stof k [besluit 22-09 §6]: minstens het spoelvolume van die stof. Na de laatste stof alleen het spoelvolume;
             de rest van die portie is het aanvulwater van fase 70 */
          const spoel = this.perBron('P_VolSpoel', s.nr) || 0; const laatste = k.n >= k.stoffen.length;
          k.fase = 50; k.tFase = 0; k.pulsBegin = this.pulsTeller; k.doelL = laatste ? spoel : Math.max(s.portie || 0, spoel); k.geteldL = 0; k.meststof = 'spoelwater na ' + this.stofNaam(s.nr);
        }
        return;
      }
      case 50: {   // LEIDING SPOELEN: water + vulklep tussenbak, tot de waterportie na deze stof [besluit 22-09 §6]
        open(wk.aanzuig, true); open(tbDef.vul, true); pomp(hzHoog); mengpompAan(); k.geteldL = geteld();
        this._pulsBewaking(k, 'spoelen');
        if (k.geteldL >= k.doelL) { k.geteldTotaal += k.geteldL; k.fase = 55; k.tFase = 0; k.meststof = 'mengen'; k.doelL = 0; k.geteldL = 0; }
        return;
      }
      case 55: {   // MENGEN: mengklep open, mengpomp aan, de drie vulkleppen dicht [doc §5.1]
        mengpompAan();
        if (k.tFase >= (this.ins('P_TijdMengen') || 0)) { k.fase = 60; k.tFase = 0; }
        return;
      }
      case 60: {   // VOLGENDE: n := n + 1
        k.n += 1; mengpompAan();
        if (k.n <= k.stoffen.length) { k.fase = 40; k.tFase = 0; }
        else { const s = k.stoffen[k.stoffen.length - 1]; const spoel = s ? (this.perBron('P_VolSpoel', s.nr) || 0) : 0;
          k.fase = 70; k.tFase = 0; k.pulsBegin = this.pulsTeller; k.doelL = Math.max(0, k.porties[k.porties.length - 1] - spoel); k.geteldL = 0; k.meststof = 'aanvulwater'; }
        return;
      }
      case 70: {   // AANVULLEN: water tot precies het batchvolume, geteld op FC 01 [besluit 22-09 §6]; het niveau controleert mee [doc §6.4]
        open(wk.aanzuig, true); open(tbDef.vul, true); pomp(hzHoog); mengpompAan(); k.geteldL = geteld();
        this._pulsBewaking(k, 'aanvullen');
        if (k.geteldL >= k.doelL) {
          k.geteldTotaal += k.geteldL; const niv = this.liters(tb, ing);
          if (niv !== null) { const verschil = niv - k.nivBegin - k.geteldTotaal; if (Math.abs(verschil) > 0.05 * k.geteldTotaal + 10) this.melding(145, 'warn', 'svc', 'Tussenbak ' + kant + ': de niveaumeting (' + r1(niv - k.nivBegin) + ' L erbij) en de flowmeter (' + r1(k.geteldTotaal) + ' L) verschillen ' + r1(verschil) + ' L.', { check: 'Controleer de flowmeter, de niveausensor en de kleppen op lekkage.' }); }
          k.fase = 75; k.tFase = 0; k.meststof = 'eindmengen'; k.doelL = 0; k.geteldL = 0;
        }
        return;
      }
      case 75: {   // EINDMENGEN: namengen vóór er iets naar een werkbak gaat
        mengpompAan();
        if (k.tFase >= (this.ins('P_TijdMengenEind') || 0)) { this.geefKring(k); k.fase = 80; k.tFase = 0; k.klepDichtT = 0; k.wacht = ''; k.afgeleverd = 0; k.nivBegin = this.liters(k.bak, ing) || 0; k.meststof = 'afleveren'; }
        return;
      }
      case 80: {   // AFLEVEREN: de doseerkring is teruggegeven; wacht zo nodig tot de andere kant ook klaar is; dan mengklep dicht, werkbakklep open, pomp aan [doc §5.1, §2.4]
        const ander = this.ketens[kant === 'A' ? 'B' : 'A'];
        const anderBouwt = ander.fase >= 10 && ander.fase <= 75;
        const anderVraagt = this.aanvragen.some(b => b[0] === (kant === 'A' ? 'B' : 'A'));
        if (k.klepDichtT === 0 && (anderBouwt || anderVraagt) && k.tRest < 1800) { k.wacht = 'wacht op de andere kant'; k.tRest += dt; k.tFase = 0; mengpompAan(); return; }
        k.wacht = ''; k.tRest = 0;
        k.klepDichtT += dt;
        const vol = this.schakelaar(k.bak, null, ing) === true;
        if (k.klepDichtT < T_KLEP) { /* mengklep dicht, pomp uit, klep wisselen zonder druk [doc §8.1] */ return; }
        open(bakDef.vul, !vol);
        if (!vol && !tbLaag && k.klepDichtT >= 2 * T_KLEP) open(pd.aan, true);
        const nivBak = this.liters(k.bak, ing); if (nivBak !== null) k.afgeleverd = Math.max(0, nivBak - k.nivBegin);
        if (vol || tbLaag) {
          const rest = this.liters(tb, ing);
          if (vol && rest !== null && rest > 25) { this.restant[kant] = { bak: k.bak, liters: rest }; this.melding(151, 'warn', 'op', this.bakNaam(k.bak) + ' is vol; er blijft ' + r1(rest) + ' L in tussenbak ' + kant + ' staan. Dat restant gaat naar ' + this.bakNaam(k.bak) + ' bij zijn volgende aanvraag; tot dan start er geen nieuwe batch aan kant ' + kant + '.', { check: 'Niets: dit is het gevolg van een batch die groter is dan de ruimte in de werkbak.' }); }
          else { this.restant[kant] = null; if (rest !== null && rest > 0.5) this.melding('', 'info', 'svc', 'Tussenbak ' + kant + ' is leeg tot de laag-schakelaar; ' + r1(rest) + ' L blijft staan.'); }
          k.fase = 90; k.tFase = 0;
        }
        return;
      }
      case 90: {   // GEREED: alles dicht, pompen na-draaien
        if (k.tFase >= 2.0) { this.beurtKlaar(k, 'klaar'); this.melding('', 'info', 'op', 'Batch afgeleverd: ' + r1(k.afgeleverd) + ' L naar ' + this.bakNaam(k.bak) + '.'); k.fase = 0; k.bak = null; k.meststof = ''; k.doelL = 0; k.geteldL = 0; }
        return;
      }
      case 99: return;
    }
  };
  /* het niveauverloop tijdens de lektest [doc §8.2]: een niveausensor heeft ruis, dus de PLC middelt het niveau over
     LEK_VENSTER seconden aan het begin (zodra de kleppen dicht zijn) en over de laatste LEK_VENSTER seconden [aangenomen] */
  Plc.prototype.lekNiveauMeten = function (k, bak, ing) {
    if (k.tFase <= T_KLEP + 0.5) { k.lekBegin2 = []; k.lekEind2 = []; return; }
    const L = this.liters(bak, ing); if (L === null) return;
    if (k.lekBegin2.length < Math.round(LEK_VENSTER / 0.05)) k.lekBegin2.push(L);
    k.lekEind2.push(L); while (k.lekEind2.length > Math.round(LEK_VENSTER / 0.05)) k.lekEind2.shift();
  };
  Plc.prototype.lekVerloop = function (k) {
    const gem = a => a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const b = gem(k.lekBegin2), e = gem(k.lekEind2); return (b === null || e === null) ? 0 : e - b;
  };
  /* de pomptijd als tweede bewaking [doc §6.3]: P_TijdPomp[n] is de ingevulde tijd per stof; een grote gift mag naar rato
     langer duren: hoogstens tweemaal wat hij op hoog toeren zou kosten (60 l/min, doc §6.3) [aangenomen: het ontwerp
     noemt één tijd per stof, maar de gift verschilt per recept] */
  Plc.prototype.pompTijdMax = function (nr, doelL) { const t = this.perBron('P_TijdPomp', nr); if (!t) return 0; return Math.max(t, 2 * doelL / 1.0); };
  Plc.prototype.naloopVan = function (nr) { if (typeof this.naloop[nr] === 'number') return this.naloop[nr]; const v = this.perBron('P_VolNaloop', nr); return isFinite(v) && v !== null ? v : 0; };
  Plc.prototype._pulsBewaking = function (k, wat) {   // pomp gestuurd, geen pulsen: binnen enkele seconden storing [doc §8.1]
    if (k.tFase > T_KLEP + 2.5 && this.pulsStilS > T_GEEN_PULS) this.storing(141, 'De systeempomp is gestuurd (' + wat + ') maar de flowmeter geeft geen pulsen.', k, { cause: 'Noodstop, een lege bron, een dichte handafsluiter, of een defecte flowmeter.', check: 'Controleer de noodstop, de bron en de flowmeter. Zonder flowmeter kan er niet gedoseerd worden.' });
  };

  /* ---------------- de directe beurt: zuurbak en sporenbakken [doc §5.2, figuur 4] ---------------- */
  Plc.prototype._direct = function (k, dt, ing) {
    if (k.fase === 0) return;
    k.tFase += dt;
    const bak = k.bak; const bd = this.bakDef(bak); const wk = this.bronDef(0);
    const open = (kid, aan) => { if (kid) this.uitgangen[kid] = !!aan; };
    const pomp = hz => { this.vrijgave = true; this.hzDoel = hz; };
    const geteld = () => (this.pulsTeller - k.pulsBegin) * this.bron.pulsGewicht();
    const hzHoog = this.ins('P_Hz_Hoog') || 50, hzLaag = this.ins('P_Hz_Laag') || 30;
    const wd = WD_Z[k.fase];
    if (wd && k.tFase > wd && k.fase !== 99) { this.storing(120 + Math.min(9, Math.floor(k.fase / 10)), 'Fase Z' + k.fase + ' (' + this.bakNaam(bak) + ') duurt te lang (' + Math.round(k.tFase) + ' s, toegestaan ' + wd + ' s).', k); return; }
    const vol = this.schakelaar(bak, null, ing) === true;
    if (vol && k.fase >= 20 && k.fase <= 50) { this.storing(152, this.bakNaam(bak) + ' meldt vol tijdens het vullen; de beurt is gestopt.', k, { check: 'Controleer de niveauschakelaar en de inhoud van de bak in de configuratie.' }); return; }
    switch (k.fase) {
      case 10: {   // AANVRAAG: wacht tot de doseerkring vrij is; rekenen en controleren
        if (!this.neemKring(k)) { k.wacht = 'wacht op de doseerkring'; k.tFase = 0; return; }
        k.wacht = '';
        const cfg = this.bron.configuratie(); const rec = (this.bron.recepten() || {})[bak] || []; const cap = this.inhoud(bak); const L = this.liters(bak, ing);
        if (!cfg || cfg.geldig === false || !cap || L === null) { this.storing(175, 'Vulling van ' + this.bakNaam(bak) + ' kan niet starten: configuratie of niveau onbekend.', k); return; }
        const ref = Number(cfg.volReferentie) || 1000; const V = Math.max(0, cap * DIRECT_VUL_PCT / 100 - L);
        const minGift = this.ins('P_MinGift') || 0; const stoffen = [];
        this.actieveBronnen().forEach(nr => { if (nr > SPOREN_START) return; const x = rec[nr - 1]; const perRef = x && typeof x === 'object' ? Number(x.v) : Number(x); if (isFinite(perRef) && perRef > 0) stoffen.push({ nr, doelL: perRef * V / ref }); });
        const teKlein = stoffen.find(s => s.doelL < minGift);
        if (teKlein) { this.storing(161, 'Vulling van ' + this.bakNaam(bak) + ': de gift van ' + this.stofNaam(teKlein.nr) + ' (' + r1(teKlein.doelL) + ' L) is kleiner dan de kleinste gift (' + minGift + ' L).', k, { check: 'Verhoog de liters in het recept van ' + this.bakNaam(bak) + ' of verlaag de kleinste gift (Service).' }); return; }
        const somStof = stoffen.reduce((a, s) => a + s.doelL, 0);
        const spoelVoor = stoffen.length ? Math.max.apply(null, stoffen.map(s => this.perBron('P_VolSpoel', s.nr) || 0)) : (this.perBron('P_VolSpoel', 1) || 15);
        if (somStof + 2 * spoelVoor > V) { this.storing(171, 'Vulling van ' + this.bakNaam(bak) + ' past niet: ' + r1(somStof) + ' L stoffen en ' + r1(2 * spoelVoor) + ' L spoelwater in ' + r1(V) + ' L ruimte.', k); return; }
        k.stoffen = stoffen; k.V = V; k.spoelVoor = spoelVoor; k.spoelNa = Math.max(spoelVoor, V - somStof - spoelVoor); k.n = 0; k.geteldTotaal = 0; k.nivBegin = L; k.afgeleverd = 0;
        k.lekS = this.bronCfg(stoffen.length ? stoffen[0].nr : 1); k.lekS = k.lekS && isFinite(Number(k.lekS.lektestS)) ? Number(k.lekS.lektestS) : 30;
        this.beurtStart(k, bak, stoffen.map(s => this.stofNaam(s.nr)).join(', ') || 'water');
        this.melding('', 'info', 'op', 'Vulling van ' + this.bakNaam(bak) + ' gestart: ' + r1(V) + ' L, ' + stoffen.length + ' stoffen.');
        k.fase = 20; k.tFase = 0; k.pulsBegin = this.pulsTeller; k.doelL = spoelVoor; k.geteldL = 0; k.meststof = 'spoelwater vooraf';
        return;
      }
      case 20: {   // LEIDING SPOELEN vóór de beurt: water rechtstreeks in de bak
        open(wk.aanzuig, true); open(bd.vul, true); pomp(hzHoog); k.geteldL = geteld(); this._pulsBewaking(k, 'spoelen');
        if (k.geteldL >= k.doelL) { k.geteldTotaal += k.geteldL; k.fase = 30; k.tFase = 0; k.lekBegin = this.pulsTeller; k.lekNiveau = null; k.meststof = 'lektest'; k.doelL = 0; k.geteldL = 0; }
        return;
      }
      case 30: {   // LEKTEST [doc §8.2]
        pomp(hzLaag);
        this.lekNiveauMeten(k, bak, ing);
        if (k.tFase > T_KLEP + 1.0 + LEK_VENSTER && this.pulsStilS >= T_STIL) {
          const tol = this.ins('P_TolLektestNiveau'); const verloop = this.lekVerloop(k);
          if (tol !== null && Math.abs(verloop) > tol) { this.storing(132, 'Lektest (' + this.bakNaam(bak) + '): het niveau verliep ' + r1(verloop) + ' L (toegestaan ' + tol + ' L).', k); return; }
          this.melding('', 'info', 'svc', 'Lektest (' + this.bakNaam(bak) + ') geslaagd na ' + r1(k.tFase) + ' s: de flowmeter staat stil, niveauverloop ' + r1(verloop) + ' L.');
          k.fase = 45; k.tFase = 0; k.n = 0; return;
        }
        if (k.tFase > T_KLEP + k.lekS) this.storing(131, 'Lektest (' + this.bakNaam(bak) + ') mislukt: de flowmeter geeft nog pulsen na ' + k.lekS + ' s.', k, { cause: 'Ergens is een klep niet dicht.', check: 'Controleer de aanzuigkleppen en de vulkleppen. Geen automatische herhaling.' });
        return;
      }
      case 40: {   // COMPONENT n: aanzuigklep open; grof en fijn doseren op FC 01, klep dicht, naloop (sub 0..3)
        const s = k.stoffen[k.n - 1]; const bdn = this.bronDef(s.nr); const volFijn = this.perBron('P_VolFijn', s.nr) || 0; const naloop = this.naloopVan(s.nr);
        k.meststof = this.stofNaam(s.nr); k.doelL = s.doelL; open(bd.vul, true);
        if (k.sub === 0) { open(bdn.aanzuig, true); k.geteldL = 0; if (k.tFase >= T_KLEP) { k.pulsBegin = this.pulsTeller; k.tDosering = 0; k.sub = s.doelL <= volFijn ? 2 : 1; } return; }
        if (k.sub === 1 || k.sub === 2) {
          open(bdn.aanzuig, true); k.tDosering += dt; k.geteldL = geteld(); this._pulsBewaking(k, k.meststof);
          const tPomp = this.pompTijdMax(s.nr, s.doelL);
          if (tPomp && k.tDosering > tPomp) { this.storing(143, 'Dosering van ' + k.meststof + ' duurt langer dan de pomptijd (' + Math.round(tPomp) + ' s voor ' + r1(s.doelL) + ' L).', k); return; }
          if (k.sub === 1) { pomp(hzHoog); if (k.geteldL >= s.doelL - volFijn) k.sub = 2; }
          else { pomp(hzLaag); k.vSchakel = s.doelL - naloop; if (k.geteldL >= k.vSchakel) { open(bdn.aanzuig, false); k.sub = 3; k.klepDichtT = 0; } }
          return;
        }
        k.klepDichtT += dt; k.geteldL = geteld();
        if (k.klepDichtT > 0.5 && this.pulsStilS >= T_STIL) {
          const vEind = geteld(); const na = vEind - k.vSchakel;
          if (Math.abs(na) < NALOOP_MAX) this.naloop[s.nr] = 0.8 * this.naloopVan(s.nr) + 0.2 * na;
          k.geteldTotaal += vEind; this.melding('', 'info', 'op', k.meststof + ' gedoseerd in ' + this.bakNaam(bak) + ': ' + r1(vEind) + ' L (doel ' + r1(s.doelL) + ' L).');
          k.fase = 45; k.tFase = 0; k.sub = 0;
        }
        return;
      }
      case 45: {   // VOLGENDE
        k.n += 1; open(bd.vul, true);
        if (k.n <= k.stoffen.length) { k.fase = 40; k.tFase = 0; k.sub = 0; }
        else { k.fase = 50; k.tFase = 0; k.pulsBegin = this.pulsTeller; k.doelL = k.spoelNa; k.geteldL = 0; k.meststof = 'spoelwater na'; }
        return;
      }
      case 50: {   // LEIDING SPOELEN ná de beurt: de rest van het water, in de bak
        open(wk.aanzuig, true); open(bd.vul, true); pomp(hzHoog); k.geteldL = geteld(); this._pulsBewaking(k, 'spoelen');
        if (k.geteldL >= k.doelL) { k.geteldTotaal += k.geteldL; const L = this.liters(bak, ing); k.afgeleverd = L === null ? k.geteldTotaal : L - k.nivBegin; k.fase = /^SP/.test(bak) ? 60 : 70; k.tFase = 0; k.meststof = k.fase === 60 ? 'mengen' : ''; k.doelL = 0; k.geteldL = 0; this.geefKring(k); }
        return;
      }
      case 60: {   // MENGEN: alleen sporenbakken; de menger draait 'na vullen' aan één stuk (de mengerlogica doet dat); de keten is klaar
        const m = this.mengers[bak]; if (m) { m.naVullen = true; }
        k.fase = 70; k.tFase = 0; return;
      }
      case 70: {   // GEREED
        if (k.tFase >= 2.0) { this.beurtKlaar(k, 'klaar'); this.melding('', 'info', 'op', this.bakNaam(bak) + ' gevuld: ' + r1(k.afgeleverd) + ' L erbij.'); k.fase = 0; k.bak = null; k.meststof = ''; k.doelL = 0; k.geteldL = 0; }
        return;
      }
      case 99: return;
    }
  };

  /* ---------------- de mengers van de sporenbakken [besluit 22-09 §5] ---------------- */
  Plc.prototype._mengers = function (dt, ing) {
    const GR = { P_NivRoerderAan: [10, 90], P_TijdRoerderAan: [1, 60], P_TijdRoerderRust: [0, 240], P_TijdRoerderNaVullen: [0, 120] };
    this.sporenBakken().forEach(bak => {
      const bd = this.bakDef(bak); const m = this.mengers[bak] || (this.mengers[bak] = { stand: 'wacht', reden: '', restS: 0, sinds: 0, naVullen: false, fase: 'wacht', tIn: 0 });
      const w = {}; let geldig = true;
      Object.keys(GR).forEach(n => { const v = this.ins(n, bak); w[n] = v; if (v === null || !isFinite(v) || v < GR[n][0] || v > GR[n][1]) geldig = false; });
      const pc = this.pct(bak, ing); const nr = SPOREN_START + Number(bak.slice(2));
      const doseertHier = ['A', 'B'].some(kk => { const k = this.ketens[kk]; return k.fase >= 40 && k.fase <= 46 && k.stoffen[k.n - 1] && k.stoffen[k.n - 1].nr === nr; });
      const veilig = this.modus !== 'SAFE' && this.modus !== 'FAULT';
      const aanS = (w.P_TijdRoerderAan || 0) * 60, rustS = (w.P_TijdRoerderRust || 0) * 60, naS = (w.P_TijdRoerderNaVullen || 0) * 60;
      m.tIn += dt;
      let uit = false;
      if (!geldig) { m.fase = 'wacht'; m.stand = 'uit'; m.reden = 'instelling ontbreekt'; m.restS = 0; }
      else if (!veilig) { m.fase = 'wacht'; m.stand = 'wacht'; m.reden = 'machine in storing'; m.restS = 0; }
      else if (m.naVullen) {   // na een sporenbeurt: aan één stuk, reden 1; pas daarna is de bak weer bron
        if (m.fase !== 'navullen') { m.fase = 'navullen'; m.tIn = 0; }
        uit = true; m.stand = 'draait'; m.reden = 'na vullen'; m.restS = Math.max(0, Math.trunc(naS - m.tIn));
        if (m.tIn >= naS) { m.naVullen = false; m.fase = 'rust'; m.tIn = 0; }
      } else if (m.fase === 'draait') {
        uit = true; m.stand = 'draait'; m.reden = ''; m.restS = Math.max(0, Math.trunc(aanS - m.tIn));
        if (m.tIn >= aanS) { m.fase = rustS > 0 ? 'rust' : 'wacht'; m.tIn = 0; }
      } else if (m.fase === 'rust') {
        m.stand = 'rust'; m.reden = ''; m.restS = Math.max(0, Math.trunc(rustS - m.tIn));
        if (m.tIn >= rustS) { m.fase = 'wacht'; m.tIn = 0; }
      } else {   // wacht: mag hij beginnen?
        if (pc === null) { m.stand = 'wacht'; m.reden = 'niveau onbekend'; }
        else if (pc < w.P_NivRoerderAan) { m.stand = 'wacht'; m.reden = 'te laag'; }
        else if (doseertHier) { m.stand = 'wacht'; m.reden = 'er wordt uit deze bak gedoseerd'; }
        else { m.fase = 'draait'; m.tIn = 0; uit = true; m.stand = 'draait'; m.reden = ''; }
        m.restS = 0;
      }
      if (bd && bd.menger) this.uitgangen[bd.menger] = uit;
    });
  };

  /* ---------------- opdrachten van het scherm ---------------- */
  Plc.prototype.kwiteer = function () { this.reset = true; };
  Plc.prototype.zetAuto = function (aan) {
    aan = !!aan; if (aan === this.auto) return; this.auto = aan;
    if (!aan) {   // de operator zet de machine stil: lopende beurten afbreken, alles uit, restant vastleggen [doc §2.7]
      Object.values(this.ketens).forEach(k => { if (k.fase > 0 && k.fase < 99) { this.beurtKlaar(k, 'afgebroken door de operator'); this.restantVastleggen(k); k.fase = 0; k.bak = null; k.meststof = ''; k.doelL = 0; k.geteldL = 0; k.wacht = ''; } });
      this.doseerkring = ''; this.aanvragen = [];
      this.melding('', 'info', 'op', 'De operator heeft de machine stilgezet: lopende beurten afgebroken, alles uit.');
    } else this.melding('', 'info', 'op', 'Automatisch bedrijf weer aan.');
  };

  /* ---------------- wat het scherm krijgt ---------------- */
  Plc.prototype.hmi = function () {
    const ketens = {};
    Object.values(this.ketens).forEach(k => {
      if (k.fase === 0) return;
      const info = { fase: k.fase, meststof: k.meststof || '', bestemming: k.bak ? this.bakNaam(k.bak) : '', doelL: r1(k.doelL || 0), geteldL: r1(k.geteldL || 0), stap: k.n, van: k.stoffen ? k.stoffen.length : 0, wacht: k.wacht || '' };
      ketens[k.k] = info;
    });
    const mengers = {}; Object.keys(this.mengers).forEach(b => { const m = this.mengers[b]; mengers[b] = { stand: m.stand, reden: m.reden, restS: m.restS }; });
    const restant = {}; ['A', 'B'].forEach(k => { const r = this.restant[k]; restant[k] = r ? { liters: r1(r.liters), half: !!r.half, bak: r.bak ? this.bakNaam(r.bak) : '' } : null; });
    return { machine: { modus: this.modus, fout: this.fout, doseerkring: this.doseerkring, ketens, aanvragen: this.aanvragen.slice(), auto: this.auto, restant },
      mengers, naloop: Object.assign({}, this.naloop), flowLpm: r1(this.pulsRate * this.bron.pulsGewicht() * 60), hz: this.vrijgave ? this.hzDoel : 0, events: this.events, beurten: this.beurten };
  };
  Plc.prototype.bewaar = function () {
    return { t: this.t, modus: this.modus, fout: this.fout, foutTekst: this.foutTekst, auto: this.auto, doseerkring: this.doseerkring, ketens: JSON.parse(JSON.stringify(this.ketens)), aanvragen: this.aanvragen.slice(), restant: JSON.parse(JSON.stringify(this.restant)),
      naloop: Object.assign({}, this.naloop), mengers: JSON.parse(JSON.stringify(this.mengers)), events: this.events.slice(-200), eventNr: this.eventNr, beurten: this.beurten.slice(0, 100), beurtNr: this.beurtNr, pulsVorige: this.pulsVorige, pulsTeller: this.pulsTeller, geweigerd: Object.assign({}, this.geweigerd) };
  };
  Plc.prototype.herstel = function (s) {
    if (!s || typeof s !== 'object' || !s.ketens) return false;
    try {
      this.t = Number(s.t) || 0; this.modus = s.modus || 'IDLE'; this.fout = s.fout || 0; this.foutTekst = s.foutTekst || ''; this.auto = s.auto !== false; this.doseerkring = s.doseerkring || '';
      ['A', 'B', 'D'].forEach(k => { if (s.ketens[k]) this.ketens[k] = Object.assign(this._nieuweKeten(k), s.ketens[k]); });
      this.aanvragen = (s.aanvragen || []).slice(); this.restant = Object.assign({ A: null, B: null }, s.restant || {}); this.naloop = Object.assign({}, s.naloop || {}); this.mengers = JSON.parse(JSON.stringify(s.mengers || {}));
      this.events = (s.events || []).slice(); this.eventNr = s.eventNr || 0; this.beurten = (s.beurten || []).slice(); this.beurtNr = s.beurtNr || 0;
      this.pulsVorige = typeof s.pulsVorige === 'number' ? s.pulsVorige : null; this.pulsTeller = s.pulsTeller || 0; this.pulsVenster = []; this.geweigerd = Object.assign({}, s.geweigerd || {});
      return true;
    } catch (e) { return false; }
  };

  window.BvPlc = { Plc, WD, WD_Z, T_KLEP, T_STIL, T_GEEN_PULS, NALOOP_MAX, DIRECT_VUL_PCT };
})();
