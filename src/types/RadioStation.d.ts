import {OverrideProperties} from 'type-fest';
import LinearType from './LinearType';
import MediaItem from './MediaItem';

type RadioStation<T extends MediaItem = MediaItem> = OverrideProperties<
    T,
    {
        readonly linearType: LinearType.Station;
    }
>;

export default RadioStation;
