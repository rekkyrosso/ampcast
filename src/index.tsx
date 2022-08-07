import 'styles/index.scss';
import React from 'react';
import {createRoot} from 'react-dom/client';
import MediaLibrary from 'components/MediaLibrary';
import MediaPlayback from 'components/MediaPlayback';
import Splitter from 'components/Splitter';
import useBrowser from 'hooks/useBrowser';
import useConnectivity from 'hooks/useConnectivity';
import usePreventDrop from 'hooks/usePreventDrop';
import useMediaSession from 'hooks/useMediaSession';
import useGlobalActions from 'hooks/useGlobalActions';
import useStoragePersistence from 'hooks/useStoragePersistence';
import 'styles/layout.scss';

console.log('module::App');

function App() {
    useBrowser();
    useConnectivity();
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
        </main>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
