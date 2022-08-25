type MusicKitType = typeof MusicKit;

export default class MusicKitV1Wrapper {
    private instance!: MusicKit.MusicKitInstance;

    constructor(private readonly MusicKit: MusicKitType) {}

    get Events() {
        return this.MusicKit.Events;
    }

    get PlaybackStates() {
        return this.MusicKit.PlaybackStates;
    }

    async configure(configuration: MusicKit.Configuration): Promise<MusicKit.MusicKitInstance> {
        return new Promise((resolve, reject) => {
            try {
                const musicKit: any = this.MusicKit.configure(configuration);
                Object.defineProperties(musicKit, {
                    volume: {
                        get: () => musicKit.player.volume,
                        set: (volume: number) => (musicKit.player.volume = volume),
                    },
                    queue: {
                        get: () => musicKit.player.queue,
                    },
                    isPlaying: {
                        get: () => musicKit.player.isPlaying,
                    },
                    nowPlayingItem: {
                        get: () => musicKit.player.nowPlayingItem,
                    },
                });
                Object.defineProperties(musicKit.api, {
                    music: {
                        get: () => (href: string) => this.music(href),
                        set: (volume: number) => (musicKit.player.volume = volume),
                    },
                });
                resolve((this.instance = musicKit));
            } catch (err) {
                reject(err);
            }
        });
    }

    getInstance(): MusicKit.MusicKitInstance {
        if (this.instance) {
            return this.instance;
        } else {
            throw Error('Not configured.');
        }
    }

    formatArtworkURL(artwork: MusicKit.Artwork, width: number, height: number): string {
        return this.MusicKit.formatArtworkURL(artwork, width, height);
    }

    private async music(href: string): Promise<any> {
        const musicKit = this.getInstance();
        href = href.replace('{{storefrontId}}', musicKit.storefrontId);
        const response = await fetch(`https://api.music.apple.com${href}`, {
            headers: {
                authorization: `Bearer ${musicKit.developerToken}`,
                'music-user-token': musicKit.musicUserToken,
            },
        });
        if (!response.ok) {
            throw response;
        }
        const data = await response.json();
        return {data};
    }
}
