import Auth from 'types/Auth';
import MediaSource from 'types/MediaSource';

export default interface MediaService extends Auth {
    readonly id: string;
    readonly title: string;
    readonly icon: IconName;
    readonly url: string;
    readonly sources: readonly MediaSource[];
    readonly searches: readonly MediaSource[];
    readonly scrobbler?: boolean;
}
