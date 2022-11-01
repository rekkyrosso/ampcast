import Thumbnail from 'types/Thumbnail';

console.log('module::musicbrainzApi');

export class MusicBrainzApi {
    private readonly host = `https://musicbrainz.org/ws/2`;
    private lastCall = 0;

    async getISRC(mbid: string): Promise<string> {
        const recording = await this.get<MusicBrainz.Recording>(`/recording/${mbid}`, {
            inc: 'isrcs',
        });
        // TODO: find best `isrc`.
        return recording.isrcs?.[0] || '';
    }

    async getRecordingByISRC(isrc: string): Promise<MusicBrainz.Recording | null> {
        const response = await this.get<MusicBrainz.isrc.Response>(`/isrc/${isrc}`);
        return response.recordings[0] || null;
    }

    getAlbumCover(mbid: string): Thumbnail {
        return {
            url: `https://coverartarchive.org/release/${mbid}/front-250`,
            width: 250,
            height: 250,
        };
    }

    async get<T>(path: string, params: any = {}): Promise<T> {
        await this.applyRateLimiting();

        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        params.fmt = 'json';
        path = `${path}?${new URLSearchParams(params)}`;
        this.lastCall = Date.now();
        const response = await fetch(`${this.host}/${path}`, {
            method: 'GET',
            headers: {
                'User-Agent': `${__app_name__}/${__app_version__} ( ${__app_contact__} )`,
            },
        });
        if (!response.ok) {
            throw response;
        }
        const data = await response.json();
        return data;
    }

    private applyRateLimiting(): Promise<void> {
        return new Promise((resolve) => {
            const time = Date.now() - this.lastCall;
            if (time > 1000) {
                resolve();
            } else {
                setTimeout(() => resolve, time);
            }
        });
    }
}

const musicbrainzApi = new MusicBrainzApi();

export default musicbrainzApi;
