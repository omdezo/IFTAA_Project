using CsvHelper;
using CsvHelper.Configuration.Attributes;
using HtmlAgilityPack;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json;

namespace IFTAA_Project
{
    public class Fatwa
    {
        [Name("fatwa_id")]
        public int FatwaId { get; set; }
        [Name("title")]
        public string Title { get; set; }
        [Name("question")]
        public string Question { get; set; }
        [Name("fatwa_answer")]
        public string FatwaAnswer { get; set; }
        [Name("category_id")]
        public int CategoryId { get; set; }
        [Name("category_title")]
        public string CategoryTitle { get; set; }
    }

    public class FatwaDataProcessor
    {
        public IEnumerable<Fatwa> LoadAndCleanFatwas(string csvFilePath)
        {
            using (var reader = new StreamReader(csvFilePath))
            using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
            {
                var records = csv.GetRecords<Fatwa>().ToList();
                foreach (var record in records)
                {
                    record.FatwaAnswer = CleanHtml(record.FatwaAnswer);
                }
                return records;
            }
        }

        private string CleanHtml(string html)
        {
            if (string.IsNullOrEmpty(html)) return html;

            var doc = new HtmlDocument();
            doc.LoadHtml(html);
            return doc.DocumentNode.InnerText;
        }

        public void SaveFatwasByCategoryAsJson(IEnumerable<Fatwa> fatwas, string outputFilePath)
        {
            var fatwasByCategory = fatwas
                .GroupBy(f => new { f.CategoryId, f.CategoryTitle })
                .Select(g => new
                {
                    g.Key.CategoryId,
                    g.Key.CategoryTitle,
                    Fatwas = g.ToList()
                });

            var json = JsonConvert.SerializeObject(fatwasByCategory, Formatting.Indented);
            File.WriteAllText(outputFilePath, json);
        }
    }
} 