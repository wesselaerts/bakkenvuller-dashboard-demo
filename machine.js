/* ==================================================================
   DE MACHINE, NAGEBOOTST IN DE BROWSER: het rekenmodel (25-09-2026)
   ------------------------------------------------------------------
   Dit is gereedschap\machine-nabootsing\model.py, regel voor regel
   overgezet naar JavaScript. Dezelfde klassen (Leiding, Bak, Klep,
   Pomp, Model), dezelfde stappen, dezelfde getallen: parameters.json
   van de machine-nabootsing staat hieronder ingebouwd (bouw_deel.py).
   Een proefset in gereedschap\machine-nabootsing\proeven\engine-proeven.json
   draait tegen allebei en moet dezelfde liters en pulsen geven.

   Invoer:  de uitgangen van de PLC (kleppen, pompen, mengers, het
            frequentiesetpoint), per klem uit de IO-mapping (MACHINE).
   Uitvoer: de ingangen van de PLC (niveauschakelaars, niveausensoren
            ruw, de teller van de flowmeter, meldingen van de pompen,
            luchtdruk), in de vorm die de kaarten geven.
   Daarnaast de WAARHEID die de PLC niet ziet: wat er in elke bak en in
   de leiding zit (liters per stof), hoe warm een pomp is, de voorraad.

   De machine hier is die van de IO-mapping van 21-09 (het dashboard):
   de pompen melden bedrijf en storing (BM-*, SM-*, HM-*). De Python-
   versie volgt de IO-mapping van 22-09 (thermostaat, thermisch, water
   aanwezig). De fysica is dezelfde; alleen de klemmen verschillen.

   Geen tijd uit de klok: step(dt) rekent dt seconden verder, zodat
   proeven precies herhaalbaar zijn.
   ================================================================== */
