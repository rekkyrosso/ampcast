import {Except, SetOptional} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import RadioStation from 'types/RadioStation';
import Thumbnail from 'types/Thumbnail';
import {Logger, uniq} from 'utils';

const logger = new Logger('internet-radio/nowPlayingParser');

type NowPlayingParser = (responseText: string, station: RadioStation) => MediaItem | null;
type NowPlayingParsers = Record<string, NowPlayingParser>;

const genericParsers: NowPlayingParsers = {
    amazingtunes: (responseText, station) => {
        const {included} = JSON.parse(responseText);
        const {attributes} = included.find((included: any) => included.type === 'tune');
        const {name, image_urls: {large} = {}, duration_secs} = attributes;
        const artist = included.find((included: any) => included.type === 'user')?.attributes.name;
        return name
            ? createMediaItem(station, {
                  title: name,
                  duration: duration_secs || 0,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(large),
              })
            : null;
    },

    cdnstream1: (responseText, station) => {
        const [data] = JSON.parse(responseText);
        const {TALB: album, TPE1: artist, TIT2: title, WXXX_album_art: img, TXXX_category} = data;
        return title && TXXX_category === 'music'
            ? createMediaItem(station, {
                  title,
                  album,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(img),
              })
            : null;
    },

    live365: (responseText, station) => {
        const data = JSON.parse(responseText);
        const track = data['current-track'] || {};
        const {artist, art, title, duration} = track;
        return title
            ? createMediaItem(station, {
                  title,
                  artists: artist ? [artist] : undefined,
                  duration: duration || 0,
                  thumbnails: art?.includes('blankart') ? undefined : createThumbnails(art),
              })
            : null;
    },

    onlineradiobox: (responseText, station) => {
        const {iName, iArtist, iImg, title} = JSON.parse(responseText);
        let artist = iArtist;
        let song = iName;
        if (!song || !title.endsWith(song) || !artist || !title.startsWith(artist)) {
            let splitTitle = title.split(/\s+-\s+/);
            if (splitTitle.length > 2) {
                splitTitle = uniq(splitTitle);
            }
            if (splitTitle.length > 1) {
                [artist, song] = splitTitle;
            } else {
                song = title;
            }
        }
        return song
            ? createMediaItem(station, {
                  title: song,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(iImg),
              })
            : null;
    },

    radiojar: (responseText, station) => {
        const {album, artist, thumb, duration, title} = JSON.parse(responseText);
        return title
            ? createMediaItem(station, {
                  title,
                  album,
                  duration: Number(duration) || 0,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(thumb),
              })
            : null;
    },

    spinitron: (responseText, station) => {
        const text = responseText.replace(/^_spinitron[^(]+/, 'return ');
        const html = new Function(text)(); // TODO: Don't execute a function.
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const $ = <T extends HTMLElement>(selector: string): T | null =>
            doc.querySelector(selector);
        const getText = (selector: string) => $(selector)?.textContent?.trim() || '';
        const artist = getText('.artist');
        const song = getText('.song');
        const album = getText('.release');
        const img = $<HTMLImageElement>('img');
        return song
            ? createMediaItem(station, {
                  title: song,
                  album,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(img?.src, img?.width, img?.height),
              })
            : null;
    },

    nprstations: (responseText, station) => {
        const {
            onNow: {song: {artistName, collectionName, trackName, _duration} = {}},
        } = JSON.parse(responseText);
        return trackName
            ? createMediaItem(station, {
                  title: trackName,
                  album: collectionName || '',
                  duration: Number(_duration / 1000) || 0,
                  artists: artistName ? [artistName] : undefined,
              })
            : null;
    },
};

const stationParsers: NowPlayingParsers = {
    bfffm: (responseText, station) => {
        const {album, artist, image, title} = JSON.parse(responseText);
        return title
            ? createMediaItem(station, {
                  title,
                  album,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(image),
              })
            : null;
    },

    chirpradio: (responseText, station) => {
        const {now_playing} = JSON.parse(responseText) || {};
        const {artist, track, lastfm_urls: {large_image} = {}} = now_playing;
        return track
            ? createMediaItem(station, {
                  title: track,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(large_image),
              })
            : null;
    },

    chma: (responseText, station) => {
        const {body: {now_playing} = {}} = JSON.parse(responseText);
        const {artist, title, artworkUrl} = now_playing;
        return title
            ? createMediaItem(station, {
                  title,
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(artworkUrl),
              })
            : null;
    },

    easternalt: (responseText, station) => {
        const {album, artist, cover, duration, title} = JSON.parse(responseText);
        return title
            ? createMediaItem(station, {
                  title,
                  album: album || '',
                  artists: artist ? [artist] : undefined,
                  duration: duration || 0,
                  thumbnails: createThumbnails(cover),
              })
            : null;
    },

    kexp: (responseText, station) => {
        const {
            results: [
                {
                    album,
                    artist,
                    song,
                    image_uri,
                    artist_ids,
                    recording_id,
                    release_id,
                    track_id,
                    play_type,
                } = {},
            ] = [],
        } = JSON.parse(responseText);
        return play_type === 'trackplay' && song
            ? createMediaItem(station, {
                  title: song,
                  album: album || '',
                  artists: artist ? [artist] : undefined,
                  thumbnails: createThumbnails(image_uri),
                  artist_mbids: artist_ids,
                  recording_mbid: recording_id,
                  release_mbid: release_id,
                  track_mbid: track_id,
              })
            : null;
    },
};

function createMediaItem(
    station: RadioStation,
    item: SetOptional<Except<MediaItem, 'src' | 'itemType' | 'mediaType' | 'playedAt'>, 'duration'>
): MediaItem {
    const {title, artists: [artist = ''] = []} = item;
    return {
        src: `internet-radio:track:${station.id}:${artist}-${title}`,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        stationName: station.name,
        duration: 0,
        playedAt: 0,
        unplayable: true,
        ...item,
    };
}

function createThumbnails(
    url: string | undefined,
    width = 600,
    height = width
): readonly Thumbnail[] | undefined {
    return url ? [{url, width, height}] : undefined;
}

const parse: NowPlayingParser = (responseText: string, station: RadioStation) => {
    if (station.api) {
        const genericParserName = Object.keys(genericParsers).find((name) =>
            station.api.includes(name)
        );
        const parse = genericParserName
            ? genericParsers[genericParserName]
            : stationParsers[station.id];
        if (parse) {
            return parse(responseText, station);
        } else {
            logger.warn(`Parser not found for station: ${station.id}`);
        }
    } else {
        logger.warn(`API not found for station: ${station.id}`);
    }
    return null;
};

export default {parse};

// const canParse = (station: RadioStation) => {
//     if (station.api) {
//         const genericParserName = Object.keys(genericParsers).find((name) =>
//             station.api.includes(name)
//         );
//         const parse = genericParserName
//             ? genericParsers[genericParserName]
//             : stationParsers[station.id];
//         if (!parse) {
//             logger.warn(`Parser not found for station: ${station.id}`);
//         }
//     } else {
//         logger.warn(`API not found for station: ${station.id}`);
//     }
// };
// import stations from './stations/all';
// stations.forEach((s) => canParse(s.radio));
