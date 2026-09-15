import PlayAction from './PlayAction';

export default interface Preferences {
    albumsOrTracks: 'albums' | 'tracks';
    askExportBitRate: boolean;
    defaultExportBitRate: 128 | 192 | 256 | 320;
    disableExplicitContent: boolean;
    doubleClickBehavior: PlayAction;
    exportConcurrency: number;
    showSimplifiedExportTarget: boolean;
    markExplicitContent: boolean;
    mediaInfoTabs: boolean;
    miniPlayer: boolean;
    spacebarTogglePlay: boolean;
}
