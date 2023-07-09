export class MusicBrainzApi {
    private readonly host = `https://musicbrainz.org/ws/2`;
    private lastCall = 0;

    async getISRCs(recording_mbid: string): Promise<readonly string[]> {
        const recording = await this.get<MusicBrainz.Recording>(`/recording/${recording_mbid}`, {
            inc: 'isrcs',
        });
        // TODO: find best `isrc`.
        return recording.isrcs || [];
    }

    async getRecordingsByISRC(isrc: string): Promise<readonly MusicBrainz.Recording[]> {
        const response = await this.get<MusicBrainz.isrc.Response>(`/isrc/${isrc}`);
        return response.recordings || [];
    }

    async get<T>(path: string, params: any = {}): Promise<T> {
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        params.fmt = 'json';
        path = `${path}?${new URLSearchParams(params)}`;
        await this.applyRateLimiting();
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
