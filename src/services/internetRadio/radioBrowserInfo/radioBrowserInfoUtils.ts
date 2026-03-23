import {MAX_DURATION} from 'services/constants';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import countries from 'services/countries';
import stationStore from '../stationStore';

export function createRadioStation(station: RadioBrowserInfo.Station): MediaItem {
    const stationuuid = station.stationuuid;
    let src = station.url_resolved;
    if (location.protocol === 'https:') {
        src = src.replace(/^http:/, 'https:');
    }
    return {
        src,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        externalUrl: station.homepage,
        title: station.name,
        duration: MAX_DURATION,
        playedAt: 0,
        genres: station.tags ? station.tags.split(',') : undefined,
        badge: station.hls ? 'HLS' : /^unknown/i.test(station.codec) ? undefined : station.codec,
        bitRate: station.bitrate || undefined,
        thumbnails:
            station.favicon && station.favicon !== 'null'
                ? [
                      {
                          url: station.favicon,
                          width: 400,
                          height: 400,
                      },
                  ]
                : undefined,
        country: countries.get(station.countrycode) || station.country,
        countryCode: station.countrycode,
        isFavoriteStation: stationStore.isFavorite({src}),
        'radio-browser.info': {stationuuid},
        globalPlayCount: station.clickcount,
    };
}
