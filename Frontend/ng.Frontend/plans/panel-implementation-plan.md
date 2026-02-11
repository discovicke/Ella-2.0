# Planering: Migration av Panel & Card Creation (Angular 21)

Detta dokument beskriver strategin för att migrera panel- och kort-funktionalitet från Vanilla JS till en modern "Smart/Dumb"-arkitektur i Angular 21.

## 1. Arkitektoniska Mål
- **Smarta Komponenter (Pages/Layouts):** Sköter all datahämtning, valideringstjänster (services) och state-hantering.
- **Dumma Komponenter (Shared):** Presenterar endast data och skickar vidare events (via `output()`). De har ingen kännedom om domänmodeller eller specifika tjänster.
- **Återanvändbarhet:** Panelen ska kunna användas i olika kontexter (Student, Admin) med olika bredd och innehåll.

## 2. Komponentstruktur

### A. PanelComponent (Shared/Components/Panel - Dumb)
- **Syfte:** En generisk behållare för "side-panels".
- **Inputs:**
  - `isOpen = input<boolean>(false)`
  - `title = input<string>('')`
  - `size = input<'small' | 'full'>('small')`
- **Outputs:**
  - `close = output<void>()`
- **Innehåll:** Använder `<ng-content>` för flexibilitet.

### B. CardCreationComponent (Shared/Components/Card - Dumb)
- **Syfte:** Den "dumma" versionen av kortskapandet. 
- **Notera:** Vi behöver definiera om detta är ett specifikt formulär för bokningar eller en mer generisk kort-wrapper. Enligt `PANEL_CARD_CREATION.png` ser det ut som ett specifikt gränssnitt för att skapa/redigera entiteter.
- Svar: Det är inte ett formulär, utan det är en wrapper med en knapp som ska öppna en modal som är ett rumbokningsformulär. BookingForm-komponenten ÄR INTE (OBS!!!!!) en del av hemsidan, utan ett externt formulär som ska användas utan inloggning.

### C. StudentLayout (Pages/Student - Smart)
- **Syfte:** Orchestrator för studentvyn.
- **Logik:**
  - Injicerar `BookingService` och `RoomService`.
  - Hanterar state för om panelen ska visas.
  - Lyssnar på "Boka"-events från rumslistan och öppnar panelen.

## 3. Layout & CSS Strategi
- **Panelens Bredd:** 
  - I student-vyn: Fast bredd (t.ex. 400px-500px) som glider in över höger sida.
  - I admin-vyn: Täcker hela innehållsytan (`calc(100% - sidebar-width)`).
- **Z-index:** Måste ligga över main-innehåll men under eventuella globala toasts/modaler.
- Den ska inte glida in. Den ska vara statisk och ersätta våra sections i html för tillfället, se kommentarer i html.
## 4. Öppna Frågor till User
- [ ] **Beteende:** Ska panelen "knuffa" undan innehållet i main eller ligga ovanpå (overlay)?
- Panelen ska inte knuffa eller ligga ovanpå. den är statisk med rumskort som en div i klassisk html. Den ska populateas av kort baserat på input. 
- [ ] **Innehåll:** Ska formuläret inuti panelen vara en egen komponent (t.ex. `BookingFormComponent`) eller ska det definieras direkt i pagen?
- BookingForm-komponenten ÄR INTE (OBS!!!!!) en del av hemsidan, utan ett externt formulär som ska användas utan inloggning. Det är alltså inte en komponent som vi utvecklar, utan en extern resurs som vi integrerar med.
- Panelen innehåller inte formuläret, utan en knapp som öppnar en modal med ett formulär som ännu inte är skapat i angular.
- [ ] **Data:** Vilken specifik information från `PANEL_CARD_CREATION.png` är viktigast att få med i första versionen?
- Jag tycker att det viktigaste är att skapa panelskalet och byta ut sections i html mot panelskalet. Det är viktigare att få in panelen och korten än att få in all information i korten. Vi kan börja med att bara visa rumsnamn och en "Boka"-knapp i korten, och sedan iterera därifrån, och detta gör vi genom API-get från roomservice.

Se bild på gamla implementation i panels-foldern. 

I room.service finns ett get-anrop. För rum (det kort jag tycker att vi börjar med, inte bokning som är vänstra korten i example_old_layout.png) så ser svaret ut som:
```
[
  {
    "roomId": 1,
    "name": "string",
    "capacity": null,
    "type": "Classroom",
    "floor": null,
    "address": null,
    "notes": null,
    "assets": [
      "string"
    ]
  }
]
```
Om room.service ser kontig eller fel ut så tycker jag att du kan fixa den för att datan ska komma rätt. Vi fokuserar på rumskort som genereras i en fast panel på höger sida i student.pagen just nu, det är ditt scope tills jag säger annorlunda.

---
*Detta dokument är ett levande utkast. Ge feedback så justerar vi innan implementation.*
