import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {RadioItem} from 'types/InternetRadio';
import RadioStation from 'types/RadioStation';
import {MAX_DURATION} from 'services/constants';
import stationData from './stationData.json';

type StationData = Partial<Except<MediaItem, 'radio'>> & {
    radio: Except<RadioStation, 'country'> & {
        country: string;
    };
};

const stations: readonly RadioItem[] = stationData.map((data: StationData) => {
    const id = data.radio.id;
    return {
        ...(data as RadioItem),
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
