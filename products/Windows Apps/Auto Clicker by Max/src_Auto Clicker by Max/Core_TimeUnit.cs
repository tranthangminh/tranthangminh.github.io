using System;
using System.Globalization;
using ModernAutoClicker.Localization;

namespace ModernAutoClicker
{
    /// <summary>
    /// Units a duration can be shown and typed in. Values are always stored in ms; the unit only changes the text:
    /// ms and seconds are plain numbers ("250", "1.5"), minutes use mm:ss ("02:30").
    /// </summary>
    public static class TimeUnit
    {
        public const int Milliseconds = 0;
        public const int Seconds = 1;
        public const int Minutes = 2;
        public const int Count = 3;

        // 99:59, the largest value mm:ss can show
        public const int MaxMs = 99 * 60000 + 59 * 1000;

        public static int Clamp(int unit)
        {
            return (unit < Milliseconds || unit > Minutes) ? Milliseconds : unit;
        }

        public static string ShortName(int unit)
        {
            switch (Clamp(unit))
            {
                case Seconds: return Loc.TimeUnitShortSec;
                case Minutes: return Loc.TimeUnitShortMin;
                default: return Loc.TimeUnitShortMs;
            }
        }

        public static string FullName(int unit)
        {
            switch (Clamp(unit))
            {
                case Seconds: return Loc.TimeUnitNameSec;
                case Minutes: return Loc.TimeUnitNameMin;
                default: return Loc.TimeUnitNameMs;
            }
        }

        public static string Format(int ms, int unit)
        {
            ms = Math.Max(0, ms);
            switch (Clamp(unit))
            {
                case Seconds:
                    return (ms / 1000.0).ToString("0.###", CultureInfo.InvariantCulture);
                case Minutes:
                    // mm:ss has no room for the sub-second part; the stored ms value keeps it
                    int totalSec = ms / 1000;
                    return string.Format(CultureInfo.InvariantCulture, "{0:00}:{1:00}", totalSec / 60, totalSec % 60);
                default:
                    return ms.ToString(CultureInfo.InvariantCulture);
            }
        }

        /// <summary>
        /// Parses text typed in the given unit. Seconds accept "." or "," as the decimal separator (up to 3 places);
        /// minutes accept "m" (whole minutes) or "m:ss". The result is capped at MaxMs.
        /// </summary>
        public static bool TryParse(string text, int unit, out int ms)
        {
            ms = 0;
            string t = (text ?? "").Trim();
            if (t.Length == 0) return false;

            long total;
            switch (Clamp(unit))
            {
                case Seconds:
                    {
                        double sec;
                        if (!double.TryParse(t.Replace(',', '.'), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out sec)) return false;
                        total = (long)Math.Round(Math.Min(sec, MaxMs / 1000.0) * 1000.0);
                        break;
                    }
                case Minutes:
                    {
                        string[] parts = t.Split(':');
                        if (parts.Length > 2) return false;
                        int min = 0, sec = 0;
                        if (parts[0].Length > 0 && !int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out min)) return false;
                        if (parts.Length == 2 && parts[1].Length > 0 && !int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out sec)) return false;
                        total = (long)min * 60000L + (long)sec * 1000L;
                        break;
                    }
                default:
                    {
                        if (!long.TryParse(t, NumberStyles.None, CultureInfo.InvariantCulture, out total)) return false;
                        break;
                    }
            }

            ms = (int)Math.Min(total, (long)MaxMs);
            return true;
        }
    }
}
