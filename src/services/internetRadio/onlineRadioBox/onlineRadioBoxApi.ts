import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Thumbnail from 'types/Thumbnail';
import {Logger, uniq} from 'utils';
import {addMetadataToRadioTrack} from 'services/metadata';

const logger = new Logger('onlineRadioBoxApi');

const apiHost = 'https://onlineradiobox.com/json';
const scraperHost = 'https://scraper2.onlineradiobox.com';

export const onlineRadioBoxIds: Record<string, string> = {};

export async function fetchNowPlaying(
    station: PlaylistItem,
    prevTrack: PlaylistItem | null = null
): Promise<PlaylistItem | null> {
    try {
        const orbId = await getOrbId(station);
        if (!orbId) {
            return null;
        }
        const response = await fetch(`${scraperHost}/${orbId}?l=0&t=${Date.now()}`);
        if (!response.ok) {
            if (response.status === 404) {
                // Invalid `orbId`. Don't try again.
                onlineRadioBoxIds[station.src] = '';
            }
            logger.error(response);
            return null;
        }
        const nowPlaying: OnlineRadioBox.NowPlaying = await response.json();
        const nowPlayingTimeStamp = nowPlaying.updated * 1000;
        if (nowPlayingTimeStamp === 0) {
            // Never updated. Don't try again this session.
            onlineRadioBoxIds[station.src] = '';
        }
        let item = parseNowPlaying(station, nowPlaying);
        if (
            item?.src === prevTrack?.src ||
            item?.src.replace(':show:', ':track:') === prevTrack?.src
        ) {
            return prevTrack;
        }
        if (item) {
            item = await addMetadataToRadioTrack(item);
            if (!item.thumbnails) {
                (item as any).thumbnails = station.thumbnails;
            }
        }
        if (Date.now() - nowPlayingTimeStamp > 600_000) {
            // More that ten minutes old.
            return item?.linearType === LinearType.MusicTrack ? null : item;
        }
        return item;
    } catch (err) {
        logger.error(err);
        return null;
    }
}

async function getOrbId(station: PlaylistItem): Promise<string> {
    if (onlineRadioBoxIds[station.src] === undefined) {
        let orbId = '';
        const orbUrl = station?.onlineradiobox?.url;
        if (orbUrl) {
            const [countryCode, alias] = orbUrl
                .replace(/^https?:\/\/onlineradiobox\.\w+\//, '')
                .split('/');
            orbId = `${countryCode}.${alias}`;
        } else {
            let countryCode = station.countryCode?.toLowerCase();
            if (countryCode) {
                if (countryCode === 'gb') {
                    countryCode = 'uk';
                }
                const searchableTitle = station.title.replace(/^([^(|[]*).*$/, '$1').trim();
                const result = await Promise.all([
                    getStationsByName(searchableTitle, countryCode),
                    search(searchableTitle),
                ]);
                const stations = result.flat();
                const compareTitles = (data: OnlineRadioBox.Station): boolean => {
                    if (
                        data.title.localeCompare(searchableTitle, undefined, {
                            sensitivity: 'base',
                        }) === 0
                    ) {
                        return true;
                    }
                    const trimTitle = (title: string): string => {
                        return title
                            .replace(' ' + data.country, '')
                            .replace(' ' + data.cityName, '')
                            .replace(' ' + data.frequency, '')
                            .trim();
                    };
                    // A more loose comparison but probably right.
                    return (
                        trimTitle(data.title).localeCompare(trimTitle(searchableTitle), undefined, {
                            sensitivity: 'base',
                        }) === 0
                    );
                };
                const orbStation = stations.find(
                    (data) => data.country === countryCode && data.rank && compareTitles(data)
                );
                if (orbStation) {
                    orbId = `${countryCode}.${orbStation.alias}`;
                }
            }
        }
        onlineRadioBoxIds[station.src] = orbId;
    }
    return onlineRadioBoxIds[station.src];
}

function parseNowPlaying(
    station: PlaylistItem,
    nowPlaying: OnlineRadioBox.NowPlaying
): PlaylistItem | null {
    const {iName, iArtist, iImg, title = ''} = nowPlaying;
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
}

function createMediaItem(
    station: PlaylistItem,
    item: Pick<MediaItem, 'title' | 'artists' | 'thumbnails'>
): PlaylistItem {
    const {title, artists: [artist = ''] = []} = item;
    return {
        ...item,
        id: nanoid(),
        src: `internet-radio:show:${station.id}-${artist}-${title}`,
        itemType: ItemType.Media,
        linearType: LinearType.Show,
        mediaType: MediaType.Audio,
        stationName: station.title,
        stationSrc: station.src,
        duration: 0,
        playedAt: 0,
    };
}

function createThumbnails(
    url: string | undefined,
    width = 600,
    height = width
): readonly Thumbnail[] | undefined {
    return url ? [{url, width, height}] : undefined;
}

async function search(title: string): Promise<readonly OnlineRadioBox.Station[]> {
    const response = await fetch(`${apiHost}/search?q=${encodeURIComponent(title)}`);
    if (!response.ok) {
        throw response;
    }
    const {stations}: OnlineRadioBox.SearchResponse = await response.json();
    return stations;
}

async function getStationsByName(
    name: string,
    countryCode: string
): Promise<readonly OnlineRadioBox.Station[]> {
    if (name === 'BBC Radio 6 Music') {
        name = 'BBC Radio 6';
    }
    const response = await fetch(
        `${apiHost}/${countryCode}/${name.replace(/\s+/g, '').toLowerCase()}`
    );
    if (!response.ok) {
        return [];
    }
    const {station}: OnlineRadioBox.StationResponse = await response.json();
    return [station];
}
