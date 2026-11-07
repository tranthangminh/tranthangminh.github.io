using Loc = ModernAutoClicker.Localization.Loc;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using MaxApp.Common;
using ModernAutoClicker.Advanced;

namespace ModernAutoClicker
{
    /// <summary>
    /// Centralized file manager handling all Save/Load dialogs, JSON importing/exporting, 
    /// and file I/O operations for both Advanced Macro Projects and Simple Coordinates.
    /// </summary>
    public static class FileManager
    {
        #region Advanced Macro Scripts (Save & Load)

        /// <summary>
        /// Prompts the user to save the currently active macro script profile to a JSON file.
        /// </summary>
        public static bool SaveProfileWithDialog(IWin32Window owner, MacroProfile profile)
        {
            if (profile == null) return false;

            string defaultName = !string.IsNullOrEmpty(profile.Name) ? profile.Name : "Script";

            using (SaveFileDialog sfd = new SaveFileDialog
            {
                Title = Loc.FileSaveScriptTitle,
                Filter = Loc.FileFilterScripts,
                FileName = string.Format("{0}.json", defaultName),
                DefaultExt = "json",
                InitialDirectory = AppSettings.GetSaveLoadDirectory()
            })
            {
                if (sfd.ShowDialog(owner) == DialogResult.OK)
                {
                    try
                    {
                        MacroStorage.SaveToFile(profile, sfd.FileName);
                        return true;
                    }
                    catch (Exception ex)
                    {
                        ModernMessageBox.Show(Loc.FileSaveScriptFailed(ex.Message), Loc.FileErrorSaveTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, owner);
                    }
                }
            }
            return false;
        }

        /// <summary>
        /// Prompts the user to load one or multiple macro script files into profiles.
        /// </summary>
        public static bool LoadScriptsWithDialog(IWin32Window owner, Action<List<MacroProfile>> onProfilesLoaded)
        {
            using (OpenFileDialog ofd = new OpenFileDialog
            {
                Title = Loc.FileLoadScriptTitle,
                Filter = Loc.FileFilterScripts,
                DefaultExt = "json",
                Multiselect = true,
                InitialDirectory = AppSettings.GetSaveLoadDirectory()
            })
            {
                if (ofd.ShowDialog(owner) == DialogResult.OK)
                {
                    try
                    {
                        string[] fileNames = ofd.FileNames;
                        if (fileNames == null || fileNames.Length == 0) return false;

                        List<MacroProfile> loadedProfiles = new List<MacroProfile>();

                        foreach (string file in fileNames)
                        {
                            try
                            {
                                MacroProject proj = MacroStorage.LoadProjectFromFile(file);
                                if (proj != null && proj.Profiles != null && proj.Profiles.Count > 0)
                                {
                                    foreach (var profile in proj.Profiles)
                                    {
                                        // If profile has no name, use filename as friendly tab title
                                        if (string.IsNullOrEmpty(profile.Name))
                                        {
                                            string fileNameWithoutExt = Path.GetFileNameWithoutExtension(file);
                                            if (!string.IsNullOrEmpty(fileNameWithoutExt) && fileNameWithoutExt != "_AutoClickerConfig" && fileNameWithoutExt != "AutoClickerConfig")
                                            {
                                                profile.Name = fileNameWithoutExt;
                                            }
                                            else
                                            {
                                                profile.Name = "Script";
                                            }
                                        }
                                        loadedProfiles.Add(profile);
                                    }
                                }
                            }
                            catch (Exception)
                            {
                                // Skip corrupted or unreadable external script file
                            }
                        }

                        if (loadedProfiles.Count > 0)
                        {
                            if (onProfilesLoaded != null)
                            {
                                onProfilesLoaded(loadedProfiles);
                            }
                            return true;
                        }
                        else
                        {
                            ModernMessageBox.Show(Loc.FileNoValidScript, Loc.FileWarningTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning, owner);
                        }
                    }
                    catch (Exception ex)
                    {
                        ModernMessageBox.Show(Loc.FileLoadScriptFailed(ex.Message), Loc.FileErrorLoadTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, owner);
                    }
                }
            }
            return false;
        }

        #endregion

        #region Simple Coordinates (Save & Load)

        /// <summary>
        /// Prompts the user to save the Simple tab point coordinate list to a text file.
        /// </summary>
        public static bool SavePointsWithDialog(IWin32Window owner, List<Point> points)
        {
            if (points == null || points.Count == 0)
            {
                ModernMessageBox.Show(Loc.FileNoPointsToSave, Loc.FileNoticeTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning, owner);
                return false;
            }

            using (SaveFileDialog sfd = new SaveFileDialog
            {
                Title = Loc.FileSavePointsTitle,
                Filter = Loc.FileFilterText,
                FileName = "Points.txt",
                DefaultExt = "txt",
                InitialDirectory = AppSettings.GetSaveLoadDirectory()
            })
            {
                if (sfd.ShowDialog(owner) == DialogResult.OK)
                {
                    try
                    {
                        List<string> lines = new List<string>();
                        foreach (Point p in points)
                        {
                            lines.Add(string.Format("{0},{1}", p.X, p.Y));
                        }
                        File.WriteAllLines(sfd.FileName, lines.ToArray(), System.Text.Encoding.UTF8);
                        ModernMessageBox.Show(Loc.FilePointsSaved(points.Count), Loc.FileSuccessTitle, MessageBoxButtons.OK, MessageBoxIcon.Information, owner);
                        return true;
                    }
                    catch (Exception ex)
                    {
                        ModernMessageBox.Show(Loc.FileSavePointsFailed(ex.Message), Loc.FileErrorSaveTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, owner);
                    }
                }
            }
            return false;
        }

