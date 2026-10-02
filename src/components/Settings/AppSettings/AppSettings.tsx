import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import preferences from 'services/preferences';
import TabList, {TabItem} from 'components/TabList';
import AppSettingsGeneral from './AppSettingsGeneral';
import AudioSettings from './AudioSettings';
import BrowsingPreferences from './BrowsingPreferences';
import PlaybackPreferences from './PlaybackPreferences';
import './AppSettings.scss';

export default function AppSettings() {
    const submitted = useRef(false);
    const originalPreferences = useMemo(() => ({...preferences}), []);

    const handleSubmit = useCallback(() => {
        submitted.current = true;
    }, []);

    useEffect(() => {
        return () => {
            if (!submitted.current) {
                Object.assign(preferences, originalPreferences);
            }
        };
    }, [originalPreferences]);

    const tabs = useMemo<TabItem[]>(() => {
        return [
            {
                tab: 'General',
                panel: <AppSettingsGeneral />,
            },
            {
                tab: 'Audio',
                panel: <AudioSettings />,
            },
            {
                tab: 'Playback',
                panel: <PlaybackPreferences onSubmit={handleSubmit} />,
            },
            {
                tab: 'Browsing',
                panel: <BrowsingPreferences onSubmit={handleSubmit} />,
            },
        ];
    }, [handleSubmit]);

    return <TabList className="app-settings" items={tabs} label="App Settings" />;
}
