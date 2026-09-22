using System.ComponentModel.DataAnnotations.Schema;

namespace NeverBeen.API.Entities;

/// <summary>
/// Per-user settings, backing the "Settings" section of the user profile page.
/// One row per user (1:1 with <see cref="UserProfile"/>).
/// </summary>
[Table("UserSettings")]
public class UserSettings
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public UserProfile? User { get; set; }

    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool PhoneNotificationsEnabled { get; set; }

    /// <summary>When false the profile (and photo) is only visible to the user themselves.</summary>
    public bool PublicProfileEnabled { get; set; } = true;

    /// <summary>"light", "dark" or "system".</summary>
    [MaxLength(20)]
    public string Theme { get; set; } = "light";

    [MaxLength(64)]
    public string? Timezone { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
