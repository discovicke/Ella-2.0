# ELLA v2 - Projektstatus & TODO

Detta dokument spårar projektets framsteg. Uppdaterat: 2026-03-12.

---

## 🚀 Aktuellt Fokus (Q1 2026)

### Priority: HIGH
- [ ] **Escalation guard for permissions**: Förhindra att användare ger behörigheter de inte själva har (i `UserService.cs`).
- [ ] **Frontend: Registreringssida**: Implementera den publika registreringssidan (`register.page.ts`). Backend är klar.
- [ ] **Säkerhet för publika formulär**: Implementera rate limiting och CSRF-skydd för det fristående bokningsformuläret.

### Priority: MEDIUM
- [ ] **Background Clean-up worker**: En tjänst som rensar gamla rader och uppdaterar historik för att hålla index snabba.
- [ ] **Arkitektur: AddressRepository**: Normalisera adresser till en egen tabell istället för att ha dem i `campus`/`rooms`.
- [ ] **Frontend: Overview-sida**: Implementera admin-dashboards med statistik och sammanfattningar.

### Priority: LOW / Polish
- [ ] **DatePicker library**: Utforska ett bättre alternativ till standard-datepicker för bokningsmodalen.
- [ ] **Modal UX**: Fixa fördröjning vid ut-animation och shake-animation vid felaktiga klick.
- [ ] **Soft deletes**: Lägg till `IsDeleted`-flaggor för att undvika permanent dataförlust.
- [ ] **Banned Toast**: Fixa felaktig text i toasten när en bannlyst användare försöker logga in.

---

## 🛠️ Modul-status

### Autentisering & Säkerhet
- [x] JWT-baserad auth med cookies.
- [x] Rollmallar (Templates) och Custom Overrides.
- [x] Lösenordsåterställning & kontoaktivering via mail.
- [ ] **PENDING:** Refresh Tokens för längre sessioner.
- [ ] **PENDING:** Rate Limiting middleware.

### Bokningssystemet
- [x] Dynamisk tillgänglighetskontroll av rum.
- [x] Återkommande bokningar (serier) med scope-avbokning.
- [x] Permission Level-hierarki (Admin kan boka över student).
- [x] Registreringssystem (Invited/Registered/Declined) med pagination.
- [x] Boknings-slugs för publika bokare.

### Resurshantering (Mobila resurser)
- [x] Hantering av kategorier (fordon, laptopvagnar etc).
- [x] Bokningsflöde för mobila resurser bundna till campus.

### Data & Import
- [x] CSV-import för studenter (Excel-format).
- [x] SMTP-integrering (Brevo) för system-mail.
- [ ] **PENDING:** Export av bokningsstatistik till CSV/Excel.

---

## ✅ Arkiv (Slutfört)

### Backend
- [x] Implementera `Postgres` och `Sqlite` providers med full parity.
- [x] Flytta inbjudningslogik till `RegistrationService`.
- [x] Stöd för klass-baserade inbjudningar (bjud in hel klass till lektion).
- [x] Koppla klasser till campus (tidigare städer).
- [x] CRUD för Rum, Campus, Klasser och Assets.
- [x] Server-side pagination för alla tunga listor (användare, bokningar, registreringar).

### Frontend
- [x] Integration av **DayPilot-Lite** för kalendervyer.
- [x] "Mina Bokningar"-vy med avancerad filtrering och paginering.
- [x] Dynamisk RBAC-styrd sidebar och access-guards.
- [x] Hantering av bannlysta användare (Banned-page redirect).
- [x] Automatiskt genererad OpenAPI-klient (`npm run api:sync`).
- [x] Custom schematics för sidor och layouts (`npm run g-page`).
- [x] Sorterad rumlista i bokningsformuläret.

### Infrastruktur
- [x] Docker-compose för Postgres och Adminer.
- [x] Interaktiv bootstrap-script (`scripts/bootstrap.js`).
- [x] DBML-generering för visualisering av databasen.
