import LinkBehavior from './LinkBehavior';
import PlayAction from './PlayAction';

export default interface Preferences {
    albumsOrTracks: 'albums' | 'tracks';
    disableExplicitContent: boolean;
    doubleClickBehavior: PlayAction;
    linkBehavior: LinkBehavior;
    markExplicitContent: boolean;
    miniPlayer: boolean;
    spacebarTogglePlay: boolean;
}
