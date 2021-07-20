// Half-arsed attempt to patch the types for Musickit version 3.

declare namespace MusicKit {
    async function configure(configuration: Configuration): Promise<MusicKitInstance>;

    interface MusicKitInstance {
        readonly player: never;
        readonly nowPlayingItem: MediaItem;
        readonly queue: Queue;
        readonly isPlaying: boolean;
        volume: number;
        clearQueue(): Promise<void>;
        pause(): Promise<void>;
    }

    interface SetQueueOptions {
        items?: descriptor[];
    }
}
