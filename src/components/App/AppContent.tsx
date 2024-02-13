import React from 'react';
import MediaLibrary from 'components/MediaLibrary';
import MediaPlayback from 'components/MediaPlayback';
import Splitter from 'components/Splitter';
import useBrowser from './useBrowser';
import useConnectivity from './useConnectivity';
import usePseudoClasses from './usePseudoClasses';
import usePreventDrop from './usePreventDrop';
import useMediaSession from './useMediaSession';
import useGlobalActions from './useGlobalActions';
import 'styles/layout.scss';

export default function AppContent() {
    useBrowser();
    useConnectivity();
    usePseudoClasses();
    usePreventDrop();
    useMediaSession();
    useGlobalActions();

    return (
        <Splitter id="main-layout" arrange="columns">
            <MediaLibrary />
            <MediaPlayback />
        </Splitter>
    );
}
