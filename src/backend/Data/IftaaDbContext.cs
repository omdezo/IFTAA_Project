using IFTAA_Project.Models;
using MongoDB.Driver;

namespace IFTAA_Project.Data
{
    public class IftaaDbContext
    {
        private readonly IMongoDatabase _database;

        public IftaaDbContext(IMongoDatabase database)
        {
            _database = database;
        }

        public IMongoCollection<Fatwa> Fatwas => _database.GetCollection<Fatwa>("fatwas");
        public IMongoCollection<User> Users => _database.GetCollection<User>("users");
    }
}