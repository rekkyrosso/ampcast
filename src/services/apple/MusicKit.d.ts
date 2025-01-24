// Half-arsed attempt to patch the types for Musickit version 3.

declare namespace MusicKit {
    function configure(configuration: Configuration): Promise<MusicKitInstance>;

    interface MusicKitInstance {
        readonly player: never;
        readonly nowPlayingItem: MediaItem;
        readonly nowPlayingItemIndex?: number;
        readonly queue: Queue;
        readonly isPlaying: boolean;
        readonly version: string;
        bitrate: number;
        volume: number;
        // TODO: These overrides don't work well enough.
        clearQueue(): Promise<void>;
        pause(): Promise<void>;
        stop(): Promise<void>;
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
        startTime?: number;
        startPlaying?: boolean;
    }

    enum PlaybackStates {
        none = 0,
        loading = 1,
        playing = 2,
        paused = 3,
        stopped = 4,
        ended = 5,
        seeking = 6,
        waiting = 8,
        stalled = 9,
        completed = 10,
    }
}
