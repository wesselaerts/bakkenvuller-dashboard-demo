# Bakkenvuller: het dashboard, om te testen

Dit is het bedieningsscherm van de Bakkenvuller (een installatie die
voedingsoplossing aanmaakt en zes werkbakken op peil houdt), met een
**nabootsing van de machine in je browser**. Er is geen echte machine en geen
server: alles wat je ziet zijn testgegevens, en alles wat je doet blijft op je
eigen computer.

**Openen:** de link van deze pagina (GitHub Pages), of download de map en
dubbelklik op `index.html`.

## Zo test je

- **De paarse balk** bovenin zegt altijd NABOOTSING. Dat klopt: dit is een
  proef.
- **Zonder inloggen ben je Bediening** (de teler bij de machine): kijken, en
  bij Recepten de liters aanpassen.
- **Service** (rechtsboven): receptopbouw, instellingen, kalibratie. Code
  **0000**.
- **Configuratie** (rechtsboven): wat de machine is: bakken, namen, groepen,
  inhouden, de batch, wachtwoorden. Code **0000**.
- Elke wijziging die je "naar de PLC stuurt", neemt de nabootsing aan en toont
  hij daarna, zoals de echte PLC dat zou doen. Wat niet mag (een recept dat niet
  past, een stof in de verkeerde bak) weigert hij met dezelfde melding.
- Wat je verandert blijft in je browser staan, ook na herladen. **Opnieuw
  beginnen** (knop linksonder) wist alles en begint weer met de testgegevens.
- Adviesbladen (pdf) die je koppelt, blijven alleen tot je de pagina herlaadt.

## Wat de nabootsing niet doet

- Er loopt geen beurt vanzelf door: de machine staat op één vast moment (er
  wordt Kali 50% gedoseerd naar tussenbak A). Wat beweegt, is wat op dat moment
  echt loopt.
- Het scherm Controller toont "niet te beoordelen": er is geen controller.

## Feedback

Schrijf op **welk scherm**, **wat je deed** en **wat je verwachtte**. Een
schermafbeelding helpt. Alles in het dashboard is een keuze die te veranderen
is.

---

*Gebouwd uit het project van Wessel Aerts (Cogas Climate Control). Het
dashboard is precies hetzelfde als op de machine; alleen de nabootsing
(`nabootsing.js`) is toegevoegd.*