        /// <summary>
        /// Prompts the user to load Simple tab point coordinates from text file(s).
        /// </summary>
        public static bool LoadPointsWithDialog(IWin32Window owner, Action<List<Point>> onPointsLoaded)
        {
            using (OpenFileDialog ofd = new OpenFileDialog
            {
                Title = Loc.FileLoadPointsTitle,
                Filter = Loc.FileFilterText,
                DefaultExt = "txt",
                Multiselect = true,
                InitialDirectory = AppSettings.GetSaveLoadDirectory()
            })
            {
                if (ofd.ShowDialog(owner) == DialogResult.OK)
                {
                    try
                    {
                        string[] fileNames = ofd.FileNames;
                        if (fileNames == null || fileNames.Length == 0) return false;

                        List<Point> loaded = new List<Point>();
                        foreach (string file in fileNames)
                        {
                            string[] lines = File.ReadAllLines(file, System.Text.Encoding.UTF8);
                            foreach (string line in lines)
                            {
                                string trimmed = line.Trim();
                                if (string.IsNullOrEmpty(trimmed)) continue;

                                string[] parts = trimmed.Split(',');
                                if (parts.Length == 2)
                                {
                                    int x, y;
                                    if (int.TryParse(parts[0].Trim(), out x) && int.TryParse(parts[1].Trim(), out y))
                                    {
                                        loaded.Add(new Point(x, y));
                                    }
                                }
                            }
                        }

                        if (loaded.Count > 0)
                        {
                            if (onPointsLoaded != null)
                            {
                                onPointsLoaded(loaded);
                            }
                            if (fileNames.Length > 1)
                                ModernMessageBox.Show(Loc.FilePointsLoadedFromFiles(loaded.Count, fileNames.Length), Loc.FileSuccessTitle, MessageBoxButtons.OK, MessageBoxIcon.Information, owner);
                            else
                                ModernMessageBox.Show(Loc.FilePointsLoaded(loaded.Count), Loc.FileSuccessTitle, MessageBoxButtons.OK, MessageBoxIcon.Information, owner);
                            return true;
                        }
                        else
                        {
                            ModernMessageBox.Show(Loc.FileNoValidPoints, Loc.FileWarningTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning, owner);
                        }
                    }
                    catch (Exception ex)
                    {
                        ModernMessageBox.Show(Loc.FileLoadPointsFailed(ex.Message), Loc.FileErrorLoadTitle, MessageBoxButtons.OK, MessageBoxIcon.Error, owner);
                    }
                }
            }
            return false;
        }

        #endregion

        #region Atomic File I/O Safety

        /// <summary>
        /// Writes content to a file atomically by saving to a temporary file first,
        /// then replacing or moving it to ensure zero risk of corrupted or 0-byte files on crash or power loss.
        /// </summary>
        // backupPath, when given, receives the previous version of the file
        public static void AtomicWriteAllText(string filePath, string content, System.Text.Encoding encoding = null, string backupPath = null)
        {
            if (string.IsNullOrEmpty(filePath)) return;
            if (encoding == null) encoding = System.Text.Encoding.UTF8;

            string dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            string tempFile = filePath + ".tmp." + Guid.NewGuid().ToString("N");
            try
            {
                File.WriteAllText(tempFile, content, encoding);

                if (File.Exists(filePath))
                {
                    ReplaceKeepingOldUntilDone(tempFile, filePath, backupPath);
                }
                else
                {
                    File.Move(tempFile, filePath);
                }
            }
            finally
            {
                if (File.Exists(tempFile))
                {
                    try { File.Delete(tempFile); } catch (Exception ex) { MaxApp.Common.AppLog.Caught(ex); }
                }
            }
        }

        // At no point is the user's data gone: the old file stays until the new one is in place
        private static void ReplaceKeepingOldUntilDone(string tempFile, string filePath, string backupPath)
        {
            const int Attempts = 3;
            const int WaitMs = 50;

            for (int attempt = 1; attempt <= Attempts; attempt++)
            {
                try
                {
                    File.Replace(tempFile, filePath, backupPath);
                    return;
                }
                catch (IOException ex)
                {
                    // Another program may hold the file for a moment. After the last attempt, the file system may simply not support File.Replace.
                    MaxApp.Common.AppLog.Caught(ex);
                    if (attempt < Attempts) System.Threading.Thread.Sleep(WaitMs);
                }
            }

            string aside = filePath + ".old";
            if (File.Exists(aside)) File.Delete(aside);
            File.Move(filePath, aside);
            try
            {
                File.Move(tempFile, filePath);
            }
            catch (IOException)
            {
                File.Move(aside, filePath);
                throw;
            }

            if (backupPath != null)
            {
                File.Copy(aside, backupPath, true);
            }
            File.Delete(aside);
        }

        #endregion
    }
}
