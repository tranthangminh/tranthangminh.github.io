using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

// usage: IcoBuild out.ico in16.png in32.png in48.png in256.png
class IcoBuild
{
    static byte[] Dib(Bitmap bmp)
    {
        int w = bmp.Width, h = bmp.Height;
        int maskStride = ((w + 31) / 32) * 4;
        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter bw = new BinaryWriter(ms))
        {
            bw.Write(40); bw.Write(w); bw.Write(h * 2); bw.Write((short)1); bw.Write((short)32);
            bw.Write(0); bw.Write(w * h * 4 + maskStride * h); bw.Write(0); bw.Write(0); bw.Write(0); bw.Write(0);
            for (int y = h - 1; y >= 0; y--)
                for (int x = 0; x < w; x++)
                {
                    Color c = bmp.GetPixel(x, y);
                    bw.Write(c.B); bw.Write(c.G); bw.Write(c.R); bw.Write(c.A);
                }
            for (int y = h - 1; y >= 0; y--)
            {
                byte[] row = new byte[maskStride];
                for (int x = 0; x < w; x++)
                    if (bmp.GetPixel(x, y).A == 0) row[x / 8] |= (byte)(0x80 >> (x % 8));
                bw.Write(row);
            }
            bw.Flush();
            return ms.ToArray();
        }
    }

    static int Main(string[] a)
    {
        List<byte[]> images = new List<byte[]>();
        List<int> sizes = new List<int>();
        for (int i = 1; i < a.Length; i++)
        {
            using (Bitmap src = new Bitmap(a[i]))
            {
                sizes.Add(src.Width);
                if (src.Width >= 256) images.Add(File.ReadAllBytes(a[i]));
                else images.Add(Dib(src));
            }
        }
        using (FileStream fs = new FileStream(a[0], FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            bw.Write((short)0); bw.Write((short)1); bw.Write((short)images.Count);
            int offset = 6 + 16 * images.Count;
            for (int i = 0; i < images.Count; i++)
            {
                bw.Write((byte)(sizes[i] >= 256 ? 0 : sizes[i]));
                bw.Write((byte)(sizes[i] >= 256 ? 0 : sizes[i]));
                bw.Write((byte)0); bw.Write((byte)0); bw.Write((short)1); bw.Write((short)32);
                bw.Write(images[i].Length); bw.Write(offset);
                offset += images[i].Length;
            }
            foreach (byte[] img in images) bw.Write(img);
        }
        // read back and report what Windows sees
        foreach (int s in new[] { 16, 32, 48, 256 })
        {
            using (Icon ico = new Icon(a[0], s, s)) Console.WriteLine("icon asks " + s + " gets " + ico.Width + "x" + ico.Height);
        }
        return 0;
    }
}
