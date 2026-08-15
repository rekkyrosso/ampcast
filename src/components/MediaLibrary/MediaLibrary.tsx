import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {browser} from 'utils';
import AppTitle from 'components/App/AppTitle';
import AppDragRegion from 'components/App/AppDragRegion';
import BrowserControls from 'components/MediaBrowser/BrowserControls';
import BrowserHistory from 'components/MediaBrowser/BrowserHistory';
import MediaSources from 'components/MediaSources';
import Splitter from 'components/Splitter';
import useHistory from 'components/MediaBrowser/useHistory';
import {ResizeRect} from 'hooks/useOnResize';
import SettingsButton from './SettingsButton';
import './MediaLibrary.scss';

export default memo(function MediaLibrary() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [path, setPath] = useState<string>('');
    const {navigateTo} = useHistory();

    useEffect(() => {
        if (path) {
            navigateTo(path);
        }
    }, [navigateTo, path]);

    const handleResize = useCallback(({width}: ResizeRect) => {
        ref.current?.style.setProperty('--sources-width', `${width}px`);
    }, []);

    return (
        <div className="media-library" ref={ref}>
            <header className="media-library-head">
                <AppTitle />
                <AppDragRegion />
                {browser.isElectron ? <BrowserControls /> : null}
                <SettingsButton />
            </header>
            <div className="media-library-body">
                <Splitter id="media-library-layout" arrange="columns">
                    <MediaSources onResize={handleResize} onSelect={setPath} />
                    <BrowserHistory />
                </Splitter>
            </div>
        </div>
    );
});
