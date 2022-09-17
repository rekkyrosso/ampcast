console.log('module::musicbrainzApi');

const host = `https://musicbrainz.org/ws/2`;

async function getISRC(mbid: string): Promise<string> {
    const recording = await get<MusicBrainz.Recording>(`/recording/${mbid}`, {inc: 'isrcs'});
    // TODO: find best `isrc`.
    return recording.isrcs?.[0] || '';
}

async function getRecordingByISRC(isrc: string): Promise<MusicBrainz.Recording | null> {
    const response = await get<MusicBrainz.isrc.Response>(`/isrc/${isrc}`);
    return response.recordings[0] || null;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    params.fmt = 'json';
    path = `${path}?${new URLSearchParams(params)}`;
    const response = await fetch(path);
    if (!response.ok) {
        throw response;
    }
    const data = await response.json();
    return data;
}

const musicbrainzApi = {
    host,
    get,
    getISRC,
    getRecordingByISRC,
};

export default musicbrainzApi;
