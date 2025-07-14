using IFTAA_Project.Models;
using Microsoft.EntityFrameworkCore;

namespace IFTAA_Project.Data
{
    public class IftaaDbContext : DbContext
    {
        public IftaaDbContext(DbContextOptions<IftaaDbContext> options) : base(options)
        {
        }

        public DbSet<Fatwa> Fatwas { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure a unique index on FatwaId to prevent duplicates
            modelBuilder.Entity<Fatwa>()
                .HasIndex(f => f.FatwaId)
                .IsUnique();
            
            // Configure a unique index on UserId
            modelBuilder.Entity<User>()
                .HasIndex(u => u.UserId)
                .IsUnique();
        }
    }
} 