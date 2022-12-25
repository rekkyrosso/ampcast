type MusicKitType = typeof MusicKit;

export default class MusicKitV1Wrapper {
    private instance!: MusicKit.MusicKitInstance;

    constructor(private readonly MusicKit: MusicKitType) {}

    get version() {
        return this.MusicKit.version;
    }

    get Events() {
        return this.MusicKit.Events;
    }

    get PlaybackStates() {
        return this.MusicKit.PlaybackStates;
    }

    async configure(configuration: MusicKit.Configuration): Promise<MusicKit.MusicKitInstance> {
        const instance: any = this.MusicKit.configure(configuration);
        this.instance = instance;
        Object.defineProperties(instance, {
            volume: {
                get: () => instance.player.volume,
                set: (volume: number) => (instance.player.volume = volume),
            },
            queue: {
                get: () => instance.player.queue,
            },
            isPlaying: {
                get: () => instance.player.isPlaying,
            },
            nowPlayingItem: {
                get: () => instance.player.nowPlayingItem,
            },
        });
        Object.defineProperties(instance.api, {
            music: {
                get: () => (href: string) => this.music(href),
            },
        });
        return this.instance;
    }

    getInstance(): MusicKit.MusicKitInstance {
        const instance = this.instance;
        if (instance) {
            if (!instance.api.music) {
                Object.defineProperties(instance.api, {
                    music: {
                        get: () => (href: string) => this.music(href),
                    },
                });
            }
            return instance;
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
