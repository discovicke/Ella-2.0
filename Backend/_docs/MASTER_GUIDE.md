# 🏗️ Project Architecture & Developer Handbook

Welcome to the core documentation for the project. This document serves as the "Source of Truth" for how data flows, how models are structured, and how we ensure data integrity.

## 📌 Table of Contents

1. **[System Overview](/_docs/details/DATA_FLOW_GUIDE.md)** - High-level data flow and layering.
2. **[Data Modeling & Repo Ops](/_docs/details/MODELS_AND_QUERIES_GUIDE.md)** - Understanding Entities, DTOs, and Read Models. Contains an in depth chapter on how to use and implement Read Model Repositories
3. **[Database Schema](/_docs/details/DATABASE_DOC.md)** - Storage rules and SQLite specifics.
4. **[Validation Strategy](/_docs/details/VALIDATION_GUIDE.md)** - Our "Fail-Fast" approach.




## Future Improvements / Backlog

*   **Asset Quantity Tracking:** Update the `RoomAssets` link table to support quantities (e.g., "Room 101 has 5 Chairs" instead of just "Has Chairs").

## 1. System Overview

We follow a strict layered architecture to ensure separation of concerns. Data moves from the Frontend through the API and Service layers before hitting the Database.

* **Key Concept:** Data is transformed at each layer to protect internal structures and optimize for the client.
* **Documentation:** See **[DATA_FLOW_GUIDE.md](/_docs/details/DATA_FLOW_GUIDE.md)** for detailed diagrams and step-by-step examples of a request lifecycle.

## 2. Data Modeling

Everything that holds data is located in `Backend/app/Core/Models/`.

| Model Type | Purpose | Location |
| --- | --- | --- |
| **Entities** | Mirrors database tables exactly. | `/Entities/` |
| **DTOs** | Inputs/Outputs for the Frontend (API JSON). | `/DTOs/` |
| **Enums** | Fixed choices (Roles, Statuses). | `/Enums/` |
| **ReadModels** | Shaped data for complex SQL queries. | `/ReadModels/` |

> **Rule:** Never return an **Entity** directly to the frontend to avoid exposing sensitive data like password hashes.

## 3. Database Schema

We use **SQLite** with a focus on relational integrity.

* **Auth:** Users have roles and stateless JWT session revocation.
* **Dates:** Stored as ISO-8601 strings (`"YYYY-MM-DD HH:MM:SS"`) to remain sortable.
* **Schema:** Full SQL definitions for `users`, `rooms`, `bookings`, and `assets` can be found in **[DATABASE_DOC.md](/_docs/details/DATABASE_DOC.md)**.

## 4. Validation Strategy

We use a **4-Layer "Fail-Fast"** approach to catch errors as early as possible:

1. **Framework Layer:** Catches basic type mismatches (JSON → DTO).
2. **Endpoint Layer:** Validates input integrity (e.g., `StartTime < EndTime`).
3. **Service Layer:** Validates system state (e.g., "Does this room exist?").
4. **Database Layer:** Final safety net via foreign keys and unique constraints.

## 5. Read vs. Write Operations

To keep the codebase clean, we separate standard CRUD from complex queries:

* **Standard Repositories:** Handle simple state changes (Insert/Update/Delete) using Entities.
* **Read Model Repositories:** Optimized for UI display. They use **Dapper** to run complex joins and return specialized "Read Models".
* **Implementation Guide:** See **[MODELS_AND_QUERIES_GUIDE.md](/_docs/details/MODELS_AND_QUERIES_GUIDE.md)** for choosing the right model and implementation.

