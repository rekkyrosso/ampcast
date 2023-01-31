import 'styles/index.scss';
import React from 'react';
import {createRoot} from 'react-dom/client';
import DesktopWarning from 'components/DesktopWarning';
import MediaLibrary from 'components/MediaLibrary';
import MediaPlayback from 'components/MediaPlayback';
import Splitter from 'components/Splitter';
import useBrowser from 'hooks/useBrowser';
import useConnectivity from 'hooks/useConnectivity';
import useFocusClass from 'hooks/useFocusClass';
import usePreventDrop from 'hooks/usePreventDrop';
import useMediaSession from 'hooks/useMediaSession';
import useGlobalActions from 'hooks/useGlobalActions';
import useStoragePersistence from 'hooks/useStoragePersistence';
import 'styles/layout.scss';

console.log('module::App');

function App() {
    useBrowser();
    useConnectivity();
    useFocusClass();
    usePreventDrop();
    useMediaSession();
    useGlobalActions();
    useStoragePersistence();

    return (
        <main>
            <Splitter id="main-layout" arrange="columns">
                <MediaLibrary />
                <MediaPlayback />
            </Splitter>
            <DesktopWarning />
        </main>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
