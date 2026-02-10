using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.Infrastructure.Middleware;

/// <summary>
/// Production-ready global exception handler using the IExceptionHandler pattern (introduced in .NET 8).
/// Converts all application exceptions into standardized RFC 7807 Problem Details responses.
/// </summary>
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        
        logger.LogError(
            exception,
            "An unhandled exception occurred. TraceId: {TraceId}, Message: {Message}",
            traceId,
            exception.Message
        );

        // 1. Map the exception to the correct HTTP Status Code
        var (statusCode, title) = exception switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid Input"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Business Logic Conflict"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Permission Denied"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };

        // 2. Build the Problem Details response (Standard RFC 7807)
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = env.IsDevelopment() ? exception.Message : "Please contact support if the issue persists.",
            Instance = $"{httpContext.Request.Method} {httpContext.Request.Path}",
        };

        // 3. Add extra debugging info for developers
        problemDetails.Extensions.Add("traceId", traceId);
        
        if (env.IsDevelopment())
        {
            problemDetails.Extensions.Add("exception", exception.GetType().Name);
            problemDetails.Extensions.Add("stackTrace", exception.StackTrace);
        }

        // 4. Send the response
        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true; // We handled the exception
    }
}
