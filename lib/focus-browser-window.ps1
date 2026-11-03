$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class ParleyBrowserWindow {
    public delegate bool EnumProc(IntPtr h, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr param);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder text, int count);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint from, uint to, bool attach);
    [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr h, int command);
    [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    public static bool Focus(uint pid, string title) {
        var matches = new List<IntPtr>();
        EnumWindows((h, unused) => {
            uint owner; GetWindowThreadProcessId(h, out owner);
            if (owner != pid || !IsWindowVisible(h)) return true;
            var text = new StringBuilder(4096); GetWindowText(h, text, text.Capacity);
            string value = text.ToString();
            if (value == title || value.StartsWith(title + " - ", StringComparison.Ordinal)) matches.Add(h);
            return true;
        }, IntPtr.Zero);
        // Never focus a different room/private window when titles are ambiguous.
        if (matches.Count != 1) { Console.Error.WriteLine("window-match-count:" + matches.Count); return false; }
        IntPtr target = matches[0];
        if (IsIconic(target)) ShowWindowAsync(target, 9);
        if (GetForegroundWindow() == target) return true;
        uint ignored;
        uint foregroundThread = GetWindowThreadProcessId(GetForegroundWindow(), out ignored);
        uint targetThread = GetWindowThreadProcessId(target, out ignored);
        uint currentThread = GetCurrentThreadId();
        bool foregroundAttached = false, targetAttached = false;
        try {
            if (foregroundThread != 0 && foregroundThread != currentThread)
                foregroundAttached = AttachThreadInput(currentThread, foregroundThread, true);
            if (targetThread != currentThread && targetThread != foregroundThread)
                targetAttached = AttachThreadInput(currentThread, targetThread, true);
            BringWindowToTop(target);
            SetForegroundWindow(target);
        } finally {
            if (targetAttached) AttachThreadInput(currentThread, targetThread, false);
            if (foregroundAttached) AttachThreadInput(currentThread, foregroundThread, false);
        }
        // Window activation/restoration can finish after the API call returns.
        // Observe briefly; do not repeatedly steal focus if the user switches away.
        bool focused = GetForegroundWindow() == target;
        for (int i = 0; !focused && i < 20; i++) {
            System.Threading.Thread.Sleep(25);
            focused = GetForegroundWindow() == target;
        }
        if (!focused) Console.Error.WriteLine("foreground-activation-denied");
        return focused;
    }
}
'@
if (-not [ParleyBrowserWindow]::Focus([uint32]$env:PARLEY_BROWSER_PID, $env:PARLEY_BROWSER_TITLE)) { exit 1 }
