using MaxApp.Common;
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
                    JobObjectHelper.TerminateProcessTree(pid);
                }
                catch
                {
                    try { runningProcess.Kill(); } catch (Exception) { /* Process might already be dead or access denied */ }
                }
            }
            JobObjectHelper.TerminateAllProcesses();
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
            catch (Exception) { /* Non-critical assembly directory fallback */ }

            string[] candidatePaths = new string[]
            {
                Path.Combine(appDir, "script", scriptRelativePath),
                Path.Combine(appDir, "for_zip", "script", scriptRelativePath),
                Path.Combine(appDir, "src_Book Forge by Max", "script", scriptRelativePath),
                Path.Combine(workingDir, "script", scriptRelativePath)
            };

            string scriptPath = null;
            foreach (string candidate in candidatePaths)
            {
                if (File.Exists(candidate))
                {
                    scriptPath = candidate;
                    break;
                }
            }

            if (scriptPath == null)
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
                catch (Exception) { /* Non-critical wildcard directory probe fallback */ }
            }

            if (string.IsNullOrEmpty(scriptPath) || !File.Exists(scriptPath))
            {
                EmitLog(string.Format("[ERROR] Script file not found: {0}", Path.Combine(appDir, "script", scriptRelativePath)));
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

            // Inject NODE_PATH pointing to script/node_modules for local bundled modules
            try
            {
                string scriptDir = Path.GetDirectoryName(scriptPath);
                if (!string.IsNullOrEmpty(scriptDir))
                {
                    string localModules = Path.Combine(scriptDir, "node_modules");
                    if (Directory.Exists(localModules))
                    {
                        string existingNodePath = psi.EnvironmentVariables.ContainsKey("NODE_PATH") ? psi.EnvironmentVariables["NODE_PATH"] : "";
                        psi.EnvironmentVariables["NODE_PATH"] = string.IsNullOrEmpty(existingNodePath) ? localModules : localModules + ";" + existingNodePath;
                    }
                }
            }
            catch (Exception) { /* Non-critical environment configuration fallback */ }

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
                    JobObjectHelper.TrackProcess(p);
                    if (isCancelled)
                    {
                        try { p.Kill(); } catch (Exception) { /* Process may already have exited */ }
                        return false;
                    }

                    p.BeginOutputReadLine();
                    p.BeginErrorReadLine();
                    p.WaitForExit();

                    int exitCode = -1;
                    try { exitCode = p.ExitCode; } catch (Exception) { /* Exit code may be unavailable if terminated externally */ }
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
            // 1. Check local app directory or subfolders for portable node.exe
            try
            {
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string localNode = Path.Combine(appDir, "node.exe");
                if (File.Exists(localNode)) return localNode;

                string localNodeSub = Path.Combine(appDir, "nodejs", "node.exe");
                if (File.Exists(localNodeSub)) return localNodeSub;

                string scriptNodeSub = Path.Combine(appDir, "script", "node.exe");
                if (File.Exists(scriptNodeSub)) return scriptNodeSub;
            }
            catch (Exception) { /* Non-critical local node probe fallback */ }

            // 2. Check current PATH
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
                    catch (Exception) { /* Ignore invalid or inaccessible PATH segment */ }
                }
            }

            // 3. Check standard program files
            string pfNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
            if (File.Exists(pfNode)) return pfNode;

            return "node"; // fallback to system command
        }
    }
}
