using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class PostgresAssetRepo(IDbConnectionFactory connectionFactory, ILogger<PostgresAssetRepo> logger)
    : IAssetRepository
{
    public async Task<IEnumerable<AssetType>> GetAllAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<AssetType>("SELECT * FROM asset_types ORDER BY description;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching all asset types");
            throw;
        }
    }

    public async Task<AssetType?> GetByIdAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QuerySingleOrDefaultAsync<AssetType>("SELECT * FROM asset_types WHERE id = @id;", new { id });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching asset type {Id}", id);
            throw;
        }
    }

    public async Task<long> CreateAsync(AssetType assetType)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "INSERT INTO asset_types (description) VALUES (@Description); SELECT last_insert_rowid();";
            return await conn.ExecuteScalarAsync<long>(sql, assetType);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating asset type {Description}", assetType.Description);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(long id, AssetType assetType)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "UPDATE asset_types SET description = @Description WHERE id = @Id;";
            // Ensure the ID in the object matches the ID in the argument (safety)
            assetType.Id = id; 
            return await conn.ExecuteAsync(sql, assetType) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating asset type {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            
            // Note: This will fail with a FK constraint violation if the asset type is in use.
            const string sql = "DELETE FROM asset_types WHERE id = @id;";
            return await conn.ExecuteAsync(sql, new { id }) > 0;
        }
        catch (Exception ex)
        {
            // If this is error 19 (Constraint), it means the asset is used by a room.
            logger.LogError(ex, "Error deleting asset type {Id}", id);
            throw;
        }
    }

    public async Task<bool> ExistsAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.ExecuteScalarAsync<bool>("SELECT 1 FROM asset_types WHERE id = @id;", new { id });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error checking existence of asset type {Id}", id);
            throw;
        }
    }

    public async Task<IEnumerable<long>> GetExistingIdsAsync(IEnumerable<long> idsToCheck)
    {
         try
        {
            if (!idsToCheck.Any()) return [];

            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            
            const string sql = "SELECT id FROM asset_types WHERE id IN @Ids;";
            return await conn.QueryAsync<long>(sql, new { Ids = idsToCheck });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error validating asset IDs");
            throw;
        }
    }
}