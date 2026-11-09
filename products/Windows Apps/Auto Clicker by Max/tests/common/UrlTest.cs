using System;
using MaxApp.Common;

class UrlTest
{
    static int fails = 0;
    static void Check(string url, bool expected)
    {
        bool got = UpdateChecker.IsTrustedPageUrl(url);
        if (got != expected) fails++;
        Console.WriteLine((got == expected ? "PASS " : "FAIL ") + (url ?? "(null)") + " -> " + got);
    }

    static int Main()
    {
        Check("https://tranthangminh.github.io/products/auto-clicker", true);
        Check("https://TRANTHANGMINH.github.io/products/book-forge", true);
        Check("http://tranthangminh.github.io/products/auto-clicker", false);
        Check("https://tranthangminh.github.io.evil.example/x", false);
        Check("https://evil.example/tranthangminh.github.io", false);
        Check("https://tranthangminh.github.io@evil.example/", false);
        Check("file:///C:/Windows/System32/calc.exe", false);
        Check("calc.exe", false);
        Check("C:\\Windows\\System32\\calc.exe", false);
        Check("", false);
        Check(null, false);
        Console.WriteLine("RESULT fails=" + fails);
        return fails;
    }
}
