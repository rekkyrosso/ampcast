export function parsePlaylist(playlist: string): readonly string[] {
    playlist = playlist.trim();
    if (playlist.startsWith('#EXTM3U')) {
        return parseM3U(playlist);
    } else if (playlist.startsWith('[playlist]')) {
        return parsePLS(playlist);
    } else {
        throw Error('Playlist type not supported');
    }
}

export async function parsePlaylistFromUrl(url: string): Promise<readonly string[]> {
    const response = await fetch(url, {signal: AbortSignal.timeout(3000)});
    if (response.ok) {
        const playlist = await response.text();
        return parsePlaylist(playlist);
    } else {
        throw Error(response.statusText || 'Could not load playlist');
    }
}

const splitLine = /\s*[\r\n]+\s*/;

function parseM3U(text: string): readonly string[] {
    return text.split(splitLine).filter((line) => line?.startsWith('http'));
}

function parsePLS(text: string): readonly string[] {
    return text
        .split(splitLine)
        .filter((line) => line?.startsWith('File'))
        .map((line) => line.split(/\s*=\s*/)[1])
        .filter((entry) => entry?.startsWith('http'));
}
