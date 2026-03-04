# Hur programmet fungerar

### ER-diagram (förenklat)

```
campus ──< rooms >── room_types
              │
         room_assets >── asset_types

class ──< class_campus >── campus

users >── user_campus >── campus
users >── user_class  >── class
users ──> permission_templates ──< permission_template_flags >── system_permissions
users ──< user_permission_overrides >── system_permissions

users ──< bookings >── rooms
bookings ──< registrations (status: invited/registered/declined) >── users
```

### Användarhantering

- Nya användare registreras med e-post, lösenord och visningsnamn.
- Varje användare tilldelas en **rollmall** (t.ex. Admin, Lärare, Elev) som definierar grundbehörigheter.
- Utöver rollmallen kan enskilda användare få **permission overrides** — specifika behörigheter som åsidosätter mallens värden, antingen för att utöka eller begränsa åtkomst.
- Användare kan kopplas till ett eller flera **campusar** och **klasser**.
- Administratörer kan banna användare, vilket spärrar inloggning.

### Rollsystemet

Behörigheter beräknas i tre lager med prioritetsordning:

```
1. Personlig override (user_permission_overrides) — högst prioritet
2. Rollmallens värde  (permission_template_flags)
3. Standardvärde FALSE (nekad)                    — lägst prioritet
```

Det innebär att en administratör kan ge en enskild elev en specifik behörighet utan att ändra hela elevrollens mall, och vice versa.

### Campusar och rum

- Campusar representerar fysiska byggnader med adress och kontaktinfo.
- Varje rum tillhör ett campus och en rumstyp, och kan ha utrustning (assets) registrerad (projektor, whiteboard, TV etc.).
- Rum har kapacitet, våningsplan och fritext-anteckningar.

### Bokning av rum

- Inloggade användare kan söka efter lediga rum och boka dem för ett givet tidsintervall.
- En bokning har status `active`, `cancelled` eller `expired` (expired beräknas dynamiskt baserat på sluttid).
- Överlappande bokningar för samma rum förhindras.

### Registreringar och inbjudningar

Varje bokning kan ha **registreringar** — kopplingar mellan en användare och en bokning med en av tre statusar:

| Status       | Betydelse                                      |
| ------------ | ---------------------------------------------- |
| `Invited`    | Inbjuden — väntar på svar                      |
| `Registered` | Bekräftad — användaren deltar                  |
| `Declined`   | Avböjd — synlig men räknas inte som deltagande |

Flödet fungerar så här:

- En bokningsägare kan **bjuda in** andra användare till sin bokning.
- Den inbjudne kan **acceptera** (→ Registered), **avböja** (→ Declined), eller låta inbjudan vara (förblir Invited).
- En registrerad användare kan **avregistrera** sig (→ återgår till Invited).
- En avböjd inbjudan kan **accepteras i efterhand** (→ Registered).
- Bokningsägaren kan **ta bort** en inbjudan helt (raderar registreringsraden).

Registreringar visas i "Mina bokningar"-vyn, där inbjudningar, bekräftade och avböjda bokningar hämtas via ett enda API-anrop med server-side tidsfiltrering.

Se [REGISTRATION_SYSTEM_GUIDE.md](./REGISTRATION_SYSTEM_GUIDE.md) för fullständig teknisk dokumentation.

---