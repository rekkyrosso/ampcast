import Auth from './Auth';
import MediaSource from './MediaSource';

export default interface MediaService extends Auth {
    readonly id: string;
    readonly title: string;
    readonly icon: IconName;
    readonly url: string;
    readonly sources: readonly MediaSource[];
    readonly searches: readonly MediaSource[];
    readonly scrobbler?: boolean;
}
