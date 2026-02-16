# TODO

## Backend

### Arkitektur & struktur
- [x] Bryt ut registration logik till en separat RegistrationsRepository
    - [x] Interface
    - [x] Dependency injection?
    - [x] Tydlig ansvarsfördelning
- [ ] Ta bort den oanvända **Rooms view**
    - Eller uppdatera den så den speglar faktisk användning i repot
- [ ] Fixa adresser i en egen **AddressRepository**
    - Rum har ett AddressId kopplat till Address-table
- [ ] Background Clean-up worker
  - Sortera upp och filtrera bokningar som passerat 
### Autentisering & användarhantering
- [ ] Se över kravet på att lösenord måste skickas med vid användaruppdatering
    - Borde endast krävas vid ett lösenordsbyte
    - Det borde inte skötas av en admin
        - Egen "återställ lösenord"-funktion?
### Databas
- Se över databasmodeller och relationer
    - [ ] Separat `Address`-tabell kopplad till `Rooms`.
    - [ ] `Class`-tabell kopplad till `Users`.
      - Separera klasser över städer.
    - [ ] Två olika typer av `Booking` - privat eller lektion.
    - [ ] Lägga till Notes i `RoomAssets`-bryggan.

### Data & Internationalisering
- [ ] Säkerställ att översättningar från databasen används korrekt
	- Konsekvent språk
	- Rätt termer per roll/status
- [x] Se över stavfel i Banned page
- [ ] Fixa översättningar från databasen för korrekt användarupplevelse

### Bokningar & närvaro (Registrations)
- [x] Implementera `RegistrationsRepository`
  - [x] Koppling mellan användare och bokning
  - [x] Skapa/uppdatera närvaro (anmäld: ja/nej)
- [ ] Hämta alla bokningar kopplade till en klass
  - Inkludera information om vilka elever som är anmälda
- [x] API-endpoint för att anmäla närvaro till en bokning
  - [ ] Skydda så endast elever i rätt klass kan anmäla sig
- [x] Säkerställ att duplicerade registrations inte kan skapas
- Ska en elev se alla bokningar gjord av andra elever i sin klass?

## Backend ↔ Frontend

### Närvaro-flöde
- [ ] Backend: Exponera klassens bokningar med registrations per användare
- [ ] Frontend: Mappa bokning → registration-status för inloggad elev

### Formuläret
* [ ] Se över registrering i databas för det fristående formuläret

## Frontend

### Generell
- [ ] Implementera en kalender-komponent

### Routing & layout
- [ ] `app.routes.ts`
    - [ ] Överväg att återinföra HomePage?
    - [ ] Redirect till login om ej autentiserad användare
    - [ ] Implementera hela teacher-routen med undersidor
- [ ] Global modal-placering
    - [ ] `student.layout.ts`: Implementera bokningsmodal-öppning
    - [ ] `student.layout.html`: Bestäm om app-modal ska ligga här eller i global layout

### Student

#### Funktionalitet
- [ ] Filtrering av bokningar
    - Status: aktiv, cancelled, historik
- [ ] Skapa bokningsmodal som öppnas vid `"Boka"`-knappen

#### UI
- [ ] Placering och koppling av global modal-komponent

#### Klassens bokningar
- [ ] Visa alla bokningar som elevens klass har
- [ ] Visa om eleven är anmäld till respektive bokning
- [ ] Möjlighet att anmäla närvaro genom att klicka “Ja”
  - Uppdatera UI direkt (optimistic update)
  - Hantera återkallande om det behövs

### Educator / Teacher

#### UI & Komponenter
- [ ] Fixa bokningspanelen så korten får rätt layout

### Administrator

#### Overview
- [ ] Implementera en overview-sida
    - Statistik
    - Nyliga bokningar
    - Nyliga användare
    - Sammanfattningar
    - Kalender?
    - Import?

#### Manage Bookings
- [ ] Implementera en manage-sida
    - Översikt
    - Sök/filter
    - Hantera
    - Kalender?

#### Manage Rooms
- [ ] Implementera
    - Sökning
    - Filtrering

#### Manage Users
- [ ] Implementera
    - Sökning
    - Filtrering
        - Namn
        - Roll
        - Status
        - Klass

### Banned / Access Control

#### Texter & UX
- [ ] `banned.page.html`: Korrigera text för bannlysta användare
- [ ] `auth.interceptor.ts` & `auth.service.ts`: Fixa toasten för bannlysta användare

### BookingForm-komponenten
- [ ] Fixa så den tar emot riktiga rum
    - Kan boka rum via en temporär databas som admin accepterar?
- [ ] Fixa rumlistan i högerspalt
    - Sorterad per stad (rubriker)
    - Enbart namn och typ av rum i listan
        - Collapsable content som visar mer info om rummet

### Delade komponenter
- [ ] `modal.service.ts`: Implementera fördröjning för ut-animation så den spelas klart innan komponenten tas bort
- [ ] `modal.component.ts`: Fixa shake-animationen

### Småfix & kvalitet
- [ ] Se över stavfel generellt
- [ ] Säkerställ konsekvent terminologi mellan backend ↔ frontend
