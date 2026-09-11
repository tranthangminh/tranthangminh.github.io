using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;

namespace ModernAutoClicker
{
    public static class BuiltInTemplates
    {
        public static Dictionary<string, string> GetAllTemplates()
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            // 1. Read all Embedded JSON Template Resources packaged inside the EXE
            try
            {
                Assembly assembly = Assembly.GetExecutingAssembly();
                string[] resourceNames = assembly.GetManifestResourceNames();

                foreach (string resName in resourceNames)
                {
                    if (resName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                    {
                        string templateName = resName;
                        if (templateName.StartsWith("Template.", StringComparison.OrdinalIgnoreCase))
                        {
                            templateName = templateName.Substring("Template.".Length);
                        }
                        if (templateName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                        {
                            templateName = templateName.Substring(0, templateName.Length - ".json".Length);
                        }

                        if (!string.IsNullOrEmpty(templateName))
                        {
                            try
                            {
                                using (Stream stream = assembly.GetManifestResourceStream(resName))
                                {
                                    if (stream != null)
                                    {
                                        using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                                        {
                                            dict[templateName] = reader.ReadToEnd();
                                        }
                                    }
                                }
                            }
                            catch { }
                        }
                    }
                }
            }
            catch { }

            // 2. Read from disk if local Template folder exists (e.g. during development or portable overrides)
            List<string> searchDirs = new List<string>();
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                foreach (string d in Directory.GetDirectories(baseDir, "src_*"))
                {
                    searchDirs.Add(Path.Combine(d, "Template"));
                }
                searchDirs.Add(Path.Combine(baseDir, "Template"));
            }
            catch { }

            foreach (string dir in searchDirs)
            {
                if (Directory.Exists(dir))
                {
                    try
                    {
                        string[] files = Directory.GetFiles(dir, "*.json");
                        foreach (string f in files)
                        {
                            string name = Path.GetFileNameWithoutExtension(f);
                            if (!string.IsNullOrEmpty(name))
                            {
                                try
                                {
                                    dict[name] = File.ReadAllText(f, Encoding.UTF8);
                                }
                                catch { }
                            }
                        }
                    }
                    catch { }
                }
            }

            return dict;
        }
    }
}
