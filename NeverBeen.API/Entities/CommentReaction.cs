using System.ComponentModel.DataAnnotations.Schema;

namespace NeverBeen.API.Entities;

/// <summary>
/// A like or dislike of a message-book comment. One reaction per user per comment
/// (unique on CommentId + UserId); re-submitting the same reaction removes it (toggle).
/// </summary>
[Table("CommentReactions")]
public class CommentReaction
{
    public long Id { get; set; }

    public int CommentId { get; set; }
    public CommunityComment? Comment { get; set; }

    public int UserId { get; set; }
    public UserProfile? User { get; set; }

    /// <summary><see cref="ReactionTypes.Like"/> (1) or <see cref="ReactionTypes.Dislike"/> (-1).</summary>
    public int ReactionType { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class ReactionTypes
{
    public const int Like = 1;
    public const int Dislike = -1;
}
