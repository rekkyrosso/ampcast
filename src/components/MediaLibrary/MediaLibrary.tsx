import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {skip} from 'rxjs';
import {browser} from 'utils';
import {WEB_LINKS} from 'services/features';
import {getServiceFromPath, isPersonalMediaService} from 'services/mediaServices';
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
    const {currentPath, navigateTo, switchLibrary} = useHistory();
    const service = getServiceFromPath(currentPath);

    useEffect(() => {
        if (path) {
            navigateTo(path);
        }
    }, [navigateTo, path]);

    useEffect(() => {
        if (service && isPersonalMediaService(service)) {
            const subscription = service
                .observeLibraryId?.()
                .pipe(skip(1))
                .subscribe(switchLibrary);
            return () => subscription?.unsubscribe();
        }
    }, [service, switchLibrary]);

    const handleResize = useCallback(({width}: ResizeRect) => {
        ref.current?.style.setProperty('--sources-width', `${width}px`);
    }, []);

    return (
        <div className="media-library" ref={ref}>
            <header className="media-library-head">
                <AppTitle />
                <AppDragRegion />
                {WEB_LINKS && browser.isElectron ? <BrowserControls /> : null}
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
