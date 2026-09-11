using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace BookForge
{
    public class EngineRunner
    {
        public event Action<string> OnLogReceived;
        public event Action<int, string> OnProgressUpdated;
        public event Action<bool, string> OnCompleted;

        private Process runningProcess = null;
        private bool isCancelled = false;

        public bool IsRunning
        {
            get { return runningProcess != null && !runningProcess.HasExited; }
        }

        public bool IsCancelled
        {
            get { return isCancelled; }
        }

        public void Reset()
        {
            isCancelled = false;
            runningProcess = null;
        }

        public void Cancel()
        {
            isCancelled = true;
            if (runningProcess != null && !runningProcess.HasExited)
            {
                try
                {
                    int pid = runningProcess.Id;
                    ProcessStartInfo psi = new ProcessStartInfo("taskkill", string.Format("/F /T /PID {0}", pid));
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process p = Process.Start(psi);
                    if (p != null) p.WaitForExit(2000);
                }
                catch
                {
                    try { runningProcess.Kill(); } catch { }
                }
            }
        }

        public Task<bool> RunCommandAsync(string workingDir, string scriptRelativePath, string arguments)
        {
            if (isCancelled)
            {
                return Task.FromResult(false);
            }
            return Task.Factory.StartNew<bool>(() =>
            {
                return ExecuteProcess(workingDir, scriptRelativePath, arguments);
            });
        }

        private bool ExecuteProcess(string workingDir, string scriptRelativePath, string arguments)
        {
            if (isCancelled) return false;

            string nodePath = FindNodeExecutable();
            if (string.IsNullOrEmpty(nodePath))
            {
                EmitLog("[ERROR] Node.js (node.exe) was not found on this system! Please install Node.js.");
                if (OnCompleted != null) OnCompleted(false, "Node.js not found");
                return false;
            }

            // Locate script file
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            try
            {
                string asmDir = Path.GetDirectoryName(typeof(EngineRunner).Assembly.Location);
                if (!string.IsNullOrEmpty(asmDir) && Directory.Exists(asmDir))
                {
                    appDir = asmDir;
                }
            }
            catch { }
            string scriptPath = Path.Combine(appDir, "script", scriptRelativePath);
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(appDir, "src_Book Forge by Max", "script", scriptRelativePath);
            }
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(appDir, "src_BookForge", "script", scriptRelativePath);
            }
            if (!File.Exists(scriptPath))
            {
                try
                {
                    string[] srcDirs = Directory.GetDirectories(appDir, "src_*");
                    foreach (string sDir in srcDirs)
                    {
                        string candidate = Path.Combine(sDir, "script", scriptRelativePath);
                        if (File.Exists(candidate))
                        {
                            scriptPath = candidate;
                            break;
                        }
                    }
                }
                catch { }
            }
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(workingDir, "script", scriptRelativePath);
            }
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(appDir, "script", scriptRelativePath);
            }

            if (!File.Exists(scriptPath))
            {
                EmitLog(string.Format("[ERROR] Script file not found: {0}", scriptPath));
                if (OnCompleted != null) OnCompleted(false, "Missing script file");
                return false;
            }

            // Locate Edge Chromium
            string edgePath = EdgeDetector.FindChromiumExecutable();

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodePath;
            psi.Arguments = string.Format("\"{0}\" {1}", scriptPath, arguments);
            psi.WorkingDirectory = workingDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.StandardOutputEncoding = Encoding.UTF8;
            psi.StandardErrorEncoding = Encoding.UTF8;

            // Inject Edge path into environment variable for Puppeteer
            if (!string.IsNullOrEmpty(edgePath))
            {
                psi.EnvironmentVariables["PUPPETEER_EXECUTABLE_PATH"] = edgePath;
                psi.EnvironmentVariables["CHROME_PATH"] = edgePath;
            }

            EmitLog(string.Format("[*] Launching: node {0} {1}", Path.GetFileName(scriptPath), arguments));
            if (!string.IsNullOrEmpty(edgePath))
            {
                EmitLog(string.Format("[*] PDF Engine Browser: {0}", Path.GetFileName(edgePath)));
            }

            try
            {
                if (isCancelled) return false;

                using (Process p = new Process())
                {
                    p.StartInfo = psi;
                    runningProcess = p;

                    p.OutputDataReceived += (s, e) =>
                    {
                        if (e.Data != null)
                        {
                            EmitLog(e.Data);
                            ParseProgress(e.Data);
                        }
                    };

                    p.ErrorDataReceived += (s, e) =>
                    {
                        if (e.Data != null)
                        {
                            EmitLog(string.Format("[STDERR] {0}", e.Data));
                        }
                    };

                    p.Start();
                    if (isCancelled)
                    {
                        try { p.Kill(); } catch { }
                        return false;
                    }

                    p.BeginOutputReadLine();
                    p.BeginErrorReadLine();
                    p.WaitForExit();

                    int exitCode = -1;
                    try { exitCode = p.ExitCode; } catch { }
                    bool success = (exitCode == 0) && !isCancelled;
                    if (OnCompleted != null)
                    {
                        OnCompleted(success, success ? "Process completed successfully!" : "Process terminated with exit code " + exitCode);
                    }
                    return success;
                }
            }
            catch (Exception ex)
            {
                EmitLog(string.Format("[EXCEPTION] {0}", ex.Message));
                if (OnCompleted != null) OnCompleted(false, ex.Message);
                return false;
            }
            finally
            {
                runningProcess = null;
            }
        }

        private void ParseProgress(string line)
        {
            if (OnProgressUpdated == null) return;

            // Pattern detection for progress %
            if (line.Contains("[Pass 1/4]"))
            {
                OnProgressUpdated(25, "Pass 1/4: Page measurement & layout inspection...");
            }
            else if (line.Contains("[Pass 2/4]"))
            {
                OnProgressUpdated(50, "Pass 2/4: Alternating gutter rendering & image layout...");
            }
            else if (line.Contains("[Pass 3/4]"))
            {
                OnProgressUpdated(75, "Pass 3/4: Dynamic running headers & TOC stamping...");
            }
            else if (line.Contains("[Pass 4/4]"))
            {
                OnProgressUpdated(90, "Pass 4/4: PDF compilation & outline merging...");
            }
            else if (line.Contains("COMPILATION COMPLETE") || line.Contains("EXTRACTION COMPLETE") || line.Contains("PUBLISHING COMPLETE"))
            {
                OnProgressUpdated(100, "Completed!");
            }
            else if (line.Contains("Saved: chapters_original/"))
            {
                OnProgressUpdated(60, "Decomposing chapter chunks...");
            }
        }

        private void EmitLog(string text)
        {
            if (OnLogReceived != null)
            {
                OnLogReceived(text);
            }
        }

        public static string FindNodeExecutable()
        {
            // Check current PATH
            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                string[] paths = pathEnv.Split(';');
                foreach (string p in paths)
                {
                    try
                    {
                        string full = Path.Combine(p.Trim(), "node.exe");
                        if (File.Exists(full)) return full;
                    }
                    catch { }
                }
            }

            // Check standard program files
            string pfNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
            if (File.Exists(pfNode)) return pfNode;

            return "node"; // fallback to system command
        }
    }
}
