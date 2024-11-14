import React from 'react';
import {isMiniPlayer} from 'utils';
import MiniPlayer from 'components/MiniPlayer';
import MediaLibrary from 'components/MediaLibrary';
import MediaPlayback from 'components/MediaPlayback';
import Splitter from 'components/Splitter';
import useAppSettings from './useAppSettings';
import useBrowser from './useBrowser';
import useConnectivity from './useConnectivity';
import usePseudoClasses from './usePseudoClasses';
import usePreload from './usePreload';
import usePreventDrop from './usePreventDrop';
import useMediaSession from './useMediaSession';
import useGlobalActions from './useGlobalActions';

export default function AppContent() {
    useAppSettings();
    useBrowser();
    useConnectivity();
    usePseudoClasses();
    usePreload();
    usePreventDrop();
    useMediaSession();
    useGlobalActions();

    return isMiniPlayer ? (
        <MiniPlayer />
    ) : (
        <Splitter id="app-layout" arrange="columns">
            <MediaLibrary />
            <MediaPlayback />
        </Splitter>
    );
}
