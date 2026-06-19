declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: unknown);
    setFont(fontName: string, fontStyle?: string): void;
    setFontSize(size: number): void;
    text(text: string | string[], x: number, y: number, options?: { maxWidth?: number }): void;
    addPage(): void;
    output(type: 'blob'): Blob;
  }
}

declare module '@capacitor/app' {
  export const App: {
    addListener(event: 'backButton', callback: (data: { canGoBack: boolean }) => void): Promise<{ remove: () => void }>;
    exitApp(): Promise<void>;
    removeAllListeners(): Promise<void>;
  };
}

declare module '@capacitor/status-bar' {
  export const StatusBar: {
    hide(): Promise<void>;
    show(): Promise<void>;
  };
}

declare module '@capgo/capacitor-navigation-bar' {
  export const NavigationBar: {
    hide(): Promise<void>;
    show(): Promise<void>;
  };
}

declare module '@capacitor/clipboard' {
  export const Clipboard: {
    write(options: { string: string }): Promise<void>;
  };
}

declare module '@capacitor/filesystem' {
  export enum Directory {
    Cache = 'CACHE',
    Documents = 'DOCUMENTS',
  }
  export const Filesystem: {
    writeFile(options: { path: string; data: string; directory: Directory }): Promise<{ uri: string }>;
  };
}

declare module '@capacitor/share' {
  export const Share: {
    share(options: { title: string; text: string; url?: string; files?: string[]; dialogTitle: string }): Promise<void>;
  };
}
