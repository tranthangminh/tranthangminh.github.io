using System;
using System.IO;
using Microsoft.Win32;

namespace BookForge
{
    public static class EdgeDetector
    {
        public static string FindChromiumExecutable()
        {
            // 1. Puppeteer Cached Chrome for Testing (Highest reliability with Puppeteer)
            try
            {
                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string pupCache = Path.Combine(userProfile, ".cache", "puppeteer", "chrome");
                if (Directory.Exists(pupCache))
                {
                    string[] chromeFiles = Directory.GetFiles(pupCache, "chrome.exe", SearchOption.AllDirectories);
                    if (chromeFiles != null && chromeFiles.Length > 0 && File.Exists(chromeFiles[0]))
                    {
                        return chromeFiles[0];
                    }
                }
            }
            catch { }

            // 2. Google Chrome (Primary desktop browser for Puppeteer)
            string chrome64 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
            if (File.Exists(chrome64)) return chrome64;

            string chrome86 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe");
            if (File.Exists(chrome86)) return chrome86;

            // 3. Microsoft Edge fallbacks
            string p86 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
            if (File.Exists(p86)) return p86;

            string p64 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
            if (File.Exists(p64)) return p64;

            // 4. Registry search for Chrome or Edge
            try
            {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"))
                {
                    if (key != null)
                    {
                        object val = key.GetValue("");
                        if (val != null && File.Exists(val.ToString())) return val.ToString();
                    }
                }

                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
                {
                    if (key != null)
                    {
                        object val = key.GetValue("");
                        if (val != null && File.Exists(val.ToString())) return val.ToString();
                    }
                }
            }
            catch { }

            return "";
        }
    }
}
