import './Theme';

// This is for Electron apps only.
declare global {
    namespace ampcastElectron {
        function quit(): void;
        function setFontSize(fontSize: number): void;
        function setFrameColor(color: string): void;
        function setFrameTextColor(color: string): void;
        function setPort(port: number): void;
        function setTheme(theme: Theme): void;
    }
}
