$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms | Out-Null
Add-Type @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class ParleyNativePicker {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct Filter { [MarshalAs(UnmanagedType.LPWStr)] public string Name; [MarshalAs(UnmanagedType.LPWStr)] public string Spec; }
    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IShellItem {
        void BindToHandler(IntPtr ctx, ref Guid handler, ref Guid iid, out IntPtr result);
        void GetParent(out IShellItem parent);
        void GetDisplayName(uint sigdn, out IntPtr name);
        void GetAttributes(uint mask, out uint attributes);
        void Compare(IShellItem other, uint hint, out int order);
    }
    [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IFileDialog {
        [PreserveSig] int Show(IntPtr owner);
        void SetFileTypes(uint count, [MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 0)] Filter[] filters);
        void SetFileTypeIndex(uint index);
        void GetFileTypeIndex(out uint index);
        void Advise(IntPtr events, out uint cookie);
        void Unadvise(uint cookie);
        void SetOptions(uint options);
        void GetOptions(out uint options);
        void SetDefaultFolder(IShellItem folder);
        void SetFolder(IShellItem folder);
        void GetFolder(out IShellItem folder);
        void GetCurrentSelection(out IShellItem item);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void GetResult(out IShellItem item);
        void AddPlace(IShellItem item, uint position);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string extension);
        void Close(int result);
        void SetClientGuid(ref Guid guid);
        void ClearClientData();
        void SetFilter(IntPtr filter);
    }
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    static extern void SHCreateItemFromParsingName(string path, IntPtr ctx, ref Guid iid, out IShellItem item);

    public static string Pick(bool folder, string start) {
        var dialog = (IFileDialog)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")));
        using (var owner = new Form()) {
            owner.Text = folder ? "Parley — 프로젝트 폴더 선택" : "Parley — VS Code 실행 파일 선택";
            owner.Width = 1; owner.Height = 1; owner.Opacity = 0; owner.ShowInTaskbar = false;
            owner.StartPosition = FormStartPosition.CenterScreen;
            owner.TopMost = true;
            try {
                uint options;
                dialog.GetOptions(out options);
                dialog.SetOptions(options | 0x40u | 0x800u | 0x8u | (folder ? 0x20u : 0x1000u));
                dialog.SetTitle(folder ? "프로젝트 폴더 선택" : "VS Code 실행 파일 선택");
                dialog.SetOkButtonLabel(folder ? "폴더 선택" : "선택");
                if (!folder) dialog.SetFileTypes(1, new[] { new Filter { Name = "VS Code (Code.exe)", Spec = "Code.exe;Code - Insiders.exe" } });
                if (!String.IsNullOrWhiteSpace(start) && Directory.Exists(start)) {
                    IShellItem initial;
                    var iid = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
                    SHCreateItemFromParsingName(start, IntPtr.Zero, ref iid, out initial);
                    try { dialog.SetFolder(initial); } finally { Marshal.ReleaseComObject(initial); }
                }
                owner.Show(); owner.Activate();
                int result = dialog.Show(owner.Handle);
                if (result == unchecked((int)0x800704C7)) return null;
                Marshal.ThrowExceptionForHR(result);
                IShellItem selected;
                dialog.GetResult(out selected);
                try {
                    IntPtr name;
                    selected.GetDisplayName(0x80058000u, out name);
                    try { return Marshal.PtrToStringUni(name); } finally { Marshal.FreeCoTaskMem(name); }
                } finally { Marshal.ReleaseComObject(selected); }
            } finally { owner.Close(); Marshal.ReleaseComObject(dialog); }
        }
    }
}
'@ -ReferencedAssemblies System.Windows.Forms
if ($parleyPickerCompileOnly) { return }
$picked = [ParleyNativePicker]::Pick(($parleyPickerKind -eq 'folder'), $parleyPickerStart)
if ($picked) { Write-Output $picked }
