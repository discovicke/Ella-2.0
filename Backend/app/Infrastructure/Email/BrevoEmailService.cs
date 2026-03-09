using Backend.app.Core.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Backend.app.Infrastructure.Email;

public class EmailSettings
{
    public required string SmtpServer { get; set; }
    public int Port { get; set; }
    public required string Username { get; set; }
    public required string Password { get; set; }
    public required string SenderEmail { get; set; }
    public required string SenderName { get; set; }
}

public class BrevoEmailService(IOptions<EmailSettings> settings, ILogger<BrevoEmailService> logger) : IEmailService
{
    private readonly EmailSettings _settings = settings.Value;

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
        message.To.Add(new MailboxAddress("", to));
        message.Subject = subject;

        message.Body = new TextPart("html")
        {
            Text = body
        };

        using var client = new SmtpClient();
        try
        {
            logger.LogInformation("Connecting to SMTP server {Server}:{Port}", _settings.SmtpServer, _settings.Port);
            await client.ConnectAsync(_settings.SmtpServer, _settings.Port, SecureSocketOptions.StartTls);

            logger.LogInformation("Authenticating as {Username}", _settings.Username);
            await client.AuthenticateAsync(_settings.Username, _settings.Password);

            logger.LogInformation("Sending email to {To}", to);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            
            logger.LogInformation("Email sent successfully to {To}", to);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To}", to);
            throw;
        }
    }
}