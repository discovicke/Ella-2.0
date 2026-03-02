using System.ComponentModel.DataAnnotations;

namespace Backend.app.Infrastructure.Middleware;

/// <summary>
/// Endpoint filter that automatically validates [MaxLength] and other
/// System.ComponentModel.DataAnnotations attributes on DTO parameters.
/// Applied once on the API group — no manual CheckLength() calls needed.
/// </summary>
public class ValidationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next
    )
    {
        foreach (var argument in context.Arguments)
        {
            if (argument is null)
                continue;

            var errors = Validate(argument);
            if (errors.Count > 0)
            {
                return Results.BadRequest(new { errors });
            }
        }

        return await next(context);
    }

    private static List<string> Validate(object obj)
    {
        var type = obj.GetType();

        // Skip primitives, enums, strings, value types — only validate complex DTOs
        if (
            type.IsPrimitive
            || type.IsEnum
            || obj is string
            || obj is decimal
            || obj is DateTime
            || obj is DateTimeOffset
        )
            return [];

        // Handle lists/arrays — validate each item (e.g. List<PermissionTemplateDto>)
        if (obj is System.Collections.IEnumerable enumerable)
        {
            var errors = new List<string>();
            foreach (var item in enumerable)
            {
                if (item is null)
                    continue;
                errors.AddRange(Validate(item));
            }
            return errors;
        }

        // Validate the object's DataAnnotation attributes
        var results = new List<ValidationResult>();
        var ctx = new ValidationContext(obj);
        Validator.TryValidateObject(obj, ctx, results, validateAllProperties: true);

        return results.Where(r => r.ErrorMessage is not null).Select(r => r.ErrorMessage!).ToList();
    }
}
