## Kom igång

### 1. Förkrav

- [Docker](https://www.docker.com/) installerat och igång
- [Node.js](https://nodejs.org/) (v18 eller senare)
- [npm](https://www.npmjs.com/)

### 2. Starta databasen

Kör följande kommandon i terminalen från projektets rotkatalog:

```bash
docker pull postgres:16
docker compose up -d
```

Det är allt. Docker Compose startar en PostgreSQL 16-instans med följande inställningar:

| Inställning | Värde               |
|-------------|---------------------|
| Host        | `localhost`         |
| Port        | `5432`              |
| Databas     | `net25_db`          |
| Användare   | `net25`             |
| Lösenord    | `SecretNet25Password!` |

### 3. Installera och bygg projektet

Kör detta **första gången** (installerar npm-beroenden och bygger C#-backend):

```bash
npm run setup
```

### 4. Starta applikationen

```bash
npm start
```

Detta startar både backend (C#) och frontend (Angular) samtidigt. Applikationen är sedan tillgänglig i webbläsaren på `http://localhost:4200`.

---

## Hur programmet fungerar

Se [USAGE.md](./USAGE.md) för en detaljerad genomgång av systemets funktioner.

---

## Databasmigrering

Applikationen skapar automatiskt alla tabeller, enum-typer, vyer, triggers och index vid uppstart om de inte redan finns. Ingen manuell SQL-körning krävs.

Migreringshistoriken spåras i tabellen `database_versions`.
