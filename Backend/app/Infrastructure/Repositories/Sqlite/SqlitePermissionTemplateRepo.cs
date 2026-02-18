using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqlitePermissionTemplateRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqlitePermissionTemplateRepo> logger
) : IPermissionTemplateRepository
{
    public async Task<List<PermissionTemplateDto>> GetAllAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var templates = (
                await conn.QueryAsync<PermissionTemplate>(
                    "SELECT * FROM permission_templates ORDER BY sort_order, id;"
                )
            ).ToList();

            var flags = (
                await conn.QueryAsync<PermissionTemplateFlag>(
                    "SELECT * FROM permission_template_flags;"
                )
            ).ToList();

            return templates
                .Select(t => new PermissionTemplateDto
                {
                    Label = t.Label,
                    CssClass = t.CssClass,
                    Permissions = flags
                        .Where(f => f.TemplateId == t.Id)
                        .ToDictionary(f => f.PermissionKey, f => f.Value),
                })
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching permission templates");
            throw;
        }
    }

    public async Task<List<PermissionTemplateDto>> ReplaceAllAsync(
        List<PermissionTemplateDto> templates
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var tx = conn.BeginTransaction();

            // Wipe existing data (CASCADE deletes flags)
            await conn.ExecuteAsync("DELETE FROM permission_template_flags;", transaction: tx);
            await conn.ExecuteAsync("DELETE FROM permission_templates;", transaction: tx);

            for (var i = 0; i < templates.Count; i++)
            {
                var tpl = templates[i];
                var templateId = await conn.ExecuteScalarAsync<long>(
                    @"INSERT INTO permission_templates (label, css_class, sort_order)
                      VALUES (@Label, @CssClass, @SortOrder);
                      SELECT last_insert_rowid();",
                    new
                    {
                        tpl.Label,
                        tpl.CssClass,
                        SortOrder = i,
                    },
                    transaction: tx
                );

                if (tpl.Permissions is { Count: > 0 })
                {
                    foreach (var (key, value) in tpl.Permissions)
                    {
                        await conn.ExecuteAsync(
                            @"INSERT INTO permission_template_flags (template_id, permission_key, value)
                              VALUES (@TemplateId, @Key, @Value);",
                            new
                            {
                                TemplateId = templateId,
                                Key = key,
                                Value = value,
                            },
                            transaction: tx
                        );
                    }
                }
            }

            tx.Commit();

            return await GetAllAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error replacing permission templates");
            throw;
        }
    }

    public async Task<HashSet<string>> GetPermissionColumnsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var columns = await conn.QueryAsync<dynamic>("PRAGMA table_info('permissions');");
            var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var col in columns)
            {
                string name = col.name;
                if (!string.Equals(name, "user_id", StringComparison.OrdinalIgnoreCase))
                    result.Add(name);
            }

            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error reading permission columns");
            throw;
        }
    }

    public async Task SyncFlagsWithColumnsAsync(HashSet<string> dbColumns)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var templateIds = (
                await conn.QueryAsync<long>("SELECT id FROM permission_templates;")
            ).ToList();

            if (templateIds.Count == 0)
                return;

            using var tx = conn.BeginTransaction();

            // Remove stale flags (permission columns that no longer exist)
            await conn.ExecuteAsync(
                @"DELETE FROM permission_template_flags
                  WHERE permission_key NOT IN @Columns;",
                new { Columns = dbColumns.ToList() },
                transaction: tx
            );

            // Add missing flags (new columns → value = 0/false)
            foreach (var templateId in templateIds)
            {
                foreach (var col in dbColumns)
                {
                    await conn.ExecuteAsync(
                        @"INSERT OR IGNORE INTO permission_template_flags (template_id, permission_key, value)
                          VALUES (@TemplateId, @Key, 0);",
                        new { TemplateId = templateId, Key = col },
                        transaction: tx
                    );
                }
            }

            tx.Commit();

            logger.LogInformation("Permission template flags synced with DB columns.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error syncing permission template flags");
            throw;
        }
    }
}
