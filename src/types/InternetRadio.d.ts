import type {Observable} from 'rxjs';
import {SetRequired} from 'type-fest';
import MediaItem from './MediaItem';
import NowPlaying from './NowPlaying';
import PublicMediaService from './PublicMediaService';

export type RadioItem = SetRequired<MediaItem, 'radio'>;

export default interface InternetRadio extends PublicMediaService {
    readonly id: 'internet-radio';
    observeNowPlaying: () => Observable<NowPlaying>;
    getNowPlaying: (item?: RadioItem) => Promise<NowPlaying>;
    getStation: (id: string) => RadioItem | undefined;
}
