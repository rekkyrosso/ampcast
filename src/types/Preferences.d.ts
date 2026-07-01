import PlayAction from './PlayAction';

export default interface Preferences {
    albumsOrTracks: 'albums' | 'tracks';
    disableExplicitContent: boolean;
    doubleClickBehavior: PlayAction;
    markExplicitContent: boolean;
    mediaInfoTabs: boolean;
    miniPlayer: boolean;
    spacebarTogglePlay: boolean;
}
