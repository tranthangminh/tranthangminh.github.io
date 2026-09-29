using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Windows.Forms;

namespace ModernAutoClicker
{
    public static class UacHelper
    {
        private const int TOKEN_QUERY = 0x0008;
        private const int TokenElevation = 20;

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool GetTokenInformation(IntPtr TokenHandle, int TokenInformationClass, IntPtr TokenInformation, uint TokenInformationLength, out uint ReturnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        [StructLayout(LayoutKind.Sequential)]
        private struct TOKEN_ELEVATION
        {
            public int TokenIsElevated;
        }

        private static bool? _isRunningAsAdminCache = null;

        /// <summary>
        /// Checks whether the current Auto Clicker process is running with Administrator privileges.
        /// </summary>
        public static bool IsRunningAsAdmin()
        {
            if (_isRunningAsAdminCache.HasValue) return _isRunningAsAdminCache.Value;

            try
            {
                using (WindowsIdentity identity = WindowsIdentity.GetCurrent())
                {
                    WindowsPrincipal principal = new WindowsPrincipal(identity);
                    _isRunningAsAdminCache = principal.IsInRole(WindowsBuiltInRole.Administrator);
                    return _isRunningAsAdminCache.Value;
                }
            }
            catch
            {
                _isRunningAsAdminCache = false;
                return false;
            }
        }

        /// <summary>
        /// Checks whether the target window process is running with Elevated (Administrator) privileges.
        /// If the target is Elevated and Auto Clicker is Non-Admin, Windows UIPI will drop input messages.
        /// </summary>
        public static bool IsProcessElevated(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero || !NativeMethods.IsWindow(hWnd)) return false;

            uint pid = 0;
            NativeMethods.GetWindowThreadProcessId(hWnd, out pid);
            if (pid == 0) return false;

            return IsProcessElevated((int)pid);
        }

        /// <summary>
        /// Checks whether a specific process ID is running with Elevated (Administrator) privileges.
        /// </summary>
        public static bool IsProcessElevated(int pid)
        {
            if (pid <= 0) return false;

            Process proc = null;
            IntPtr tokenHandle = IntPtr.Zero;
            IntPtr elevationPtr = IntPtr.Zero;

            try
            {
                proc = Process.GetProcessById(pid);
                if (proc == null || proc.HasExited) return false;

                if (!OpenProcessToken(proc.Handle, TOKEN_QUERY, out tokenHandle))
                {
                    // If we cannot open process token due to Access Denied (Win32 5),
                    // it is almost certainly running at a higher elevation (Admin/System) than our Non-Admin process!
                    int err = Marshal.GetLastWin32Error();
                    if (err == 5 /* ERROR_ACCESS_DENIED */ && !IsRunningAsAdmin())
                    {
                        return true;
                    }
                    return false;
                }

                int elevationSize = Marshal.SizeOf(typeof(TOKEN_ELEVATION));
                elevationPtr = Marshal.AllocHGlobal(elevationSize);
                uint returnLength = 0;

                if (GetTokenInformation(tokenHandle, TokenElevation, elevationPtr, (uint)elevationSize, out returnLength))
                {
                    TOKEN_ELEVATION elevation = (TOKEN_ELEVATION)Marshal.PtrToStructure(elevationPtr, typeof(TOKEN_ELEVATION));
                    return elevation.TokenIsElevated != 0;
                }

                return false;
            }
            catch
            {
                // Access denied on proc.Handle also implies target is elevated compared to caller
                if (!IsRunningAsAdmin()) return true;
                return false;
            }
            finally
            {
                if (elevationPtr != IntPtr.Zero) Marshal.FreeHGlobal(elevationPtr);
                if (tokenHandle != IntPtr.Zero) CloseHandle(tokenHandle);
                if (proc != null) proc.Dispose();
            }
        }

        /// <summary>
        /// Restarts the application requesting Administrator rights via UAC prompt ("runas").
        /// </summary>
        public static bool RestartAsAdmin(string extraArgs = null)
        {
            try
            {
                int currentPid = Process.GetCurrentProcess().Id;
                string restartArgs = "--restart " + currentPid;
                if (!string.IsNullOrEmpty(extraArgs))
                {
                    restartArgs += " " + extraArgs;
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = Application.ExecutablePath,
                    Arguments = restartArgs,
                    UseShellExecute = true,
                    Verb = "runas" // Triggers Windows UAC prompt
                };

                Process.Start(psi);
                Environment.Exit(0);
                return true;
            }
            catch (System.ComponentModel.Win32Exception)
            {
                // User clicked "No" or cancelled the UAC prompt
                return false;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unable to restart as Administrator: " + ex.Message, 
                    "Auto Clicker", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }
        }
    }
}
