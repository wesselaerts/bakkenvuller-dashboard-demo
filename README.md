# Bakkenvuller: het dashboard, met de machine die echt loopt

Dit is het bedieningsscherm van de Bakkenvuller (een installatie die
voedingsoplossing aanmaakt en zes werkbakken op peil houdt), met een
**nabootsing van de machine en van de PLC in je browser**. Er is geen echte
machine en geen server: de machine wordt doorgerekend op je eigen computer,
en alles wat je doet blijft daar.

**Openen:** de link van deze pagina (GitHub Pages), of download de map en
dubbelklik op `index.html`.

## Wat je ziet

De machine doet wat de softwarebeschrijving zegt, met echte fysica:

- **Bakken lopen vol en leeg.** De kas verbruikt uit de werkbakken; zakt een bak
  onder zijn vulgrens, dan vraagt hij om een vulling en komt hij in de rij.
- **Een batch wordt opgebouwd** in tussenbak A of B: voorwater, lektest (de
  pomp draait tegen dichte kleppen, de flowmeter moet stilvallen), dan per
  meststof grof doseren op 50 Hz, fijn op 30 Hz, klep dicht, de naloop meten
  en leren, de leiding spoelen, mengen door rondpompen; aanvullen tot het
  batchvolume; namengen; en dan afleveren met de meng-/transportpomp.
- **A en B werken als paar:** eerst wordt tussenbak A gevuld, dan B, en ze
  leveren tegelijk af. De zuurbak en de sporenbakken worden rechtstreeks
  gevuld; een sporenbak is daarna weer grondstof en heeft een eigen menger.
- **De flowmeter telt echt** (252 pulsen per liter), de niveaus komen uit de
  inhoud van de bakken, en de PLC rekent met zijn kalibratie. Wat op het scherm
  staat, is wat de PLC uit zijn ingangen haalt: niet gemeten is niet nul.

Kijk bij **Overzicht** naar het schema (stroming, kleppen, pompen, fasen per
keten), bij **Meldingen** naar wat de PLC meldt, bij **Logboek** naar de
beurten, en bij Service → **Live I/O** naar de klemmen.

## De knoppen links onder

- **1× · 5× · 20×**: sneller kijken. Dezelfde machine, dezelfde rekensom,
  alleen meer seconden per seconde. Een batch duurt op 1× ongeveer twintig
  minuten, zoals in het echt.
- **Machine stilzetten**: lopende beurten afbreken, alles uit, geen nieuwe
  beurt (zoals de resetknop op de kast). Dan kun je ook Configuratie toepassen
  en ijken. **Machine starten** zet het automatisch bedrijf weer aan.
- **Storing … kwiteren** verschijnt bij een vergrendelde storing: de machine
  weer vrijgeven nadat de oorzaak weg is (in deze nabootsing altijd).
- **Opnieuw beginnen**: alles wissen en met de begintoestand starten.

## Zo test je

- **De paarse balk** bovenin zegt altijd NABOOTSING. Dat klopt: dit is een
  proef.
- **Zonder inloggen ben je Bediening** (de teler bij de machine): kijken, en
  bij Recepten de liters aanpassen. De volgende batch rekent ermee.
- **Service** (rechtsboven): receptopbouw, instellingen, kalibratie, Live I/O.
  Code **0000**.
- **Configuratie** (rechtsboven): wat de machine is: bakken, namen, groepen,
  inhouden, het batchvolume, wachtwoorden. Code **0000**.
- Elke wijziging die je "naar de PLC stuurt", neemt de nabootsing aan en
  gebruikt hij daarna, zoals de echte PLC dat zou doen. Wat niet mag (een
  recept dat niet past, een stof in de verkeerde bak) weigert hij met dezelfde
  melding.
- Wat je verandert blijft in je browser staan, ook na herladen; de machine
  loopt verder waar hij was. **Opnieuw beginnen** wist alles.
- Adviesbladen (pdf) die je koppelt, blijven alleen tot je de pagina herlaadt.

Probeer bijvoorbeeld: zet het batchvolume in Configuratie op 800 L (de machine
moet in rust staan) en kijk wat er gebeurt als een batch niet helemaal in een
werkbak past. Of ijk Sporen 3 (Service → Kalibratie): dan pas kent de PLC dat
niveau en gaat de menger daar draaien.

## Wat de nabootsing niet is

- **Geen meetgegevens.** Het debiet van de pompen, de looptijd van de kleppen,
  de inhoud van de leiding en de meetbereiken zijn aannames uit het ontwerp,
  net als het verbruik van de kas. Ze staan met hun bron in het rekenmodel; de
  echte waarden komen bij de inbedrijfstelling.
- **Geen advies.** De recepten en instellingen zijn testgegevens.
- Het scherm Controller toont "niet te beoordelen": er is geen controller.

## Feedback

Schrijf op **welk scherm**, **wat je deed** en **wat je verwachtte**. Een
schermafbeelding helpt. Alles in het dashboard is een keuze die te veranderen
is.

---

*Gebouwd uit het project van Wessel Aerts (Cogas Climate Control). Het
dashboard is precies hetzelfde als op de machine; alleen de nabootsing
(`machine.js`, `plc.js`, `nabootsing.js`) is toegevoegd.*
