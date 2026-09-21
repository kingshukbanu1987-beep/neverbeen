using Microsoft.EntityFrameworkCore;
using NeverBeen.API.Entities;

namespace NeverBeen.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<UserProfile> Users => Set<UserProfile>();
    public DbSet<ExternalIdentity> ExternalIdentities => Set<ExternalIdentity>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<GalleryPhoto> GalleryPhotos => Set<GalleryPhoto>();
    public DbSet<CommunityComment> CommunityComments => Set<CommunityComment>();
    public DbSet<CommentReaction> CommentReactions => Set<CommentReaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();

            entity.HasOne(u => u.Country)
                .WithMany()
                .HasForeignKey(u => u.CountryId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(u => u.City)
                .WithMany()
                .HasForeignKey(u => u.CityId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(u => u.Settings)
                .WithOne(s => s.User)
                .HasForeignKey<UserSettings>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExternalIdentity>(entity =>
        {
            entity.HasIndex(i => new { i.Provider, i.ProviderKey }).IsUnique();

            entity.HasOne(i => i.User)
                .WithMany(u => u.Identities)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Country>(entity =>
        {
            entity.HasIndex(c => c.IsoCode2).IsUnique();
        });

        modelBuilder.Entity<City>(entity =>
        {
            entity.HasIndex(c => new { c.CountryId, c.Name }).IsUnique();

            entity.HasOne(c => c.Country)
                .WithMany(c => c.Cities)
                .HasForeignKey(c => c.CountryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GalleryPhoto>(entity =>
        {
            entity.HasOne(g => g.User)
                .WithMany(u => u.GalleryPhotos)
                .HasForeignKey(g => g.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CommunityComment>(entity =>
        {
            entity.HasOne(c => c.Author)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);

            // Replies are removed explicitly in the service layer before a top-level
            // comment is deleted, so the self-reference uses Restrict.
            entity.HasOne(c => c.Parent)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CommentReaction>(entity =>
        {
            entity.HasIndex(r => new { r.CommentId, r.UserId }).IsUnique();

            entity.HasOne(r => r.Comment)
                .WithMany()
                .HasForeignKey(r => r.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
