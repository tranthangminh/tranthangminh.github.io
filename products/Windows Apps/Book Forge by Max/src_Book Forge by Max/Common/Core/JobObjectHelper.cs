using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace MaxApp.Common
{
    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryLimit;
        public UIntPtr PeakJobMemoryLimit;
    }

    public enum JobObjectInfoType
    {
        ExtendedLimitInformation = 9
    }

    /// <summary>
    /// Manages a Windows Job Object configured with JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE.
    /// Guarantees that any spawned child process (and all descendant processes like Puppeteer/Edge)
    /// are automatically terminated by the Windows Kernel when this process exits or closes.
    /// </summary>
    public static class JobObjectHelper
    {
        private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetInformationJobObject(
            IntPtr hJob,
            JobObjectInfoType JobObjectInfoClass,
            IntPtr lpJobObjectInfo,
            uint cbJobObjectInfoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CloseHandle(IntPtr hObject);

        private static readonly object _syncRoot = new object();
        private static IntPtr _jobHandle = IntPtr.Zero;
        private static readonly System.Collections.Generic.List<int> _trackedPids = new System.Collections.Generic.List<int>();

        static JobObjectHelper()
        {
            EnsureJobObjectCreated();
            AppDomain.CurrentDomain.ProcessExit += (s, e) => TerminateAllProcesses();
        }

        private static void EnsureJobObjectCreated()
        {
            if (_jobHandle != IntPtr.Zero) return;

            lock (_syncRoot)
            {
                if (_jobHandle != IntPtr.Zero) return;

                try
                {
                    _jobHandle = CreateJobObject(IntPtr.Zero, null);
                    if (_jobHandle != IntPtr.Zero)
                    {
                        JOBOBJECT_EXTENDED_LIMIT_INFORMATION extendedInfo = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                        extendedInfo.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

                        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
                        IntPtr extendedInfoPtr = Marshal.AllocHGlobal(length);
                        try
                        {
                            Marshal.StructureToPtr(extendedInfo, extendedInfoPtr, false);
                            SetInformationJobObject(_jobHandle, JobObjectInfoType.ExtendedLimitInformation, extendedInfoPtr, (uint)length);
                        }
                        finally
                        {
                            Marshal.FreeHGlobal(extendedInfoPtr);
                        }
                    }
                }
                catch (Exception) { /* Non-critical job object initialization fallback */ }
            }
        }

        public static void TrackProcess(Process process)
        {
            if (process == null) return;

            try
            {
                EnsureJobObjectCreated();
                if (_jobHandle != IntPtr.Zero)
                {
                    AssignProcessToJobObject(_jobHandle, process.Handle);
                }

                lock (_syncRoot)
                {
                    if (!_trackedPids.Contains(process.Id))
                    {
                        _trackedPids.Add(process.Id);
                    }
                }
            }
            catch (Exception) { /* Non-critical process tracking fallback */ }
        }

        public static void TerminateProcessTree(int pid)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("taskkill", string.Format("/F /T /PID {0}", pid));
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(1500);
                }
            }
            catch (Exception) { /* Fallback kill */ }
        }

        public static void TerminateAllProcesses()
        {
            lock (_syncRoot)
            {
                foreach (int pid in _trackedPids)
                {
                    TerminateProcessTree(pid);
                }
                _trackedPids.Clear();

                if (_jobHandle != IntPtr.Zero)
                {
                    try { CloseHandle(_jobHandle); } catch (Exception) { }
                    _jobHandle = IntPtr.Zero;
                }
            }
        }
    }
}
