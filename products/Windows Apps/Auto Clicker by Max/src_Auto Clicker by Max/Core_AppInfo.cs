using System;
using System.Reflection;

namespace ModernAutoClicker
{
    /// <summary>
    /// Single Source of Truth for application metadata, versioning, and display titles.
    /// </summary>
    public static class AppInfo
    {
        public const string AppName = "Auto Clicker by Max";

        private static string _version = null;

        /// <summary>
        /// Gets the application version formatted as "Major.Minor" (e.g. "1.1").
        /// Automatically extracted from AssemblyVersion in Properties/AssemblyInfo.cs.
        /// </summary>
        public static string Version
        {
            get
            {
                if (_version == null)
                {
                    try
                    {
                        Version v = Assembly.GetExecutingAssembly().GetName().Version;
                        if (v != null)
                        {
                            _version = string.Format("{0}.{1}", v.Major, v.Minor);
                        }
                    }
                    catch { }

                    if (string.IsNullOrEmpty(_version))
                    {
                        _version = "1.1";
                    }
                }
                return _version;
            }
        }

        /// <summary>
        /// Gets the full title string (e.g. "Auto Clicker by Max v1.1").
        /// </summary>
        public static string Title
        {
            get
            {
                return string.Format("{0} v{1}", AppName, Version);
            }
        }
    }
}
