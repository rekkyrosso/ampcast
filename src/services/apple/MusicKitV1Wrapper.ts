type MusicKitType = typeof MusicKit;

export default class MusicKitV1Wrapper {
    readonly isWrapper = true;
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
        if (!this.instance) {
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
                    get:
                        () =>
                        (
                            href: string,
                            params?: MusicKit.QueryParameters,
                            options?: {fetchOptions: RequestInit | undefined}
                        ) =>
                            this.music(href, params, options),
                },
            });
        }
        return this.instance;
    }

    getInstance(): MusicKit.MusicKitInstance {
        const instance = this.instance;
        if (instance) {
            if (!instance.api.music) {
                Object.defineProperties(instance.api, {
                    music: {
                        get:
                            () =>
                            (
                                href: string,
                                params?: MusicKit.QueryParameters,
                                options?: {fetchOptions: RequestInit | undefined}
                            ) =>
                                this.music(href, params, options),
                    },
                });
            }
            return instance;
        } else {
            throw Error('Not configured');
        }
    }

    formatArtworkURL(artwork: MusicKit.Artwork, width: number, height: number): string {
        return this.MusicKit.formatArtworkURL(artwork, width, height);
    }

    private async music(
        href: string,
        params?: MusicKit.QueryParameters,
        options?: {fetchOptions: RequestInit | undefined}
    ): Promise<any> {
        const musicKit = this.getInstance();
        if (params) {
            href = `${href}${href.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;
        }
        href = href.replace('{{storefrontId}}', musicKit.storefrontId);
        const init = options?.fetchOptions || {};
        if (!init.headers) {
            init.headers = {};
        }
        init.headers = {
            ...init.headers,
            Authorization: `Bearer ${musicKit.developerToken}`,
            'Music-User-Token': musicKit.musicUserToken,
        };
        const response = await fetch(`https://api.music.apple.com${href}`, init);
        if (!response.ok) {
            const err = new Error(String(response.status));
            (err as any).data = response;
            throw err;
        }
        const data = await response.json();
        return {data};
    }
}
