using System;
using System.Data;
using System.Data.Common;

namespace Backend.app.Core.Interfaces;

public interface IDbConnectionFactory
{
    // Database connection factory interface
    // Reference: src/db/db.js for connection handling

    DbConnection CreateConnection();
}
