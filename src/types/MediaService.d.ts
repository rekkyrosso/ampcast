import Auth from './Auth';
import MediaServiceId from './MediaServiceId';
import MediaSource from './MediaSource';

export default interface MediaService extends Auth {
    readonly id: MediaServiceId;
    readonly title: string;
    readonly icon: IconName;
    readonly url: string;
    readonly roots: readonly MediaSource[];
    readonly sources: readonly MediaSource[];
    readonly scrobbler?: boolean;
    readonly defaultHidden?: boolean;
    readonly defaultNoScrobble?: boolean;
}
