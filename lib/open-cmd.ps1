$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class ParleyConsole {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct StartupInfo {
        public int cb; public string reserved, desktop, title;
        public int x,y,xSize,ySize,xChars,yChars,fill,flags;
        public short show, reservedSize;
        public IntPtr reservedPtr, input, output, error;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ProcessInfo { public IntPtr process, thread; public int processId, threadId; }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool CreateProcessW(string app, StringBuilder command, IntPtr processAttrs,
        IntPtr threadAttrs, bool inheritHandles, uint flags, IntPtr environment,
        string cwd, ref StartupInfo startup, out ProcessInfo process);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    public static int Open(string exe, string cwd) {
        var startup = new StartupInfo { cb=Marshal.SizeOf(typeof(StartupInfo)), flags=1, show=1 };
        ProcessInfo process;
        // CREATE_NEW_CONSOLE; never inherit the hidden server's stdin or console.
        if (!CreateProcessW(exe, new StringBuilder("\""+exe+"\" /d /k"), IntPtr.Zero,
            IntPtr.Zero, false, 0x10, IntPtr.Zero, cwd, ref startup, out process))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        CloseHandle(process.thread); CloseHandle(process.process);
        return process.processId;
    }
}
'@
[ParleyConsole]::Open($env:PARLEY_CMD_EXE, $env:PARLEY_CMD_CWD)
