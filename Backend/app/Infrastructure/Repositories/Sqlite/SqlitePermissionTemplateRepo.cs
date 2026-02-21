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
                    Id = t.Id,
                    Name = t.Name,
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

    public async Task<PermissionTemplateDto?> GetByIdAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var template = await conn.QuerySingleOrDefaultAsync<PermissionTemplate>(
                "SELECT * FROM permission_templates WHERE id = @id;",
                new { id }
            );

            if (template is null)
                return null;

            var flags = (
                await conn.QueryAsync<PermissionTemplateFlag>(
                    "SELECT * FROM permission_template_flags WHERE template_id = @id;",
                    new { id }
                )
            ).ToList();

            return new PermissionTemplateDto
            {
                Id = template.Id,
                Name = template.Name,
                Label = template.Label,
                CssClass = template.CssClass,
                Permissions = flags.ToDictionary(f => f.PermissionKey, f => f.Value),
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching permission template {TemplateId}", id);
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

            // 1. Identify IDs present in the input list (to know what to keep)
            var inputIds = templates
                .Where(t => t.Id.HasValue && t.Id.Value > 0)
                .Select(t => t.Id!.Value)
                .ToList();

            // 2. Delete templates NOT in the input list (Safe Delete Check)
            if (inputIds.Count > 0)
            {
                // Check if any users are assigned to the templates we are about to delete
                const string checkSql = @"
                    SELECT COUNT(*) 
                    FROM users 
                    WHERE permission_template_id NOT IN @Ids AND permission_template_id IS NOT NULL";
                
                var dependentUserCount = await conn.ExecuteScalarAsync<int>(checkSql, new { Ids = inputIds }, transaction: tx);

                if (dependentUserCount > 0)
                {
                    throw new InvalidOperationException($"Cannot delete roles because {dependentUserCount} user(s) are still assigned to them. Please reassign these users before deleting the role.");
                }

                await conn.ExecuteAsync(
                    "DELETE FROM permission_templates WHERE id NOT IN @Ids;",
                    new { Ids = inputIds },
                    transaction: tx
                );
            }
            else if (templates.Count == 0) // Edge case: wipe all templates
            {
                // Check if any users are assigned to ANY template
                var dependentUserCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE permission_template_id IS NOT NULL;", transaction: tx);
                if (dependentUserCount > 0)
                {
                    throw new InvalidOperationException($"Cannot delete all roles because {dependentUserCount} user(s) are assigned to roles. Please reassign them first.");
                }

                await conn.ExecuteAsync("DELETE FROM permission_templates;", transaction: tx);
            }


            // 3. Upsert templates
            for (var i = 0; i < templates.Count; i++)
            {
                var tpl = templates[i];
                long templateId;

                if (tpl.Id is > 0)
                {
                    // Update existing
                    await conn.ExecuteAsync(
                        @"UPDATE permission_templates 
                          SET name = @Name, label = @Label, css_class = @CssClass, sort_order = @SortOrder
                          WHERE id = @Id;",
                        new
                        {
                            Id = tpl.Id.Value,
                            Name = !string.IsNullOrEmpty(tpl.Name) ? tpl.Name : tpl.Label.ToLower().Replace(" ", "-"),
                            tpl.Label,
                            tpl.CssClass,
                            SortOrder = i,
                        },
                        transaction: tx
                    );
                    templateId = tpl.Id.Value;
                }
                else
                {
                    // Insert new
                    templateId = await conn.ExecuteScalarAsync<long>(
                        @"INSERT INTO permission_templates (name, label, css_class, sort_order)
                          VALUES (@Name, @Label, @CssClass, @SortOrder);
                          SELECT last_insert_rowid();",
                        new
                        {
                            Name = !string.IsNullOrEmpty(tpl.Name) ? tpl.Name : tpl.Label.ToLower().Replace(" ", "-"),
                            tpl.Label,
                            tpl.CssClass,
                            SortOrder = i,
                        },
                        transaction: tx
                    );
                }

                // 4. Replace flags for this template
                // Safe to delete/insert flags as they don't have dependents (except view)
                await conn.ExecuteAsync(
                    "DELETE FROM permission_template_flags WHERE template_id = @TemplateId;",
                    new { TemplateId = templateId },
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
                                Value = value ? 1 : 0,
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
}
