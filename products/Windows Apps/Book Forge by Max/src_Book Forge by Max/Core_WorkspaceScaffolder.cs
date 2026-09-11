using System;
using System.IO;

namespace BookForge
{
    public static class WorkspaceScaffolder
    {
        public enum OutputLocationMode
        {
            SameAsSource = 0,
            AppFolder = 1,
            CustomFolder = 2
        }

        public static string ResolveBookTargetDirectory(string sourcePath, OutputLocationMode mode, string customFolder)
        {
            if (string.IsNullOrEmpty(sourcePath)) return "";

            string bookName = "";
            string sourceParent = "";

            if (File.Exists(sourcePath))
            {
                bookName = Path.GetFileNameWithoutExtension(sourcePath);
                sourceParent = Path.GetDirectoryName(sourcePath);
            }
            else if (Directory.Exists(sourcePath))
            {
                bookName = Path.GetFileName(sourcePath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
                sourceParent = Path.GetDirectoryName(sourcePath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
            }
            else
            {
                return "";
            }

            string baseDir = "";
            switch (mode)
            {
                case OutputLocationMode.SameAsSource:
                    baseDir = sourceParent;
                    break;
                case OutputLocationMode.AppFolder:
                    string appDir = AppDomain.CurrentDomain.BaseDirectory;
                    string legacyAppDir = Path.Combine(appDir, "BookForge-Files");
                    string newAppDir = Path.Combine(appDir, "Book Forge by Max-Files");
                    baseDir = Directory.Exists(legacyAppDir) ? legacyAppDir : newAppDir;
                    break;
                case OutputLocationMode.CustomFolder:
                    baseDir = !string.IsNullOrEmpty(customFolder) ? customFolder : sourceParent;
                    break;
            }

            if (!Directory.Exists(baseDir))
            {
                try { Directory.CreateDirectory(baseDir); } catch { }
            }

            return Path.Combine(baseDir, bookName);
        }

        public static void ScaffoldWorkspace(string targetBookDir)
        {
            if (string.IsNullOrEmpty(targetBookDir)) return;

            // 1. Create main directories
            string chaptersOrig = Path.Combine(targetBookDir, "chapters_original");
            string chaptersTrans = Path.Combine(targetBookDir, "chapters_translated");
            string imagesOrig = Path.Combine(targetBookDir, "images_original");
            string imagesTrans = Path.Combine(targetBookDir, "images_translated");
            string transBible = Path.Combine(targetBookDir, "translation_bible");

            EnsureDir(chaptersOrig);
            EnsureDir(chaptersTrans);
            EnsureDir(imagesOrig);
            EnsureDir(imagesTrans);
            EnsureDir(transBible);

            // 2. Copy templates if present in app directory
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string templatesDir = Path.Combine(appDir, "Templates");
            if (!Directory.Exists(templatesDir))
            {
                templatesDir = Path.Combine(appDir, "src_Book Forge by Max", "Templates");
            }
            if (!Directory.Exists(templatesDir))
            {
                templatesDir = Path.Combine(appDir, "src_BookForge", "Templates");
            }
            if (!Directory.Exists(templatesDir))
            {
                try
                {
                    string[] srcDirs = Directory.GetDirectories(appDir, "src_*");
                    foreach (string sDir in srcDirs)
                    {
                        string candidate = Path.Combine(sDir, "Templates");
                        if (Directory.Exists(candidate))
                        {
                            templatesDir = candidate;
                            break;
                        }
                    }
                }
                catch { }
            }
            if (!Directory.Exists(templatesDir))
            {
                templatesDir = Path.Combine(appDir, "Templates");
            }

            if (Directory.Exists(templatesDir))
            {
                CopyTemplateFile(Path.Combine(templatesDir, "_HEADER-original.md"), Path.Combine(targetBookDir, "_HEADER-original.md"));
                CopyTemplateFile(Path.Combine(templatesDir, "_HEADER-translated.md"), Path.Combine(targetBookDir, "_HEADER-translated.md"));
                CopyTemplateFile(Path.Combine(templatesDir, "_TRANSLATOR_NOTE_original.md"), Path.Combine(targetBookDir, "_TRANSLATOR_NOTE_original.md"));
                CopyTemplateFile(Path.Combine(templatesDir, "_TRANSLATOR_NOTE_translated.md"), Path.Combine(targetBookDir, "_TRANSLATOR_NOTE_translated.md"));

                // Copy Logo
                string logoSrc = Path.Combine(templatesDir, "logo.svg");
                if (File.Exists(logoSrc))
                {
                    CopyTemplateFile(logoSrc, Path.Combine(imagesOrig, "logo.svg"));
                    CopyTemplateFile(logoSrc, Path.Combine(imagesTrans, "logo.svg"));
                }

                // Copy translation_bible templates
                string tbSrc = Path.Combine(templatesDir, "translation_bible");
                if (Directory.Exists(tbSrc))
                {
                    string[] files = Directory.GetFiles(tbSrc, "*.md");
                    foreach (string f in files)
                    {
                        string dest = Path.Combine(transBible, Path.GetFileName(f));
                        CopyTemplateFile(f, dest);
                    }
                }
            }
        }

        private static void EnsureDir(string dir)
        {
            if (!Directory.Exists(dir))
            {
                try { Directory.CreateDirectory(dir); } catch { }
            }
        }

        private static void CopyTemplateFile(string src, string dest)
        {
            if (File.Exists(src) && !File.Exists(dest))
            {
                try { File.Copy(src, dest, false); } catch { }
            }
        }
    }
}
