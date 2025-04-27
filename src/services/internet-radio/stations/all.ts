import ItemType from 'types/ItemType';
import MediaType from 'types/MediaType';
import {RadioItem} from 'types/InternetRadio';
import {MAX_DURATION} from 'services/constants';
import stationData from './stationData.json';

const stations: readonly RadioItem[] = stationData.map((data) => {
    const id = data.radio.id;
    return {
        ...data,
        src: `internet-radio:station:${id}`,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        duration: MAX_DURATION,
        playedAt: 0,
        noScrobble: true,
        thumbnails: [
            {
                url: `https://raw.githubusercontent.com/jbwharris/scrobblerad.io/refs/heads/main/img/stations/${id}.png`,
                width: 500,
                height: 500,
            },
        ],
    };
});

export default stations;
