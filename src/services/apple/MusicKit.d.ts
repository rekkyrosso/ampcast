// Half-arsed attempt to patch the types for Musickit version 3.

declare namespace MusicKit {
    function configure(configuration: Configuration): Promise<MusicKitInstance>;
    const isWrapper: boolean | undefined;

    interface MusicKitInstance {
        readonly player: never;
        readonly nowPlayingItem: MediaItem;
        readonly queue: Queue;
        readonly isPlaying: boolean;
        readonly version: string;
        bitrate: number;
        volume: number;
        clearQueue(): Promise<void>;
        pause(): Promise<void>;
    }

    interface API {
        music(
            href: string,
            parameters?: MusicKit.QueryParameters | undefined,
            options?: {fetchOptions: RequestInit | undefined} | undefined
        ): Promise<any>;
    }

    interface SetQueueOptions {
        items?: descriptor[];
    }
}
