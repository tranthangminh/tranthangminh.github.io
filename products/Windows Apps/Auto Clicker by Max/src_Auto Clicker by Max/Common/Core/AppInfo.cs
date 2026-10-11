using System;
using System.Reflection;

namespace MaxApp.Common
{
    /// <summary>
    /// Single Source of Truth for application metadata, dynamic versioning, and display titles.
    /// Provides automatic metadata detection from Assembly attributes (Zero-Config),
    /// while allowing 1-line explicit configuration via AppInfo.Init(...) in Program.cs.
    /// </summary>
    public static class AppInfo
    {
        private static string _appName = null;
        private static string _version = null;
        private static string _appId = null;
        private static string _websiteSlug = null;
        private static string _latestVersionMetaTag = "app-latest-version";

        /// <summary>
        /// Explicitly initializes or overrides application metadata.
        /// Optional: call once at application startup in Program.cs.
        /// </summary>
        public static void Init(string appName, string version = null, string appIdOrSlug = null, string latestVersionMetaTag = null)
        {
            if (!string.IsNullOrEmpty(appName)) _appName = appName;
            if (!string.IsNullOrEmpty(version)) _version = version;
            if (!string.IsNullOrEmpty(appIdOrSlug))
            {
                _appId = appIdOrSlug.Replace(".html", "").Trim();
                _websiteSlug = appIdOrSlug;
            }
            if (!string.IsNullOrEmpty(latestVersionMetaTag)) _latestVersionMetaTag = latestVersionMetaTag;
        }

        /// <summary>
        /// Gets or sets the application name.
        /// Automatically extracted from [assembly: AssemblyProduct] or [assembly: AssemblyTitle].
        /// </summary>
        public static string AppName
        {
            get
            {
                if (_appName == null)
                {
                    try
                    {
                        Assembly asm = Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly();
                        object[] prodAttrs = asm.GetCustomAttributes(typeof(AssemblyProductAttribute), false);
                        if (prodAttrs.Length > 0)
                        {
                            _appName = ((AssemblyProductAttribute)prodAttrs[0]).Product;
                        }

                        if (string.IsNullOrEmpty(_appName))
                        {
                            object[] titleAttrs = asm.GetCustomAttributes(typeof(AssemblyTitleAttribute), false);
                            if (titleAttrs.Length > 0)
                            {
                                _appName = ((AssemblyTitleAttribute)titleAttrs[0]).Title;
                            }
                        }
                    }
                    catch { }

                    if (string.IsNullOrEmpty(_appName))
                    {
                        _appName = "Max App";
                    }
                }
                return _appName;
            }
            set { _appName = value; }
        }

        /// <summary>
        /// Gets the application version formatted dynamically as "Major.Minor" or "Major.Minor.Build" (e.g. "1.1" or "1.1.1").
        /// Automatically extracted from AssemblyVersion in AssemblyInfo.cs if not explicitly set.
        /// </summary>
        public static string Version
        {
            get
            {
                if (_version == null)
                {
                    try
                    {
                        Assembly asm = Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly();
                        Version v = asm.GetName().Version;
                        if (v != null)
                        {
                            if (v.Revision > 0)
                            {
                                _version = string.Format("{0}.{1}.{2}.{3}", v.Major, v.Minor, v.Build, v.Revision);
                            }
                            else if (v.Build > 0)
                            {
                                _version = string.Format("{0}.{1}.{2}", v.Major, v.Minor, v.Build);
                            }
                            else
                            {
                                _version = string.Format("{0}.{1}", v.Major, v.Minor);
                            }
                        }
                    }
                    catch { }

                    if (string.IsNullOrEmpty(_version))
                    {
                        _version = "1.0";
                    }
                }
                return _version;
            }
            set { _version = value; }
        }

        /// <summary>
        /// Gets the full title string (e.g. "Auto Clicker by Max v1.1" or "Book Forge by Max v1.0 (Beta)").
        /// </summary>
        public static string Title
        {
            get
            {
                string ver = Version;
                if (ver.StartsWith("v", StringComparison.OrdinalIgnoreCase))
                {
                    return string.Format("{0} {1}", AppName, ver);
                }
                return string.Format("{0} v{1}", AppName, ver);
            }
        }

        /// <summary>
        /// Gets or sets the application identifier used in products-version.json (e.g. "auto-clicker" or "book-forge").
        /// </summary>
        public static string AppId
        {
            get
            {
                if (_appId == null)
                {
                    if (!string.IsNullOrEmpty(_websiteSlug))
                    {
                        return _websiteSlug.Replace(".html", "").Trim();
                    }
                    return "auto-clicker";
                }
                return _appId;
            }
            set { _appId = value; }
        }

        /// <summary>
        /// Centralized JSON endpoint on GitHub Pages for checking versions of all apps.
        /// </summary>
        public static string VersionCheckUrl
        {
            get { return "https://tranthangminh.github.io/products/products-version.json"; }
        }

        /// <summary>
        /// Gets or sets the product HTML page slug on tranthangminh.github.io/products (e.g. "auto-clicker.html" or "book-forge.html").
        /// </summary>
        public static string WebsiteSlug
        {
            get { return _websiteSlug ?? "products.html"; }
            set { _websiteSlug = value; }
        }

        /// <summary>
        /// Gets or sets the name of the meta tag parsed for the latest version on GitHub Pages.
        /// </summary>
        public static string LatestVersionMetaTag
        {
            get { return _latestVersionMetaTag ?? "app-latest-version"; }
            set { _latestVersionMetaTag = value; }
        }
    }
}
