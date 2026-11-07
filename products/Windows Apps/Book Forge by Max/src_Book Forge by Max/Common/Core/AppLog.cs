using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;
using System.Text;

namespace MaxApp.Common
{
    /// <summary>
    /// Writes errors to error.log next to the app, or to LocalAppData when that folder is read-only.
    /// Never throws and never grows without limit, so it is safe in any catch block.
    /// </summary>
    public static class AppLog
    {
        private const long MaxFileBytes = 1024 * 1024;
        private const int MaxEntriesPerPlace = 3;
        private const string FileName = "error.log";

        private static readonly object _lock = new object();
        private static readonly Dictionary<string, int> _entriesPerPlace = new Dictionary<string, int>();

        public static void Error(string context, Exception ex)
        {
            Write(context, ex);
        }

        /// <summary>
        /// For a catch that carries on as if nothing happened. The same place is written only a few times, so a catch inside a loop cannot fill the file.
        /// Only the member name and line are recorded: a file path would put the build machine's folders in the exe.
        /// </summary>
        public static void Caught(Exception ex, [CallerMemberName] string member = "", [CallerLineNumber] int line = 0)
        {
            string place = member + ":" + line;
            lock (_lock)
            {
                int count;
                _entriesPerPlace.TryGetValue(place, out count);
                if (count >= MaxEntriesPerPlace) return;
                _entriesPerPlace[place] = count + 1;
            }
            Write(place, ex);
        }

        private static void Write(string context, Exception ex)
        {
            string text = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] [{1}] {2}\r\n\r\n", DateTime.Now, context, ex != null ? ex.ToString() : "Unknown exception");
            lock (_lock)
            {
                if (TryAppend(AppDomain.CurrentDomain.BaseDirectory, text)) return;
                TryAppend(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), AppInfo.AppName), text);
            }
        }

        private static bool TryAppend(string folder, string text)
        {
            try
            {
                if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
                string path = Path.Combine(folder, FileName);
                FileInfo existing = new FileInfo(path);
                if (existing.Exists && existing.Length > MaxFileBytes) existing.Delete();
                File.AppendAllText(path, text, Encoding.UTF8);
                return true;
            }
            catch (Exception)
            {
                // The log is the last place an error can go: there is nowhere left to report this one
                return false;
            }
        }
    }
}
