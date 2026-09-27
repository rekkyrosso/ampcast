export default interface AmpcastElectron {
    exportPlaylist(request: {
        operationId: string;
        batchId: string;
        bitRate: number;
        name: string;
        concurrency: number;
        destination?: string;
        skipped: number;
        tracks: readonly {
            id: string;
            url: string;
            artworkUrl?: string;
            fileName?: string;
            title: string;
            artist?: string;
            albumArtist?: string;
            album?: string;
            track?: number;
            disc?: number;
            year?: number;
            duration: number;
        }[];
    }, onProgress: (progress: PlaylistExportProgress) => void): Promise<{
        canceled: boolean;
        exported: number;
        skipped: number;
        errors: readonly string[];
        destination?: string;
    }>;
    cancelPlaylistExport(operationId: string): void;
    clearPlaylistExportBatch(batchId: string): void;
    getRemovableExportTargets(): Promise<readonly {
        path: string;
        label: string;
        freeBytes: number;
        totalBytes: number;
    }[]>;
    disableLoopbackAudio: () => Promise<void>;
    enableLoopbackAudio: () => Promise<void>;
    getCredential(key: string): Promise<string>;
    setCredential(key: string, value: string): Promise<void>;
    clearCredentials(): Promise<void>;
    setFontSize(fontSize: number): void;
    setFrameColor(color: string): void;
    setFrameTextColor(color: string): void;
    getLocalhostIP(): Promise<string>;
    getPreferredPort(): Promise<number>;
    setPreferredPort(port: number): Promise<void>;
    quit(): void;
}

export interface PlaylistExportProgress {
    operationId: string;
    completed: number;
    total: number;
    title?: string;
    bytesWritten: number;
    totalBytes?: number;
}
