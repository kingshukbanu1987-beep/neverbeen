using NeverBeen.API.Entities;

namespace NeverBeen.API.Dtos;

public static class ProfileMapper
{
    public static ProfileDto ToDto(UserProfile user, List<GalleryPhotoDto> gallery, int commentCount)
    {
        return new ProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Gender = user.Gender,
            DateOfBirth = user.DateOfBirth,
            Age = CalculateAge(user.DateOfBirth),
            CountryId = user.CountryId,
            CountryName = user.Country?.Name,
            CityId = user.CityId,
            CityName = user.City?.Name,
            Pincode = user.Pincode,
            ContactNumber = user.ContactNumber,
            PostalAddress = user.PostalAddress,
            AboutMe = user.AboutMe,
            Profession = user.Profession,
            Status = user.Status,
            ProfilePhotoUrl = user.ProfilePhotoData != null
                ? $"/api/profile/{user.Id}/photo"
                : user.ExternalProfilePictureUrl,
            ExternalProfilePictureUrl = user.ExternalProfilePictureUrl,
            CreatedAtUtc = user.CreatedAtUtc,
            Settings = user.Settings == null
                ? new SettingsDto()
                : new SettingsDto
                {
                    EmailNotificationsEnabled = user.Settings.EmailNotificationsEnabled,
                    PhoneNotificationsEnabled = user.Settings.PhoneNotificationsEnabled,
                    PublicProfileEnabled = user.Settings.PublicProfileEnabled,
                    Theme = user.Settings.Theme,
                    Timezone = user.Settings.Timezone
                },
            Gallery = gallery,
            CommentCount = commentCount
        };
    }

    public static int? CalculateAge(DateTime? dateOfBirth)
    {
        if (dateOfBirth == null)
            return null;

        var today = DateTime.Today;
        var age = today.Year - dateOfBirth.Value.Year;
        if (dateOfBirth.Value.Date > today.AddYears(-age))
            age--;
        return age;
    }
}

public static class CommentMapper
{
    public static CommentDto Map(CommunityComment comment, Dictionary<int, int> myReactions)
    {
        return new CommentDto
        {
            Id = comment.Id,
            Text = comment.Text,
            CreatedAtUtc = comment.CreatedAtUtc,
            LikeCount = comment.LikeCount,
            DislikeCount = comment.DislikeCount,
            Author = new AuthorInfoDto
            {
                Id = comment.Author.Id,
                FullName = comment.Author.FullName,
                ProfilePhotoUrl = comment.Author.ProfilePhotoData != null
                    ? $"/api/profile/{comment.Author.Id}/photo"
                    : comment.Author.ExternalProfilePictureUrl,
                Profession = comment.Author.Profession
            },
            MyReaction = myReactions.TryGetValue(comment.Id, out var reaction)
                ? ReactionTypes.TypeToName.GetValueOrDefault(reaction, "Like")
                : null
        };
    }
}