(function () {
  'use strict';
  const PARAMETERS = /*@PARAMETERS@*/{"_uitleg":"Alle getallen van het rekenmodel, met hun bron. [doc] = Bakkenvuller - hoe de software werkt, versie 11 (22-09-2026). [IO] = IO-mapping van 22-09. [gemeten] = gemeten op de proef-PLC. [aangenomen] = nog niet bekend: pas aan zodra het gemeten of opgezocht is. Na een wijziging de nabootsing opnieuw starten.","systeempomp":{"debiet_bij_50hz_lpm":{"waarde":60,"eenheid":"l/min","bron":"[aangenomen] doc §6.3 rekent met 'zestig liter per minuut'; de echte opbrengst van de Tellarini ALT 30 op deze leiding is niet gemeten"},"hz_zonder_opbrengst":{"waarde":10,"eenheid":"Hz","bron":"[aangenomen] onder deze frequentie geeft de pomp geen stroming tegen de leiding in"},"hz_bij_4mA":{"waarde":0,"eenheid":"Hz","bron":"[aangenomen] instelling van de frequentieregelaar"},"hz_bij_20mA":{"waarde":50,"eenheid":"Hz","bron":"[aangenomen] instelling van de frequentieregelaar; doc: 50 Hz is hoog toeren"},"aanloop_hz_per_s":{"waarde":25,"eenheid":"Hz/s","bron":"[aangenomen] aanlooptijd van de frequentieregelaar (0 naar 50 Hz in 2 s)"},"uitloop_hz_per_s":{"waarde":25,"eenheid":"Hz/s","bron":"[aangenomen] uitlooptijd; bepaalt samen met de klep de naloop"},"droog_na_s":{"waarde":3,"eenheid":"s","bron":"[aangenomen] zoveel seconden lucht zuigen en het water-aanwezig-contact valt weg"},"vullen_s":{"waarde":3,"eenheid":"s","bron":"[aangenomen] zoveel seconden tot de pomp weer vol water staat"},"tegen_dicht_tot_alarm_s":{"waarde":90,"eenheid":"s","bron":"[aangenomen] tegen dichte kleppen in draaien tot het thermostaatalarm; doc §8.2: moet ruimer zijn dan de langste lektest (45 s)"},"droog_tot_alarm_s":{"waarde":45,"eenheid":"s","bron":"[aangenomen] drooglopen tot het thermostaatalarm; doc §8.1: 'binnen een minuut kapot'"},"afkoelen_s":{"waarde":120,"eenheid":"s","bron":"[aangenomen] van alarmtemperatuur tot koud"}},"mengpomp":{"debiet_lpm":{"waarde":100,"eenheid":"l/min","bron":"[aangenomen] Tellarini ALT 30 zonder frequentieregelaar; doc: afleveren in fase 80 heeft een watchdog van 900 s"},"aanzuig_minimum_l":{"waarde":15,"eenheid":"L","bron":"[aangenomen] onder deze inhoud zuigt de pomp lucht uit de tussenbak; onder de laag-schakelaar (20 L). Was 20 tot 25-09"},"droog_na_s":{"waarde":3,"eenheid":"s","bron":"[aangenomen]"},"vullen_s":{"waarde":3,"eenheid":"s","bron":"[aangenomen]"},"tegen_dicht_tot_alarm_s":{"waarde":60,"eenheid":"s","bron":"[aangenomen] doc §8.1: 'een draaiende pomp tegen vier dichte kleppen is binnen een minuut schade'"},"droog_tot_alarm_s":{"waarde":45,"eenheid":"s","bron":"[aangenomen] doc §8.1"},"afkoelen_s":{"waarde":120,"eenheid":"s","bron":"[aangenomen]"}},"kleppen":{"looptijd_s":{"waarde":0.7,"eenheid":"s","bron":"[doc §6.2] 'een halve tot een hele seconde om te sluiten'; openen even snel aangenomen"}},"leiding":{"inhoud_l":{"waarde":6,"eenheid":"L","bron":"[aangenomen] inhoud van de transportleiding van aanzuigkleppen tot vulkleppen; bepaalt hoeveel er na een dosering in de leiding blijft"}},"flowmeter":{"pulsen_per_liter":{"waarde":252,"eenheid":"p/L","bron":"[doc, IO] FC 01"},"betrouwbaar_vanaf_lpm":{"waarde":4,"eenheid":"l/min","bron":"[doc] 'onder 4 l/min meet hij niet betrouwbaar'"},"telt_niets_onder_lpm":{"waarde":2,"eenheid":"l/min","bron":"[aangenomen] tussen deze grens en 4 l/min telt hij naar verhouding te weinig"},"max_hz":{"waarde":420,"eenheid":"Hz","bron":"[doc] maximaal 420 pulsen per seconde (100 l/min)"}},"analoog":{"ruw_bij_4mA":{"waarde":0,"eenheid":"","bron":"[aangenomen] IB IL-formaat zoals de skill het geeft voor de AXL F AI4 I 1H; voor de AXL SE AI4 I 4-20 nog na te kijken"},"ruw_bij_20mA":{"waarde":30000,"eenheid":"","bron":"[aangenomen] idem"},"ruw_max":{"waarde":32511,"eenheid":"","bron":"[aangenomen] hoogste geldige waarde boven 20 mA"},"ruw_overbereik":{"waarde":32769,"eenheid":"","bron":"[aangenomen] 0x8001"},"ruw_draadbreuk":{"waarde":32770,"eenheid":"","bron":"[gemeten 21-09] een open klem gaf 32770 = 0x8002"}},"teller":{"bits":{"waarde":32,"eenheid":"bit","bron":"[aangenomen] hoe de AXL SE CNT1 zijn stand doorgeeft is nog niet opgezocht; de nabootsing geeft een oplopende 32-bits stand"}},"bakken":{"tussenbak_inhoud_l":{"waarde":1000,"eenheid":"L","bron":"[aangenomen] doc: een batch is ± 800 L en 'nooit 1000 liter aanmaken'"},"tussenbak_meetbereik_l":{"waarde":1000,"eenheid":"L","bron":"[aangenomen] meetbereik Rithmestick, open punt O8"},"tussenbak_laag_l":{"waarde":20,"eenheid":"L","bron":"[aangenomen] hoogte van de laag-niveauschakelaar; tot hier levert de PLC af, wat eronder zit blijft staan (doc O9). Was 50 tot 25-09"},"tussenbak_hoog_l":{"waarde":950,"eenheid":"L","bron":"[aangenomen] hoogte van de hoog-niveauschakelaar"},"tussenbak_begin_l":{"waarde":0,"eenheid":"L","bron":"[aangenomen] bij het starten"},"werkbak_inhoud_l":{"waarde":1000,"eenheid":"L","bron":"[doc] elk 1000 liter"},"werkbak_meetbereik_l":{"waarde":1000,"eenheid":"L","bron":"[aangenomen] meetbereik van de druksensor"},"werkbak_schakelaar_l":{"waarde":950,"eenheid":"L","bron":"[aangenomen] hoogte van de niveauschakelaar (vol)"},"werkbak_begin_l":{"waarde":600,"eenheid":"L","bron":"[aangenomen] bij het starten"},"werkbak_verbruik_lpm":{"waarde":0,"eenheid":"l/min","bron":"[aangenomen] verbruik door de watergift; zet het op het scherm per bak"},"zuurbak_inhoud_l":{"waarde":500,"eenheid":"L","bron":"[aangenomen]"},"zuurbak_meetbereik_l":{"waarde":500,"eenheid":"L","bron":"[aangenomen]"},"zuurbak_schakelaar_l":{"waarde":475,"eenheid":"L","bron":"[aangenomen]"},"zuurbak_begin_l":{"waarde":200,"eenheid":"L","bron":"[aangenomen]"},"sporen_inhoud_l":{"waarde":150,"eenheid":"L","bron":"[aangenomen] gelijk aan de testconfiguratie van het dashboard (volSporenbak 150); was 250 tot 25-09"},"sporen_meetbereik_l":{"waarde":150,"eenheid":"L","bron":"[aangenomen] = de inhoud; was 250 tot 25-09"},"sporen_schakelaar_l":{"waarde":142,"eenheid":"L","bron":"[aangenomen] 95 % van de inhoud; was 235 tot 25-09"},"sporen_begin_l":{"waarde":90,"eenheid":"L","bron":"[aangenomen] was 100 tot 25-09"},"sporen_menger_min_l":{"waarde":40,"eenheid":"L","bron":"[aangenomen] doc: de menger gaat aan vanaf een instelbaar niveau; was 60 tot 25-09"},"voorraad_begin_l":{"waarde":1500,"eenheid":"L","bron":"[doc] minimaal 1500 liter voorraad per meststof"},"voorraad_bijna_leeg_l":{"waarde":100,"eenheid":"L","bron":"[aangenomen] waarschuwing in de nabootsing; op de machine is er geen meting (T7)"}},"signalen":{"schakelaar_nat_is_waar":{"waarde":true,"eenheid":"","bron":"[aangenomen] een niveauschakelaar geeft 1 als de vloeistof tot aan de schakelaar staat; nakijken in het E-plan (maak- of verbreekcontact)"},"alarm_is_waar":{"waarde":true,"eenheid":"","bron":"[aangenomen] een pompalarm en luchtdruk laag geven 1 bij alarm; nakijken in het E-plan"},"alarm_zet_pomp_stil":{"waarde":true,"eenheid":"","bron":"[aangenomen] een thermostaat- of thermisch alarm zet de pomp in de kast stil, buiten de PLC om"},"noodstop_zet_mengers_stil":{"waarde":true,"eenheid":"","bron":"[aangenomen] doc §8.3 noemt pompen en magneetventielen; of de mengers ook uitgaan, staat niet in de doc"}},"ruis":{"niveau_l":{"waarde":1.0,"eenheid":"L","bron":"[aangenomen] meetruis op een niveausensor"},"rondpompen_l":{"waarde":4.0,"eenheid":"L","bron":"[aangenomen] onrust op de meting in de tussenbak zolang hij rondgepompt wordt"}},"stroperigheid":{"_uitleg":{"waarde":1.0,"eenheid":"","bron":"per stof: 1,0 = als water; 0,8 = 20% minder debiet bij dezelfde frequentie. [aangenomen] allemaal 1,0 tot het gemeten is (O7)"}}}/*@/PARAMETERS@*/;
  const WATER = 'Water';

  /* parameters.json als platte dict {'groep.naam': waarde}, plus de bronnen apart */
  function leesParameters(ruw) {
    ruw = ruw || PARAMETERS;
    const waarden = {}, bronnen = {};
    Object.keys(ruw).forEach(groep => {
      if (groep.startsWith('_')) return;
      const inhoud = ruw[groep];
      Object.keys(inhoud).forEach(naam => {
        if (naam.startsWith('_')) return;
        const v = inhoud[naam]; const sleutel = groep + '.' + naam;
        waarden[sleutel] = (v && typeof v === 'object') ? v.waarde : v;
        bronnen[sleutel] = (v && typeof v === 'object') ? v : { waarde: v };
      });
    });
    return { waarden, bronnen };
  }

  /* ---------------- toeval, herhaalbaar (mulberry32 + Box-Muller) ---------------- */
  function Toeval(zaad) {
    let a = (zaad >>> 0) || 1;
    this.random = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    this.gauss = function (mu, sigma) { let u = 0, v = 0; while (u === 0) u = this.random(); while (v === 0) v = this.random(); return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); };
  }

  /* ---------------- samenstelling: {stof: liters} in een bak, {stof: fractie} in een stroom ---------------- */
  function norm(d) {
    const tot = Object.values(d).reduce((a, b) => a + b, 0);
    if (tot <= 1e-12) return { [WATER]: 1.0 };
    const uit = {}; Object.keys(d).forEach(k => { if (d[k] > 0) uit[k] = d[k] / tot; }); return uit;
  }
  function zelfde(a, b, eps) {
    eps = eps || 1e-6;
    const ks = new Set(Object.keys(a).concat(Object.keys(b)));
    for (const k of ks) if (Math.abs((a[k] || 0) - (b[k] || 0)) > eps) return false;
    return true;
  }

  /* De transportleiding als prop-stroming: wat er als eerste in ging, komt er als eerste uit. */
  class Leiding {
    constructor(inhoudL) { this.inhoud = Number(inhoudL); this.delen = [[this.inhoud, { [WATER]: 1.0 }]]; }   // kop = uitgang (bestemmingen)
    duw(dv, samenstelling) {
      if (dv <= 0) return [];
      const staart = this.delen[this.delen.length - 1];
      if (zelfde(staart[1], samenstelling)) staart[0] += dv; else this.delen.push([dv, Object.assign({}, samenstelling)]);
      const uit = []; let weg = dv;
      while (weg > 1e-12 && this.delen.length) {
        const kop = this.delen[0]; const neem = Math.min(kop[0], weg);
        uit.push([neem, kop[1]]); kop[0] -= neem; weg -= neem;
        if (kop[0] <= 1e-12) this.delen.shift();
      }
      while (this.delen.length > 200) {          // samenvoegen, anders groeit de lijst bij veel wisselen
        const a = this.delen.shift(); const b = this.delen[0]; const tot = a[0] + b[0]; const mix = {};
        Object.keys(a[1]).forEach(k => { mix[k] = (mix[k] || 0) + a[1][k] * a[0] / tot; });
        Object.keys(b[1]).forEach(k => { mix[k] = (mix[k] || 0) + b[1][k] * b[0] / tot; });
        b[0] = tot; b[1] = mix;
      }
      return uit;
    }
    perStof() { const tel = {}; this.delen.forEach(([vol, sam]) => { Object.keys(sam).forEach(k => { tel[k] = (tel[k] || 0) + vol * sam[k]; }); }); return tel; }
    nietWater() { const p = this.perStof(); return Object.keys(p).filter(k => k !== WATER).reduce((a, k) => a + p[k], 0); }
    toestand() { return { inhoud: this.inhoud, delen: this.delen.map(([v, s]) => [v, Object.assign({}, s)]) }; }
    herstel(t) { this.inhoud = t.inhoud; this.delen = t.delen.map(([v, s]) => [v, Object.assign({}, s)]); }
  }

  class Bak {
    constructor(loc, naam, soort, inhoudL, meetbereikL, volumeL, beginstof, kant) {
      this.loc = loc; this.naam = naam; this.soort = soort; this.kant = kant || null;
      this.inhoud = Number(inhoudL); this.meetbereik = Number(meetbereikL);
      this.stoffen = {}; if (volumeL > 0) this.stoffen[beginstof] = Number(volumeL);
      this.overgelopen = 0.0; this.verbruikLpm = 0.0;
      this.rondgepompt = 0.0;          // liter rondgepompt sinds de laatste toevoeging
    }
    get volume() { return Object.values(this.stoffen).reduce((a, b) => a + b, 0); }
    erbij(dv, samenstelling) {
      if (dv <= 0) return 0.0;
      Object.keys(samenstelling).forEach(k => { this.stoffen[k] = (this.stoffen[k] || 0) + dv * samenstelling[k]; });
      this.rondgepompt = 0.0;
      const over = this.volume - this.inhoud;
      if (over > 0) { this._eraf(over); this.overgelopen += over; return over; }   // overloop: weg uit de bak, in dezelfde verhouding
      return 0.0;
    }
    _eraf(dv) {
      const vol = this.volume; if (vol <= 1e-12 || dv <= 0) return {};
      dv = Math.min(dv, vol); const frac = {};
      Object.keys(this.stoffen).forEach(k => { if (this.stoffen[k] > 0) frac[k] = this.stoffen[k] / vol; });
      Object.keys(frac).forEach(k => { this.stoffen[k] -= dv * frac[k]; if (this.stoffen[k] <= 1e-9) delete this.stoffen[k]; });
      return frac;
    }
    eraf(dv) { const vol = this.volume; dv = Math.min(Math.max(dv, 0.0), vol); return [dv, this._eraf(dv)]; }   // [werkelijk, samenstelling]
    zetVolume(liter) {
      liter = Math.max(0.0, Math.min(Number(liter), this.inhoud)); const vol = this.volume;
      if (liter < vol) this._eraf(vol - liter);
      else if (liter > vol) { const sam = vol > 1e-9 ? norm(Object.assign({}, this.stoffen)) : { [WATER]: 1.0 }; Object.keys(sam).forEach(k => { this.stoffen[k] = (this.stoffen[k] || 0) + (liter - vol) * sam[k]; }); }
    }
    toestand() { return { stoffen: Object.assign({}, this.stoffen), overgelopen: this.overgelopen, verbruikLpm: this.verbruikLpm, rondgepompt: this.rondgepompt }; }
    herstel(t) { this.stoffen = Object.assign({}, t.stoffen); this.overgelopen = t.overgelopen; this.verbruikLpm = t.verbruikLpm; this.rondgepompt = t.rondgepompt; }
  }

  /* Pneumatische afsluiter met magneetventiel. Beweegt alleen met perslucht. */
  class Klep {
    constructor(kid, naam, rol) { this.id = kid; this.naam = naam; this.rol = rol; this.stand = 0.0; this.storing = null; this.lekLpm = 1.0; this.wildeBewegenZonderLucht = false; }
    stap(dt, bekrachtigd, lucht, looptijd) {
      let doel = bekrachtigd ? 1.0 : 0.0;
      if (this.storing === 'gaat_niet_open') doel = Math.min(doel, this.stand);        // kan nog wel dicht, maar niet meer open
      else if (this.storing === 'gaat_niet_dicht') doel = Math.max(doel, this.stand);  // kan nog wel open, maar niet meer dicht
      this.wildeBewegenZonderLucht = !lucht && Math.abs(doel - this.stand) > 0.01;
      if (!lucht || this.storing === 'vast') return;
      const st = dt / Math.max(looptijd, 1e-3);
      if (doel > this.stand) this.stand = Math.min(doel, this.stand + st);
      else if (doel < this.stand) this.stand = Math.max(doel, this.stand - st);
    }
    doorlaat(qVolLpm) {   // hoe ver de klep doorlaat (0..1), met een lek als hij dicht is
      const lek = (this.storing === 'lekt' && qVolLpm > 0) ? this.lekLpm / qVolLpm : 0.0;
      return this.stand < 0.02 ? Math.max(this.stand, Math.min(1.0, lek)) : this.stand;
    }
    toestand() { return { stand: this.stand, storing: this.storing, lekLpm: this.lekLpm }; }
    herstel(t) { this.stand = t.stand; this.storing = t.storing; this.lekLpm = t.lekLpm; }
  }

  /* Gemeenschappelijk voor de systeempomp en de meng-/transportpompen: warmte, water, alarmen. */
  class Pomp {
    constructor(sleutel, naam) {
      this.sleutel = sleutel; this.naam = naam;
      this.water = 1.0;                 // 1 = vol water, 0 = droog
      this.warmte = 0.0;                // 1 = alarmtemperatuur
      this.alarmThermostaat = false;    // vastgehouden tot reset
      this.alarmThermisch = false;
      this.storingThermisch = false;    // met de hand: overbelasting
      this.draait = false; this.debiet = 0.0; this.tegenDichtS = 0.0; this.droogS = 0.0; this.vorigeReset = false;
      this.hz = 0.0;
    }
    alarm() { return this.alarmThermostaat || this.alarmThermisch; }
    reset() {   // reset van de motorbeveiliging: lukt alleen als de oorzaak weg is
      let gelukt = false;
      if (this.alarmThermostaat && this.warmte < 0.5) { this.alarmThermostaat = false; gelukt = true; }
      if (this.alarmThermisch && !this.storingThermisch) { this.alarmThermisch = false; gelukt = true; }
      return gelukt;
    }
    warmteStap(dt, tegenDicht, droog, pDicht, pDroog, pKoel) {
      if (this.draait && tegenDicht) this.warmte += dt / pDicht;
      else if (this.draait && droog) this.warmte += dt / pDroog;
      else this.warmte -= dt / pKoel;
      this.warmte = Math.min(1.3, Math.max(0.0, this.warmte));
      if (this.warmte >= 1.0) this.alarmThermostaat = true;
      if (this.storingThermisch) this.alarmThermisch = true;
    }
    toestand() { return { water: this.water, warmte: this.warmte, alarmThermostaat: this.alarmThermostaat, alarmThermisch: this.alarmThermisch, storingThermisch: this.storingThermisch, draait: this.draait, debiet: this.debiet, tegenDichtS: this.tegenDichtS, droogS: this.droogS, vorigeReset: this.vorigeReset, hz: this.hz }; }
    herstel(t) { Object.assign(this, t); }
  }

  /* ---------------- de definitie: welke klem welke rol heeft, uit MACHINE (de IO-mapping van het dashboard) ---------------- */
  function definitie(MACHINE) {
    const fouten = [];
    const adres = {}; MACHINE.kanalen.forEach(k => { adres[k.adres] = k; });
    const locs = {}; MACHINE.locaties.forEach(l => { locs[l.ref] = l; });
    const bakken = {};
    MACHINE.locaties.slice().sort((a, b) => a.volgorde - b.volgorde).forEach(l => {
      const g = String(l.groep || '').toLowerCase();
      const soort = g === 'toevoer' ? 'water' : g === 'voorraadtank' ? 'voorraad' : g === 'sporentank' ? 'sporen' : g === 'zuurbak' ? 'zuurbak' : g === 'tussenbak' ? 'tussenbak' : g.startsWith('werkbak') ? 'werkbak' : null;
      if (!soort) return;
      let kant = null;
      if (soort === 'tussenbak') kant = l.naam.trim().slice(-1).toUpperCase(); else if (soort === 'werkbak') kant = l.groep.trim().slice(-1).toUpperCase();
      bakken[l.ref] = { loc: l.ref, naam: l.naam, soort, kant, volgorde: l.volgorde, stof: soort === 'voorraad' ? l.naam : null, aanzuig: null, vul: null, sensor: null, schakelaars: [], menger: null };
    });
    const pompen = { SYS: { naam: 'Systeempomp', vrijgave: null, hoog: null, setpoint: null, reset: null, bedrijf: null, hoogMelding: null, storing: null, thermostaat: null, thermisch: null, water: null } };
    ['A', 'B'].forEach(kant => { pompen[kant] = { naam: 'Meng-/transportpomp ' + kant, aan: null, reset: null, bedrijf: null, storing: null, mengBedrijf: null, thermostaat: null, thermisch: null, water: null, mengklep: null, werkbakken: [] }; });
    const overig = { luchtdruk: null, flowmeter: null, algemeen: null };
    const kanalen = [];
    const rolVan = {};
    function kan(c, i) { const a = (c.io || [])[i]; const k = a ? adres[a] : null; if (!k) fouten.push(c.ref + ': klem ' + i + ' (' + a + ') staat niet in de IO-lijst'); return k; }
    function zet(k, rol, c) { if (!k) return; rolVan[k.sleutel] = { rol, ref: c.ref }; }
    MACHINE.componenten.forEach(c => {
      const oms = String(c.oms || '').toLowerCase(); const loc = c.loc; const b = bakken[loc];
      const kant = b ? b.kant : (loc === 'LOC-TBA' ? 'A' : loc === 'LOC-TBB' ? 'B' : null);
      if (c.soort === 'Klep') {
        const k = kan(c, 0); if (!k) return;
        if (oms.startsWith('aanzuigklep') && b) { b.aanzuig = k.sleutel; zet(k, ['aanzuigklep', loc], c); }
        else if (oms.startsWith('vulklep') && b && b.soort === 'werkbak') { b.vul = k.sleutel; pompen[b.kant].werkbakken.push([loc, k.sleutel]); zet(k, ['werkbakklep', loc], c); }
        else if (oms.startsWith('vulklep') && b) { b.vul = k.sleutel; zet(k, ['vulklep', loc], c); }
        else if (oms.startsWith('mengklep') && kant) { pompen[kant].mengklep = k.sleutel; zet(k, ['mengklep', kant], c); }
        else fouten.push('klep ' + c.ref + " ('" + c.oms + "') kent de nabootsing niet");
      } else if (c.soort === 'Pomp') {
        if (c.ref === 'FCS1' || oms.includes('hoofdpomp') || oms.includes('systeempomp') || oms.includes('vulpomp')) {
          (c.io || []).forEach((a, i) => {
            const k = adres[a]; if (!k) { fouten.push(c.ref + ': klem ' + a + ' ontbreekt'); return; }
            const f = String(k.functie || '').toLowerCase();
            if (k.type === 'AO') { pompen.SYS.setpoint = k.sleutel; zet(k, ['setpoint', 'SYS'], c); }
            else if (k.type === 'DO' && f.includes('hoog')) { pompen.SYS.hoog = k.sleutel; zet(k, ['hoog', 'SYS'], c); }
            else if (k.type === 'DO') { pompen.SYS.vrijgave = k.sleutel; zet(k, ['vrijgave', 'SYS'], c); }
          });
        } else if (kant) { const k = kan(c, 0); if (k) { pompen[kant].aan = k.sleutel; zet(k, ['pomp', kant], c); } }
        else fouten.push('pomp ' + c.ref + ' zonder kant');
      } else if (c.soort === 'Flowmeter') { const k = kan(c, 0); if (k) { overig.flowmeter = k.sleutel; zet(k, ['flowmeter', null], c); } }
      else if (c.soort === 'Menger') { const k = kan(c, 0); if (k && b) { b.menger = k.sleutel; zet(k, ['menger', loc], c); } }
      else if (c.soort === 'Niveauschakelaar') { const k = kan(c, 0); if (k && b) { const hoogte = oms.includes('laag') ? 'laag' : 'hoog'; b.schakelaars.push([k.sleutel, hoogte]); zet(k, ['niveauschakelaar', loc, hoogte], c); } }
      else if (c.soort === 'Niveausensor') { const k = kan(c, 0); if (k && b) { b.sensor = k.sleutel; zet(k, ['niveausensor', loc], c); } }
      else if (c.soort === 'Drukschakelaar') { const k = kan(c, 0); if (k) { overig.luchtdruk = k.sleutel; zet(k, ['luchtdruk', null], c); } }
      else if (c.soort === 'Bedrijfsmelding' || c.soort === 'Storingsmelding') {
        const k = kan(c, 0); if (!k) return;
        const r = String(c.ref); const st = c.soort === 'Storingsmelding';
        const pomp = /FCS1/.test(r) ? 'SYS' : /VP02|MTBA/.test(r) ? 'A' : /VP03|MTBB/.test(r) ? 'B' : null;
        if (r === 'BM-ALG' || oms.includes('algemene')) { overig.algemeen = k.sleutel; zet(k, ['algemeen', null], c); }
        else if (!pomp) fouten.push('melding ' + r + ' zonder pomp');
        else if (st) { pompen[pomp].storing = k.sleutel; zet(k, ['storing', pomp], c); }
        else if (/^HM-/.test(r) || oms.includes('hoog toeren')) { pompen[pomp].hoogMelding = k.sleutel; zet(k, ['hoogmelding', pomp], c); }
        else if (/MTB/.test(r) || oms.includes('menger')) { pompen[pomp].mengBedrijf = k.sleutel; zet(k, ['mengbedrijf', pomp], c); }
        else { pompen[pomp].bedrijf = k.sleutel; zet(k, ['bedrijf', pomp], c); }
      }
    });
    MACHINE.kanalen.forEach(k => {
      const r = rolVan[k.sleutel] || null;
      kanalen.push({ id: k.sleutel, sleutel: k.sleutel, adres: k.adres, ref: k.ref, soort: k.type, functie: k.functie, oms: k.oms, vrij: !!k.vrij, rol: r ? r.rol : null, richting: (k.type === 'DO' || k.type === 'AO') ? 'uit' : 'in' });
    });
    Object.values(bakken).forEach(b => {
      if (['water', 'voorraad', 'sporen'].includes(b.soort) && !b.aanzuig) fouten.push('ontbreekt: aanzuigklep van ' + b.naam);
      if (['tussenbak', 'zuurbak', 'sporen', 'werkbak'].includes(b.soort)) { if (!b.vul) fouten.push('ontbreekt: vulklep van ' + b.naam); if (!b.sensor) fouten.push('ontbreekt: niveausensor van ' + b.naam); }
      if (b.soort === 'sporen' && !b.menger) fouten.push('ontbreekt: menger van ' + b.naam);
    });
    if (!pompen.SYS.vrijgave) fouten.push('ontbreekt: vrijgave van de systeempomp');
    if (!pompen.SYS.setpoint) fouten.push('ontbreekt: setpoint van de systeempomp');
    ['A', 'B'].forEach(kant => { if (!pompen[kant].aan) fouten.push('ontbreekt: meng-/transportpomp ' + kant); if (!pompen[kant].mengklep) fouten.push('ontbreekt: mengklep ' + kant); if (pompen[kant].werkbakken.length !== 3) fouten.push('kant ' + kant + ' heeft ' + pompen[kant].werkbakken.length + ' werkbakkleppen, verwacht 3'); });
    if (!overig.flowmeter) fouten.push('ontbreekt: flowmeter');
    if (!overig.luchtdruk) fouten.push('ontbreekt: luchtdrukschakelaar');
    return { kanalen, bakken, pompen, overig, fouten };
  }

  /* ---------------- het model ---------------- */
  class Model {
    constructor(def, parameters, zaad) {
      this.d = def;
      const p = parameters || leesParameters(); this.p = p.waarden; this.bronnen = p.bronnen;
      this.rng = new Toeval(zaad || 1);
      this.kanaal = {}; def.kanalen.forEach(k => { this.kanaal[k.id] = k; });
      this.uitgangIds = def.kanalen.filter(k => k.richting === 'uit').map(k => k.id);
      this.ingangIds = def.kanalen.filter(k => k.richting === 'in').map(k => k.id);
      this.opnieuw();
    }
    // ---------------------------------------------------------------- begintoestand
    opnieuw() {
      const p = this.p;
      this.t = 0.0;
      this.uitgangen = {}; this.uitgangIds.forEach(kid => { this.uitgangen[kid] = this.kanaal[kid].soort === 'AO' ? 0 : false; });
      this.ingangen = {};
      this.noodstop = false; this.lucht = true;
      this.handafsluiter = { zuig: true, A: true, B: true };
      this.bakken = {};
      Object.keys(this.d.bakken).forEach(loc => {
        const b = this.d.bakken[loc]; const s = b.soort; if (s === 'water') return;
        const maat = { tussenbak: ['tussenbak_inhoud_l', 'tussenbak_meetbereik_l', 'tussenbak_begin_l', 'Leeg'],
          werkbak: ['werkbak_inhoud_l', 'werkbak_meetbereik_l', 'werkbak_begin_l', 'Voedingsoplossing (begin)'],
          zuurbak: ['zuurbak_inhoud_l', 'zuurbak_meetbereik_l', 'zuurbak_begin_l', 'Zuuroplossing (begin)'],
          sporen: ['sporen_inhoud_l', 'sporen_meetbereik_l', 'sporen_begin_l', b.naam + ' (begin)'],
          voorraad: [null, null, 'voorraad_begin_l', b.naam] }[s];
        const inhoud = maat[0] ? p['bakken.' + maat[0]] : 1e9;
        const meet = maat[1] ? p['bakken.' + maat[1]] : inhoud;
        const bak = new Bak(loc, b.naam, s, inhoud, meet, p['bakken.' + maat[2]], maat[3], b.kant);
        if (s === 'werkbak') bak.verbruikLpm = p['bakken.werkbak_verbruik_lpm'];
        this.bakken[loc] = bak;
      });
      this.leiding = new Leiding(p['leiding.inhoud_l']);
      this.kleppen = {};
      Object.keys(this.d.bakken).forEach(loc => {
        const b = this.d.bakken[loc];
        if (b.aanzuig) this.kleppen[b.aanzuig] = new Klep(b.aanzuig, 'aanzuigklep ' + b.naam, ['aanzuig', loc]);
        if (b.vul) this.kleppen[b.vul] = new Klep(b.vul, 'vulklep ' + b.naam, [b.soort === 'werkbak' ? 'werkbak' : 'vul', loc]);
      });
      ['A', 'B'].forEach(kant => { const mk = this.d.pompen[kant].mengklep; this.kleppen[mk] = new Klep(mk, 'mengklep tussenbak ' + kant, ['meng', kant]); });
      this.sys = new Pomp('SYS', 'Systeempomp'); this.sys.hz = 0.0;
      this.vp = { A: new Pomp('A', 'Meng-/transportpomp A'), B: new Pomp('B', 'Meng-/transportpomp B') };
      this.flow = { pulsen: 0.0, liters: 0.0, lpm: 0.0, hz: 0.0, defect: false, kalFoutPct: 0.0, tellerStart: 0 };
      this.sensor = {}; this.ingangIds.forEach(kid => { this.sensor[kid] = { storing: null, afwijkingL: 0.0, vast: null, ruis: 0.0 }; });
      this.mengersDraaien = {};
      this.meldingen = []; this.meldingNr = 0;
      this.actief = {};                  // sleutel -> {sinds, niveau, tekst, gemeld}
      this._vorigeBestemmingen = '';
      this._vorigeAflever = { A: null, B: null };
      this._vorigeUitgangen = Object.assign({}, this.uitgangen);
      this.melding('info', 'Nabootsing gestart: werkbakken op ' + p['bakken.werkbak_begin_l'] + ' L, tussenbakken leeg, voorraadtanks ' + p['bakken.voorraad_begin_l'] + ' L.');
      this._rekenIngangen(0.0);
    }
    // ---------------------------------------------------------------- meldingen
    melding(niveau, tekst) { this.meldingNr += 1; this.meldingen.push({ nr: this.meldingNr, t: Math.round(this.t * 100) / 100, niveau, tekst }); if (this.meldingen.length > 600) this.meldingen.shift(); }
    conditie(sleutel, waar, niveau, tekst, naS) {   // een toestand die kan beginnen en ophouden: meldt het begin (na naS s) en het einde
      naS = naS || 0.0; let c = this.actief[sleutel];
      if (waar) {
        if (!c) c = this.actief[sleutel] = { sinds: this.t, niveau, tekst, gemeld: false };
        c.tekst = tekst;
        if (!c.gemeld && this.t - c.sinds >= naS) { c.gemeld = true; this.melding(niveau, tekst); }
      } else if (c) {
        if (c.gemeld) this.melding('voorbij', 'Voorbij na ' + Math.round(this.t - c.sinds) + ' s: ' + c.tekst);
        delete this.actief[sleutel];
      }
    }
    // ---------------------------------------------------------------- hulpjes
    boolUit(kid) { return !!(kid && this.uitgangen[kid]); }
    setpointHz() {
      const kid = this.d.pompen.SYS.setpoint; let ruw = Math.trunc(Number(this.uitgangen[kid] || 0));
      if (ruw >= 32768) return 0.0;              // WORD boven 0x7FFF: geen geldige waarde
      ruw = Math.max(0, Math.min(ruw, Math.trunc(this.p['analoog.ruw_max'])));
      const ma = 4.0 + 16.0 * (ruw - this.p['analoog.ruw_bij_4mA']) / (this.p['analoog.ruw_bij_20mA'] - this.p['analoog.ruw_bij_4mA']);
      const h4 = this.p['systeempomp.hz_bij_4mA'], h20 = this.p['systeempomp.hz_bij_20mA'];
      return Math.max(0.0, h4 + (ma - 4.0) / 16.0 * (h20 - h4));
    }
    hzNaarRuw(hz) {
      const h4 = this.p['systeempomp.hz_bij_4mA'], h20 = this.p['systeempomp.hz_bij_20mA']; const frac = (hz - h4) / (h20 - h4);
      return Math.round(this.p['analoog.ruw_bij_4mA'] + frac * (this.p['analoog.ruw_bij_20mA'] - this.p['analoog.ruw_bij_4mA']));
    }
    stroperig(stof) { const v = this.p['stroperigheid.' + stof]; return v === undefined ? 1.0 : Number(v); }
    // ---------------------------------------------------------------- een stap
    step(dt) {
      if (dt <= 0) return;
      const p = this.p; const spanning = !this.noodstop; const looptijd = p['kleppen.looptijd_s'];
      // 1. de kleppen
      Object.values(this.kleppen).forEach(k => { k.stap(dt, spanning && this.boolUit(k.id), this.lucht, looptijd); });
      const zonderLucht = Object.values(this.kleppen).filter(k => k.wildeBewegenZonderLucht).map(k => k.naam);
      this.conditie('klep_zonder_lucht', zonderLucht.length > 0, 'fout', 'Geen perslucht: ' + (zonderLucht.length === 1 ? 'een klep' : zonderLucht.length + ' kleppen') + ' kan niet bewegen (' + zonderLucht.slice(0, 4).join(', ') + (zonderLucht.length > 4 ? ' …' : '') + ').');
      this._over = new Set();
      this._doseerkring(dt, spanning);
      ['A', 'B'].forEach(kant => { this._afleverkring(dt, kant, spanning); });
      this._mengers(dt, spanning);
      this._verbruik(dt);
      this._resets();
      Object.keys(this.bakken).forEach(loc => { const bak = this.bakken[loc]; if (bak.soort !== 'voorraad') this.conditie('over_' + loc, this._over.has(loc), 'fout', bak.naam + ' loopt over: ' + bak.overgelopen.toFixed(1) + ' L over de rand sinds het begin.'); });
      this.t += dt;
      this._rekenIngangen(dt);
      this._vorigeUitgangen = Object.assign({}, this.uitgangen);
    }
    _doseerkring(dt, spanning) {
      const p = this.p, pomp = this.sys, pdef = this.d.pompen.SYS;
      const q50 = p['systeempomp.debiet_bij_50hz_lpm'];
      let vrij = this.boolUit(pdef.vrijgave);
      if (p['signalen.alarm_zet_pomp_stil'] && pomp.alarm()) vrij = false;
      const doel = (vrij && spanning) ? this.setpointHz() : 0.0;
      if (doel > pomp.hz) pomp.hz = Math.min(doel, pomp.hz + p['systeempomp.aanloop_hz_per_s'] * dt);
      else pomp.hz = Math.max(doel, pomp.hz - p['systeempomp.uitloop_hz_per_s'] * dt);
      const f0 = p['systeempomp.hz_zonder_opbrengst'];
      pomp.draait = pomp.hz > f0 + 0.2;
      const qmax = q50 * Math.max(0.0, Math.min(1.2, (pomp.hz - f0) / (50.0 - f0)));
      // zuigkant: welke bronnen, en hebben ze vloeistof
      const zuig = []; let openSom = 0.0;
      Object.keys(this.d.bakken).forEach(loc => {
        const b = this.d.bakken[loc]; if (!b.aanzuig) return;
        const o = this.kleppen[b.aanzuig].doorlaat(q50); if (o <= 1e-6) return;
        openSom += o;
        const heeft = this.handafsluiter.zuig && (b.soort === 'water' || this.bakken[loc].volume > 0.5);
        zuig.push([loc, o, heeft ? 1.0 : 0.0]);
      });
      const sTot = zuig.reduce((a, [, o, h]) => a + o * h, 0);
      // perskant: de bestemmingen van de doseerkring
      const pers = [];
      Object.keys(this.d.bakken).forEach(loc => { const b = this.d.bakken[loc]; if (b.vul && b.soort !== 'werkbak') { const o = this.kleppen[b.vul].doorlaat(q50); if (o > 1e-6) pers.push([loc, o]); } });
      const dTot = pers.reduce((a, [, o]) => a + o, 0);
      const luchtZuigen = pomp.draait && openSom > 0 && sTot < 0.01;
      if (luchtZuigen) pomp.water = Math.max(0.0, pomp.water - dt / p['systeempomp.droog_na_s']);
      else if (sTot > 0) pomp.water = Math.min(1.0, pomp.water + dt / p['systeempomp.vullen_s']);
      const visc = sTot > 0 ? zuig.reduce((a, [loc, o, h]) => a + o * h * this.stroperig(this._bronstof(loc)), 0) / sTot : 1.0;
      let q = qmax * Math.min(1.0, sTot) * Math.min(1.0, dTot) * pomp.water * visc;
      if (q < 1e-4) q = 0.0;
      pomp.debiet = q;
      const tegenDicht = pomp.draait && (openSom < 1e-3 || dTot < 1e-3);
      pomp.tegenDichtS = tegenDicht ? pomp.tegenDichtS + dt : 0.0;
      pomp.droogS = (pomp.draait && pomp.water < 0.5) ? pomp.droogS + dt : 0.0;
      const wasAlarm = pomp.alarmThermostaat;
      pomp.warmteStap(dt, tegenDicht, pomp.water < 0.5, p['systeempomp.tegen_dicht_tot_alarm_s'], p['systeempomp.droog_tot_alarm_s'], p['systeempomp.afkoelen_s']);
      if (pomp.alarmThermostaat && !wasAlarm) this.melding('fout', 'Systeempomp: thermostaatalarm (te warm). De pomp staat stil tot de reset.');
      // de stroom zelf
      const dv = q / 60.0 * dt;
      if (dv > 0) {
        const aandeel = {};
        zuig.forEach(([loc, o, h]) => {
          if (h <= 0) return;
          const w = o * h / sTot; const stofBak = this.bakken[loc];
          if (!stofBak) aandeel[WATER] = (aandeel[WATER] || 0) + w;   // water uit de leiding
          else { const [genomen, sam] = stofBak.eraf(dv * w); Object.keys(sam).forEach(k => { aandeel[k] = (aandeel[k] || 0) + sam[k] * (genomen / dv); }); }
        });
        const samIn = norm(aandeel);
        const uit = this.leiding.duw(dv, samIn);
        uit.forEach(([vol, sam]) => { pers.forEach(([loc, o]) => { if (this.bakken[loc].erbij(vol * o / dTot, sam) > 0) this._over.add(loc); }); });
        const fm = this.flow;
        if (!fm.defect) {
          const eff = this._meterfactor(q);
          const pulsS = Math.min(q / 60.0 * p['flowmeter.pulsen_per_liter'] * eff * (1 + fm.kalFoutPct / 100.0), p['flowmeter.max_hz']);
          fm.pulsen += pulsS * dt; fm.hz = pulsS;
        } else fm.hz = 0.0;
        fm.liters += dv;
      } else this.flow.hz = 0.0;
      this.flow.lpm = q;
      // wat er misgaat in de doseerkring
      const openBronnen = zuig.filter(([, o]) => o > 0.5).map(([loc]) => this.d.bakken[loc].naam);
      this.conditie('twee_bronnen', q > 0 && openBronnen.length > 1, 'fout', 'Twee bronnen tegelijk open: ' + openBronnen.join(' en ') + '. De flowmeter meet een som.');
      const openBest = pers.filter(([, o]) => o > 0.5).map(([loc]) => this.d.bakken[loc].naam);
      this.conditie('twee_bestemmingen', q > 0 && openBest.length > 1, 'fout', 'Twee bestemmingen tegelijk open: ' + openBest.join(' en ') + '.');
      this.conditie('sys_tegen_dicht', tegenDicht, 'waarschuwing', 'Systeempomp draait tegen dichte kleppen (' + (openSom < 1e-3 ? 'geen bron open' : 'geen bestemming open') + ').', 2.0);
      this.conditie('sys_lucht', luchtZuigen, 'fout', 'Systeempomp zuigt lucht: de open bron is leeg' + (!this.handafsluiter.zuig ? ' of de handafsluiter in de zuigleiding is dicht' : '') + '.');
      this.conditie('sys_droog', pomp.draait && pomp.water < 0.5, 'fout', 'Systeempomp loopt droog.', 1.0);
      this.conditie('flow_laag', q > 0 && q < p['flowmeter.betrouwbaar_vanaf_lpm'], 'waarschuwing', 'Debiet ' + q.toFixed(1) + ' l/min: onder 4 l/min telt de flowmeter te weinig.', 1.0);
      this.conditie('flow_hoog', q > 100.0, 'waarschuwing', 'Debiet boven 100 l/min: buiten het bereik van FC 01.');
      this.conditie('noodstop_sys', this.noodstop && vrij, 'fout', 'Noodstop: de systeempomp krijgt vrijgave van de PLC maar heeft geen spanning. De PLC ziet dit alleen aan de flowmeter (doc §8.3).', 0.5);
      // leidingrest die naar een andere bestemming gaat
      const nu = pers.filter(([, o]) => o > 0.5).map(([loc]) => loc).sort().join('|');
      if (q > 0 && nu && nu !== this._vorigeBestemmingen) {
        const ps = this.leiding.perStof(); const rest = Object.keys(ps).filter(k => k !== WATER && ps[k] > 0.05);
        if (rest.length) this.melding('waarschuwing', 'Leidingrest gaat naar ' + nu.split('|').map(l => this.bakken[l].naam).join(' en ') + ': ' + rest.sort((a, b) => ps[b] - ps[a]).map(k => ps[k].toFixed(2) + ' L ' + k).join(', ') + '.');
        this._vorigeBestemmingen = nu;
      }
      // sporenbak als bron en als bestemming tegelijk, of als bron terwijl de menger draait
      Object.keys(this.d.bakken).forEach(loc => {
        const b = this.d.bakken[loc]; if (b.soort !== 'sporen') return;
        const bronOpen = this.kleppen[b.aanzuig].stand > 0.5;
        this.conditie('sp_rond_' + loc, q > 0 && bronOpen && this.kleppen[b.vul].stand > 0.5, 'fout', b.naam + ' is tegelijk bron en bestemming.');
        this.conditie('sp_menger_' + loc, q > 0 && bronOpen && !!this.mengersDraaien[loc], 'waarschuwing', b.naam + ' wordt als bron gebruikt terwijl zijn menger draait (doc §8.1).');
      });
      Object.keys(this.bakken).forEach(loc => {
        const bak = this.bakken[loc]; if (bak.soort !== 'voorraad') return;
        this.conditie('leeg_' + loc, bak.volume < 0.5, 'fout', 'Voorraadtank ' + bak.naam + ' is leeg (op de machine niet gemeten).');
        this.conditie('bijna_' + loc, bak.volume >= 0.5 && bak.volume < p['bakken.voorraad_bijna_leeg_l'], 'waarschuwing', 'Voorraadtank ' + bak.naam + ' is bijna leeg: ' + Math.round(bak.volume) + ' L (op de machine niet gemeten).');
      });
    }
    _bronstof(loc) { const b = this.d.bakken[loc]; return b.soort === 'water' ? WATER : b.naam; }
    _meterfactor(q) {
      const hoog = this.p['flowmeter.betrouwbaar_vanaf_lpm'], laag = this.p['flowmeter.telt_niets_onder_lpm'];
      if (q >= hoog) return 1.0; if (q <= laag) return 0.0; return (q - laag) / (hoog - laag);
    }
    _afleverkring(dt, kant, spanning) {
      const p = this.p, pdef = this.d.pompen[kant], pomp = this.vp[kant];
      const tb = Object.values(this.bakken).find(b => b.soort === 'tussenbak' && b.kant === kant);
      let aan = this.boolUit(pdef.aan) && spanning;
      if (p['signalen.alarm_zet_pomp_stil'] && pomp.alarm()) aan = false;
      pomp.draait = aan;
      const qm = p['mengpomp.debiet_lpm'];
      const uitlaten = [['meng', this.kleppen[pdef.mengklep].doorlaat(qm)]];
      pdef.werkbakken.forEach(([loc, kid]) => { uitlaten.push([loc, this.kleppen[kid].doorlaat(qm)]); });
      const dTot = uitlaten.reduce((a, [, o]) => a + o, 0);
      const nat = this.handafsluiter[kant] && tb.volume > p['mengpomp.aanzuig_minimum_l'];
      if (aan && !nat) pomp.water = Math.max(0.0, pomp.water - dt / p['mengpomp.droog_na_s']);
      else if (nat) pomp.water = Math.min(1.0, pomp.water + dt / p['mengpomp.vullen_s']);
      const q = aan ? qm * Math.min(1.0, dTot) * pomp.water : 0.0;
      pomp.debiet = q;
      const tegenDicht = aan && dTot < 1e-3;
      const wasAlarm = pomp.alarmThermostaat;
      pomp.warmteStap(dt, tegenDicht, pomp.water < 0.5, p['mengpomp.tegen_dicht_tot_alarm_s'], p['mengpomp.droog_tot_alarm_s'], p['mengpomp.afkoelen_s']);
      if (pomp.alarmThermostaat && !wasAlarm) this.melding('fout', pomp.naam + ': thermostaatalarm (te warm). De pomp staat stil tot de reset.');
      let dv = q / 60.0 * dt;
      if (dv > 0 && dTot > 0) {
        dv = Math.min(dv, Math.max(0.0, tb.volume));
        uitlaten.forEach(([doel, o]) => {
          const deel = dv * o / dTot;
          if (doel === 'meng') tb.rondgepompt += deel;
          else { const [genomen, sam] = tb.eraf(deel); if (this.bakken[doel].erbij(genomen, sam) > 0) this._over.add(doel); }
        });
      }
      const openUit = uitlaten.filter(([, o]) => o > 0.5).map(([d]) => d === 'meng' ? 'mengklep' : this.bakken[d].naam);
      this.conditie('vp_dicht_' + kant, tegenDicht, 'fout', pomp.naam + ' draait tegen vier dichte kleppen.', 1.0);
      this.conditie('vp_twee_' + kant, aan && openUit.length > 1, 'fout', pomp.naam + ': twee kleppen tegelijk open (' + openUit.join(' en ') + ').');
      this.conditie('vp_droog_' + kant, aan && pomp.water < 0.5, 'fout', pomp.naam + ' loopt droog: ' + (!this.handafsluiter[kant] ? 'handafsluiter onder de tussenbak dicht' : 'tussenbak leeg') + '.', 0.5);
      this.conditie('noodstop_' + kant, this.noodstop && this.boolUit(pdef.aan), 'fout', 'Noodstop: ' + pomp.naam + ' krijgt een startcommando maar heeft geen spanning. De PLC kan dit niet zien (doc §8.3).', 0.5);
      // omschakelen onder druk: een van de vier kleppen wisselt terwijl de pomp draait
      const kids = [pdef.mengklep].concat(pdef.werkbakken.map(([, kid]) => kid));
      kids.forEach(kid => { if (pomp.debiet > 1.0 && !!this.uitgangen[kid] !== !!this._vorigeUitgangen[kid]) this.melding('waarschuwing', pomp.naam + ': klep ' + this.kleppen[kid].naam + ' omgeschakeld terwijl de pomp draait (omschakelen onder druk, doc §8.1).'); });
      // afleveren zonder te mengen
      const naarWerkbak = uitlaten.filter(([d, o]) => d !== 'meng' && o > 0.5).map(([d]) => d);
      const nu = (q > 1.0 && naarWerkbak.length) ? naarWerkbak[0] : null;
      if (nu && nu !== this._vorigeAflever[kant] && tb.volume > 1) {
        const keer = tb.volume > 1 ? tb.rondgepompt / tb.volume : 0.0;
        if (keer < 0.3) this.melding('waarschuwing', 'Tussenbak ' + kant + ' gaat naar ' + this.bakken[nu].naam + ' terwijl hij ' + keer.toFixed(1) + '× is rondgepompt sinds de laatste toevoeging: de batch is waarschijnlijk niet gemengd.');
      }
      this._vorigeAflever[kant] = nu;
    }
    _mengers(dt, spanning) {
      const p = this.p;
      Object.keys(this.d.bakken).forEach(loc => {
        const b = this.d.bakken[loc]; if (!b.menger) return;
        const aan = this.boolUit(b.menger) && (spanning || !p['signalen.noodstop_zet_mengers_stil']);
        this.mengersDraaien[loc] = aan;
        const bak = this.bakken[loc];
        this.conditie('menger_laag_' + loc, aan && bak.volume < p['bakken.sporen_menger_min_l'], 'waarschuwing', 'Menger van ' + bak.naam + ' draait bij ' + Math.round(bak.volume) + ' L: onder het minimum van ' + p['bakken.sporen_menger_min_l'] + ' L.', 1.0);
      });
    }
    _verbruik(dt) { Object.values(this.bakken).forEach(bak => { if (bak.verbruikLpm > 0) bak.eraf(bak.verbruikLpm / 60.0 * dt); }); }
    _resets() {   // de resetuitgangen van de pompalarmen: een opgaande flank reset de motorbeveiliging (niet in de IO-mapping van 21-09)
      [['SYS', this.sys], ['A', this.vp.A], ['B', this.vp.B]].forEach(([sleutel, pomp]) => {
        const kid = this.d.pompen[sleutel].reset; const nu = this.boolUit(kid);
        if (nu && !pomp.vorigeReset && pomp.alarm()) this.melding(pomp.reset() ? 'info' : 'waarschuwing', pomp.naam + (pomp.alarm() ? ': reset door de PLC lukt niet, de oorzaak is er nog.' : ': alarm gereset door de PLC.'));
        pomp.vorigeReset = nu;
      });
    }
    // ---------------------------------------------------------------- de ingangen van de PLC
    _rekenIngangen(dt) {
      const p = this.p, d = this.d; const natWaar = p['signalen.schakelaar_nat_is_waar']; const alarmWaar = p['signalen.alarm_is_waar'];
      const ing = {};
      Object.keys(d.bakken).forEach(loc => {
        const b = d.bakken[loc]; const bak = this.bakken[loc]; if (!bak) return;
        if (b.sensor) ing[b.sensor] = this._analoog(b.sensor, bak, dt);
        b.schakelaars.forEach(([kid, hoogte]) => {
          const niveau = this._schakelhoogte(bak, hoogte); let nat = bak.volume >= niveau; const s = this.sensor[kid];
          if (s.storing === 'dendert' && Math.abs(bak.volume - niveau) < 15) nat = this.rng.random() < 0.5;
          let waarde = natWaar ? nat : !nat;
          if (s.storing === 'vast_aan') waarde = true; else if (s.storing === 'vast_uit') waarde = false;
          ing[kid] = waarde;
        });
      });
      const spanning = !this.noodstop;
      [['SYS', this.sys], ['A', this.vp.A], ['B', this.vp.B]].forEach(([sleutel, pomp]) => {
        const pd = d.pompen[sleutel];
        if (pd.thermostaat) ing[pd.thermostaat] = alarmWaar ? pomp.alarmThermostaat : !pomp.alarmThermostaat;
        if (pd.thermisch) ing[pd.thermisch] = alarmWaar ? pomp.alarmThermisch : !pomp.alarmThermisch;
        if (pd.water) ing[pd.water] = pomp.water > 0.5;
        // de meldingen van de IO-mapping van 21-09: bedrijf = de motor draait (spanning en geen alarm), storing = een alarm
        if (pd.bedrijf) ing[pd.bedrijf] = spanning && !pomp.alarm() && (sleutel === 'SYS' ? pomp.draait : this.boolUit(pd.aan));
        if (pd.storing) ing[pd.storing] = alarmWaar ? pomp.alarm() : !pomp.alarm();
        if (pd.hoogMelding) ing[pd.hoogMelding] = spanning && pomp.hz >= 40.0;
        if (pd.mengBedrijf) ing[pd.mengBedrijf] = spanning && !pomp.alarm() && this.boolUit(pd.aan) && this.kleppen[pd.mengklep].stand > 0.5;
      });
      const lk = d.overig.luchtdruk; if (lk) ing[lk] = alarmWaar ? !this.lucht : this.lucht;
      const alg = d.overig.algemeen; if (alg) ing[alg] = spanning && this.lucht;
      const fk = d.overig.flowmeter; if (fk) { const bits = Math.trunc(p['teller.bits']); const mod = Math.pow(2, bits); ing[fk] = ((Math.trunc(this.flow.pulsen) + this.flow.tellerStart) % mod + mod) % mod; }
      Object.keys(ing).forEach(kid => { const s = this.sensor[kid]; if (s && (s.storing === 'vast_aan' || s.storing === 'vast_uit') && this.kanaal[kid].soort === 'DI') ing[kid] = s.storing === 'vast_aan'; });
      this.ingangen = ing;
    }
    _schakelhoogte(bak, hoogte) {
      const p = this.p;
      if (bak.soort === 'tussenbak') return hoogte === 'laag' ? p['bakken.tussenbak_laag_l'] : p['bakken.tussenbak_hoog_l'];
      return { werkbak: p['bakken.werkbak_schakelaar_l'], zuurbak: p['bakken.zuurbak_schakelaar_l'], sporen: p['bakken.sporen_schakelaar_l'] }[bak.soort];
    }
    _analoog(kid, bak, dt) {
      const p = this.p, s = this.sensor[kid];
      if (s.storing === 'draadbreuk') return Math.trunc(p['analoog.ruw_draadbreuk']);
      if (s.storing === 'vast' && s.vast !== null && s.vast !== undefined) return s.vast;
      let onrust = 0.0;
      if (bak.soort === 'tussenbak' && this.vp[bak.kant].debiet > 1) onrust = p['ruis.rondpompen_l'];
      const sigma = Math.hypot(p['ruis.niveau_l'], onrust);
      if (dt > 0) { const a = Math.min(1.0, dt / 0.5); s.ruis = sigma > 0 ? (1 - a) * s.ruis + a * this.rng.gauss(0.0, sigma * 1.7) : 0.0; }   // ruis die een halve seconde meegaat
      const liter = bak.volume + s.afwijkingL + s.ruis;
      const frac = liter / bak.meetbereik;
      const r4 = p['analoog.ruw_bij_4mA'], r20 = p['analoog.ruw_bij_20mA'];
      const ruw = Math.round(r4 + frac * (r20 - r4));
      if (ruw > p['analoog.ruw_max']) return Math.trunc(p['analoog.ruw_overbereik']);
      return Math.max(0, ruw);
    }
    // ---------------------------------------------------------------- opdrachten (van de PLC-nabootsing of het scherm)
    zetUitgang(kid, waarde) {
      const k = this.kanaal[kid]; if (!k || k.richting !== 'uit') throw new Error('geen uitgang: ' + kid);
      this.uitgangen[kid] = k.soort === 'AO' ? Math.trunc(Number(waarde) || 0) : !!waarde;
    }
    zetUitgangen(obj) { Object.keys(obj).forEach(kid => { this.zetUitgang(kid, obj[kid]); }); }
    storing(wat, id, waarde) {   // een storing aan of uit zetten. wat: klep | sensor | pomp | flowmeter | handafsluiter
      if (wat === 'klep') {
        const k = this.kleppen[id]; k.storing = (waarde && typeof waarde === 'object') ? waarde.soort : waarde;
        if (waarde && typeof waarde === 'object' && 'lekLpm' in waarde) k.lekLpm = Number(waarde.lekLpm);
        const tekst = { lekt: 'lekt ' + k.lekLpm.toFixed(1) + ' l/min als hij dicht is', gaat_niet_open: 'gaat niet open', gaat_niet_dicht: 'gaat niet dicht', vast: 'zit vast' }[k.storing] || 'werkt weer';
        this.melding('storing', 'Storing ingesteld: ' + k.naam + ' ' + tekst + '.');
      } else if (wat === 'sensor') {
        const s = this.sensor[id]; const soort = (waarde && typeof waarde === 'object') ? waarde.soort : waarde;
        s.storing = soort; if (soort === 'vast') s.vast = this.ingangen[id];
        if (waarde && typeof waarde === 'object' && 'afwijkingL' in waarde) s.afwijkingL = Number(waarde.afwijkingL);
        if (!soort) s.afwijkingL = 0.0;
        this.melding('storing', 'Storing ingesteld: ' + (this.kanaal[id].oms || id) + ': ' + (soort || 'werkt weer') + '.');
      } else if (wat === 'pomp') {
        const pomp = id === 'SYS' ? this.sys : this.vp[id]; pomp.storingThermisch = !!waarde;
        this.melding('storing', 'Storing ingesteld: ' + pomp.naam + ' ' + (waarde ? 'overbelast (thermisch alarm)' : 'niet meer overbelast') + '.');
      } else if (wat === 'flowmeter') {
        if ('defect' in waarde) this.flow.defect = !!waarde.defect;
        if ('kalFoutPct' in waarde) this.flow.kalFoutPct = Number(waarde.kalFoutPct);
        if ('tellerStart' in waarde) this.flow.tellerStart = Math.trunc(waarde.tellerStart);
        this.melding('storing', 'Storing ingesteld: flowmeter ' + (this.flow.defect ? 'geeft geen pulsen' : 'werkt') + ', telt ' + (this.flow.kalFoutPct >= 0 ? '+' : '') + this.flow.kalFoutPct.toFixed(1) + '%.');
      } else if (wat === 'handafsluiter') {
        this.handafsluiter[id] = !!waarde;
        this.melding('storing', 'Handafsluiter ' + (id === 'zuig' ? 'in de zuigleiding' : 'onder tussenbak ' + id) + ' ' + (waarde ? 'open' : 'dicht') + '.');
      } else throw new Error('onbekende storing: ' + wat);
    }
    resetInDeKast(sleutel) {
      const pomp = sleutel === 'SYS' ? this.sys : this.vp[sleutel]; const gelukt = pomp.reset();
      this.melding(gelukt ? 'info' : 'waarschuwing', pomp.naam + ': reset in de kast ' + (gelukt ? 'gelukt' : 'lukt niet, de oorzaak is er nog') + '.');
      return gelukt;
    }
    // ---------------------------------------------------------------- voor het scherm en om te bewaren
    toestand() {
      const r2 = x => Math.round(x * 100) / 100;
      const bakken = {};
      Object.keys(this.bakken).forEach(loc => {
        const b = this.bakken[loc]; const vol = b.volume; const st = {};
        Object.keys(b.stoffen).sort((x, y) => b.stoffen[y] - b.stoffen[x]).forEach(k => { if (b.stoffen[k] > 0.0005) st[k] = Math.round(b.stoffen[k] * 1000) / 1000; });
        bakken[loc] = { naam: b.naam, soort: b.soort, volume: r2(vol), inhoud: b.inhoud, stoffen: st, overgelopen: r2(b.overgelopen), verbruikLpm: b.verbruikLpm, rondgepomptKeer: vol > 1 ? r2(b.rondgepompt / vol) : 0.0 };
      });
      const pompen = {};
      [['SYS', this.sys], ['A', this.vp.A], ['B', this.vp.B]].forEach(([s, pomp]) => { pompen[s] = { naam: pomp.naam, draait: pomp.draait, debiet: r2(pomp.debiet), water: r2(pomp.water), warmte: r2(pomp.warmte), thermostaat: pomp.alarmThermostaat, thermisch: pomp.alarmThermisch, overbelast: pomp.storingThermisch }; });
      pompen.SYS.hz = r2(this.sys.hz); pompen.SYS.hzDoel = r2(this.setpointHz());
      const kleppen = {}; Object.keys(this.kleppen).forEach(kid => { const k = this.kleppen[kid]; kleppen[kid] = { naam: k.naam, stand: r2(k.stand), storing: k.storing, lekLpm: k.lekLpm }; });
      const ls = this.leiding.perStof(); const lst = {}; Object.keys(ls).forEach(k => { if (ls[k] > 0.0005) lst[k] = Math.round(ls[k] * 1000) / 1000; });
      return { t: r2(this.t), noodstop: this.noodstop, lucht: this.lucht, handafsluiter: Object.assign({}, this.handafsluiter), uitgangen: Object.assign({}, this.uitgangen), ingangen: Object.assign({}, this.ingangen),
        kleppen, bakken, pompen, flow: { lpm: r2(this.flow.lpm), hz: Math.round(this.flow.hz * 10) / 10, pulsen: Math.trunc(this.flow.pulsen), liters: r2(this.flow.liters), defect: this.flow.defect, kalFoutPct: this.flow.kalFoutPct },
        leiding: { inhoud: this.leiding.inhoud, stoffen: lst }, mengers: Object.assign({}, this.mengersDraaien),
        actief: Object.keys(this.actief).filter(k => this.actief[k].gemeld).map(k => ({ sleutel: k, sinds: Math.round(this.actief[k].sinds * 10) / 10, niveau: this.actief[k].niveau, tekst: this.actief[k].tekst })) };
    }
    bewaar() {   // alles wat nodig is om precies verder te gaan
      const bakken = {}; Object.keys(this.bakken).forEach(l => { bakken[l] = this.bakken[l].toestand(); });
      const kleppen = {}; Object.keys(this.kleppen).forEach(k => { kleppen[k] = this.kleppen[k].toestand(); });
      const sensor = {}; Object.keys(this.sensor).forEach(k => { const s = this.sensor[k]; if (s.storing || s.afwijkingL) sensor[k] = Object.assign({}, s); });
      return { t: this.t, uitgangen: Object.assign({}, this.uitgangen), noodstop: this.noodstop, lucht: this.lucht, handafsluiter: Object.assign({}, this.handafsluiter), bakken, leiding: this.leiding.toestand(), kleppen,
        sys: this.sys.toestand(), vp: { A: this.vp.A.toestand(), B: this.vp.B.toestand() }, flow: Object.assign({}, this.flow), sensor, meldingNr: this.meldingNr, meldingen: this.meldingen.slice(-100) };
    }
    herstel(s) {
      if (!s || typeof s !== 'object') return false;
      try {
        this.t = Number(s.t) || 0; this.noodstop = !!s.noodstop; this.lucht = s.lucht !== false; this.handafsluiter = Object.assign({ zuig: true, A: true, B: true }, s.handafsluiter || {});
        Object.keys(s.uitgangen || {}).forEach(k => { if (k in this.uitgangen) this.uitgangen[k] = s.uitgangen[k]; });
        Object.keys(s.bakken || {}).forEach(l => { if (this.bakken[l]) this.bakken[l].herstel(s.bakken[l]); });
        if (s.leiding) this.leiding.herstel(s.leiding);
        Object.keys(s.kleppen || {}).forEach(k => { if (this.kleppen[k]) this.kleppen[k].herstel(s.kleppen[k]); });
        if (s.sys) this.sys.herstel(s.sys); if (s.vp) { this.vp.A.herstel(s.vp.A); this.vp.B.herstel(s.vp.B); }
        if (s.flow) Object.assign(this.flow, s.flow);
        Object.keys(s.sensor || {}).forEach(k => { if (this.sensor[k]) Object.assign(this.sensor[k], s.sensor[k]); });
        this.meldingNr = s.meldingNr || 0; this.meldingen = (s.meldingen || []).slice();
        this._vorigeUitgangen = Object.assign({}, this.uitgangen);
        this._rekenIngangen(0.0);
        return true;
      } catch (e) { return false; }
    }
  }

  window.BvMachine = { PARAMETERS, WATER, leesParameters, definitie, Model, Leiding, Bak, Klep, Pomp, Toeval };
})();
