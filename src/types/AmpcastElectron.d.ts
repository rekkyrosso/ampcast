export default interface AmpcastElectron {
    getCredential(key: string): Promise<string>;
    setCredential(key: string, value: string): Promise<void>;
    clearCredentials(): Promise<void>;
    setFontSize(fontSize: number): void;
    setFrameColor(color: string): void;
    setFrameTextColor(color: string): void;
    setPort(port: number): Promise<void>;
    quit(): void;
}
