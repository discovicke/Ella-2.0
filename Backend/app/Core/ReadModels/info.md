Här är en komplett **Utvecklarmanual (Cheat Sheet)** för din nya arkitektur. Denna kan du spara i din `_docs`-mapp (förslagsvis som `ARCHITECTURE_GUIDE.md`) så att du alltid kan friska upp minnet när du bygger nya funktioner.

---

# 📘 Utvecklarmanual: Clean Architecture med Dapper & SQLite

Denna manual beskriver hur vi skickar data genom systemet. Syftet är att hålla databasen (SQL) och gränssnittet (API) helt separerade för maximal prestanda och läsbarhet.

## 1. De tre typerna av modeller

Vi använder tre olika typer av C#-klasser beroende på *var* i koden vi befinner oss.

### 🧱 1. Entities (`Core/Entities/`)

* **Vad det är:** Exakt spegling av dina databastabeller.
* **När används de:** Endast för att spara/uppdatera data i databasen (CREATE, UPDATE, DELETE) eller för att läsa från en *enskild* tabell.
* **Regel:** Lägg *aldrig* till extra "UI-egenskaper" (som `IsAvailable`) här.

### ⚡ 2. ReadModels (`Core/ReadModels/`)

* **Vad det är:** Interna C#-`records` skapade specifikt för att ta emot resultatet av en SQL `JOIN`.
* **När används de:** När ditt Repository läser från flera tabeller samtidigt.
* **Regel:** Dessa lämnar aldrig backend. De är platta och designade för att Dapper ska kunna mappa dem automatiskt.

### 🌐 3. DTOs (`Core/DTO/`)

* **Vad det är:** Kontraktet mot Frontend/Klienten. Delas upp i `Requests` (in) och `Responses` (ut).
* **När används de:** I Endpoints (Controllers) och Service-lagret.
* **Regel:** Dölj hemlig data (som `password_hash`) här. Lägg till kalkylerad data (som `IsAvailable`) här.

---

## 2. Gyllene regler för databasläsning (Dapper)

När du bygger en ny metod i ett Repository, följ detta beslutsträd:

**Fråga:** Hämtar du data från EN tabell, eller FLERA (JOIN)?

👉 **Fall A: Endast en tabell (t.ex. "Hämta alla rum")**

1. Skriv enkel SQL: `SELECT * FROM rooms`
2. Returnera **Entity**: `Task<IEnumerable<Room>>`

👉 **Fall B: Flera tabeller (t.ex. "Hämta bokning med rumsnamn och värd")**

1. Skapa en **ReadModel** (Record) som matchar exakt det du vill hämta.
2. Skriv SQL med JOIN: `SELECT b.id, r.name AS RoomName...`
3. Returnera **ReadModel**: `Task<BookingDetailsReadModel>`
4. *Tips:* Låt Dapper mappa automatiskt! Inga Tuples eller "Multi-mapping" behövs.

---

## 3. Kodexempel: Så här flödar datan

Här är ett exempel på hur en "Read"-operation rör sig genom de olika lagren, från SQL till Klient.

#### Steg 1: Repository (Hämtar data med Dapper)

*Hämtar data platt och blixtsnabbt med en JOIN.*

```csharp
// SQLiteBookingRepo.cs
public async Task<BookingDetailsReadModel> GetDetails(int id) 
{
    var sql = @"
        SELECT b.start_time, r.name AS RoomName 
        FROM bookings b JOIN rooms r ON b.room_id = r.id 
        WHERE b.id = @id";
        
    // Dapper mappar magiskt resultatet till vårt Record
    return await connection.QuerySingleAsync<BookingDetailsReadModel>(sql, new { id });
}

```

#### Steg 2: Service-lagret (Affärslogik & Ompackning)

*Tar emot ReadModel, tänker lite, och spottar ut en Response DTO.*

```csharp
// BookingService.cs
public async Task<BookingResponse> GetBooking(int id) 
{
    // 1. Hämta ReadModel från databasen
    var readModel = await _repo.GetDetails(id);

    // 2. Mappa till Response (Här kan vi lägga till extra logik om vi vill)
    return new BookingResponse 
    {
        StartTime = readModel.StartTime,
        RoomName = readModel.RoomName,
        IsActive = readModel.StartTime > DateTime.UtcNow // Kalkylerad egenskap!
    };
}

```

#### Steg 3: API Endpoint (Skickar till klienten)

*Helt ovetande om databaser. Tar bara emot och skickar vidare.*

```csharp
// BookingEndpoints.cs
app.MapGet("/bookings/{id}", async (int id, BookingService service) => 
{
    var response = await service.GetBooking(id);
    return Results.Ok(response);
});

```

---

## 4. Checklista för nya funktioner

När du ska bygga något nytt (t.ex. "Visa alla användare och hur många bokningar de gjort"):

1. [ ] **SQL:** Fundera ut hur SQL-frågan ser ut (krävs en JOIN/COUNT?).
2. [ ] **ReadModel:** Om JOIN krävs, skapa `UserStatsReadModel` (record).
3. [ ] **Repo:** Skriv metoden i `SQLiteUserRepo` som returnerar ReadModel via Dapper.
4. [ ] **DTO:** Skapa `UserStatsResponse` (class) i din DTO-mapp.
5. [ ] **Service:** Hämta ReadModel, mappa över datan till din Response DTO.
6. [ ] **Endpoint:** Skapa din `MapGet` och returnera resultatet från Service.