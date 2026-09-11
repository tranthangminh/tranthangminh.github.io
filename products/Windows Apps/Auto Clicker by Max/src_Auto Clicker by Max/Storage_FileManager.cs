using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
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
                Title = "Save Macro Script",
                Filter = "Macro Script (*.json)|*.json|All Files (*.*)|*.*",
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
                        MessageBox.Show(owner, "Failed to save macro script:\n" + ex.Message, "Save Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
                Title = "Load Macro Script(s)",
                Filter = "Macro Files (*.json)|*.json|All Files (*.*)|*.*",
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
                            catch { }
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
                            MessageBox.Show(owner, "No valid macro script found in selected file(s)!", "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        }
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(owner, "Failed to load macro file(s):\n" + ex.Message, "Load Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
                MessageBox.Show(owner, "Point list is empty. Nothing to save!", "Notice", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            using (SaveFileDialog sfd = new SaveFileDialog
            {
                Title = "Save Coordinates List",
                Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*",
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
                        MessageBox.Show(owner, string.Format("Successfully saved {0} coordinates!", points.Count), "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return true;
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(owner, "Failed to save coordinates:\n" + ex.Message, "Save Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
                Title = "Load Coordinates List",
                Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*",
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
                                MessageBox.Show(owner, string.Format("Successfully loaded {0} coordinates from {1} files!", loaded.Count, fileNames.Length), "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                            else
                                MessageBox.Show(owner, string.Format("Successfully loaded {0} coordinates!", loaded.Count), "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                            return true;
                        }
                        else
                        {
                            MessageBox.Show(owner, "No valid coordinates found in selected file(s)!", "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        }
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(owner, "Failed to load coordinates file(s):\n" + ex.Message, "Load Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
            return false;
        }

        #endregion
    }
}
