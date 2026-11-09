using System;
using System.Collections.Generic;
using ModernAutoClicker;

// Feeds RecordedTextBuffer the event sequences a recorder sees while typing (real keys + Unikey-style injected rewrites).
class RecTest
{
    static int pass = 0, fail = 0;
    static RecordedTextBuffer b;
    static int t;

    static void Real(string s) { foreach (char c in s) { t += 150; b.AddRealText(c.ToString(), t); } }
    static void RealBack() { t += 150; b.Backspace(false, t); }
    // Unikey: swallows the trigger key (seenByUs = our hook still saw it), then injects Backspace x n + replacement text
    static void Ime(char trigger, int backspaces, string replacement, bool seenByUs)
    {
        t += 150;
        if (seenByUs) b.AddRealText(trigger.ToString(), t);
        int it = t + 2;
        for (int i = 0; i < backspaces; i++) b.Backspace(true, it++);
        foreach (char c in replacement) b.AddInjectedText(c.ToString(), it++);
    }
    static void Check(string name, string expected)
    {
        string got = b.Take();
        bool ok = got == expected;
        if (ok) pass++; else fail++;
        Console.WriteLine((ok ? "PASS " : "FAIL ") + name + " -> [" + got.Replace("\n", "\\n") + "]" + (ok ? "" : " expected [" + expected.Replace("\n", "\\n") + "]"));
    }

    static void Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        foreach (bool seen in new[] { true, false })
        {
            string tag = seen ? " (hook sees key)" : " (IME first)";
            b = new RecordedTextBuffer(); t = 0;
            Real("he"); Ime('r', 1, "ẻ", seen); Check("her" + tag, "hẻ");

            Real("d"); Ime('d', 1, "đ", seen); Real("ung"); Ime('s', 3, "úng", seen); Check("ddungs" + tag, "đúng");

            Real("Vie"); Ime('e', 1, "ê", seen); Real("t"); Ime('j', 2, "ệt", seen); Real(" Nam"); Check("Vieetj Nam" + tag, "Việt Nam");

            Real("hoa"); Ime('f', 1, "à", seen); Check("hoaf" + tag, "hoà");
        }

        b = new RecordedTextBuffer(); t = 0;
        Real("Hello World"); Check("plain text with space", "Hello World");
        Real("line 1\nline 2"); Check("enter inside text", "line 1\nline 2");
        Real("helo"); RealBack(); Real("lo"); Check("backspace fix", "hello");
        Real("abc"); t += 5; b.AddRealText("d", t); Check("fast keys, no IME", "abcd");
        Console.WriteLine("pass=" + pass + " fail=" + fail);
    }
}
