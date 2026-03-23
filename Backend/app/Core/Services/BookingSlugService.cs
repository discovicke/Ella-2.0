using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;

namespace Backend.app.Core.Services;

public class BookingSlugService(
    IBookingSlugRepository slugRepo,
    IUserRepository userRepo,
    BookingService bookingService,
    IConfiguration configuration
)
{
    public async Task<BookingSlugResponseDto?> CreateSlugAsync(CreateBookingSlugDto request)
    {
        var user = await userRepo.GetUserByIdAsync(request.UserId);
        if (user == null) return null;

        // Check if user already has a slug
        var existing = await slugRepo.GetByUserIdAsync(request.UserId);
        if (existing != null)
        {
            return MapToResponse(existing, user.DisplayName ?? user.Email);
        }

        var slug = GenerateSecureSlug();
        var bookingSlug = new BookingSlug
        {
            UserId = request.UserId,
            Slug = slug,
            IsActive = true
        };

        var success = await slugRepo.CreateAsync(bookingSlug);
        if (!success) return null;

        return MapToResponse(bookingSlug, user.DisplayName ?? user.Email);
    }

    public async Task<IEnumerable<BookingSlugResponseDto>> GetAllSlugsAsync()
    {
        var slugs = await slugRepo.GetAllAsync();
        var result = new List<BookingSlugResponseDto>();

        foreach (var slug in slugs)
        {
            var user = await userRepo.GetUserByIdAsync(slug.UserId);
            result.Add(MapToResponse(slug, user?.DisplayName ?? "Unknown User"));
        }

        return result;
    }

    public async Task<BookingSlugQuickInfoDto?> GetSlugInfoAsync(string slug)
    {
        var bookingSlug = await slugRepo.GetBySlugAsync(slug);
        if (bookingSlug == null || !bookingSlug.IsActive) return null;

        var user = await userRepo.GetUserByIdAsync(bookingSlug.UserId);
        if (user == null) return null;

        return new BookingSlugQuickInfoDto(user.DisplayName ?? user.Email, user.Id);
    }

    public async Task<AuthResponseDto?> BookWithSlugAsync(string slug, CreatePublicBookingDto request)
    {
        var bookingSlug = await slugRepo.GetBySlugAsync(slug);
        if (bookingSlug == null || !bookingSlug.IsActive) return null;

        var user = await userRepo.GetUserByIdAsync(bookingSlug.UserId);
        if (user == null) return null;

        // Map public booking to a full booking request using the slug's user identity
        var fullRequest = new CreateBookingDto(
            UserId: user.Id,
            RoomId: request.RoomId,
            StartTime: request.StartTime,
            EndTime: request.EndTime,
            Notes: request.Notes,
            Status: Models.Enums.BookingStatus.Active,
            BookerName: user.DisplayName ?? user.Email
        );

        var result = await bookingService.CreateBookingAsync(fullRequest);
        
        if (!result.Success || result.Booking == null) return null;

        return new AuthResponseDto
        {
            Message = "Booking successful",
            Token = "", // No token needed for slug booking
            User = new AuthedUserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                IsBanned = user.IsBanned == Models.Enums.BannedStatus.Banned
            }
        };
    }

    public async Task<bool> DeleteSlugAsync(long id) => await slugRepo.DeleteAsync(id);

    private string GenerateSecureSlug()
    {
        return Guid.NewGuid().ToString("N");
    }

    private BookingSlugResponseDto MapToResponse(BookingSlug slug, string displayName)
    {
        var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:4200";
        return new BookingSlugResponseDto(
            slug.Id,
            slug.UserId,
            displayName,
            slug.Slug,
            slug.IsActive,
            slug.CreatedAt,
            $"{frontendUrl}/bookingform?slug={slug.Slug}"
        );
    }
}