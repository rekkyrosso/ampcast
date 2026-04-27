import React, {useMemo} from 'react';
import preferences from 'services/preferences';
import TabList, {TabItem} from 'components/TabList';
import CurrentlyPlaying, {CurrentlyPlayingProps} from './CurrentlyPlaying';
import Lyrics from './Lyrics';
import MediaDetails from './MediaDetails';

export default function CurrentlyPlayingTabs({item, visualizer}: CurrentlyPlayingProps) {
    const tabs: TabItem[] = useMemo(() => {
        const tabs = [
            {
                tab: 'Now playing',
                panel: <CurrentlyPlaying item={item} visualizer={visualizer} />,
            },
            {
                tab: 'Lyrics',
                panel: <Lyrics item={item} />,
            },
        ];
        if (preferences.mediaInfoTabs) {
            tabs.push({
                tab: 'Details',
                panel: <MediaDetails item={item} />,
            });
        }
        return tabs;
    }, [item, visualizer]);
    return <TabList className="media-info-tabs" items={tabs} label="Media info" />;
}
