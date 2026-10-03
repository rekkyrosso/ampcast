import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import CurrentlyPlaying, {CurrentlyPlayingProps} from './CurrentlyPlaying';
import Lyrics from './Lyrics';
import MediaDetails from './MediaDetails';

export default function CurrentlyPlayingTabs({item, visualizer}: CurrentlyPlayingProps) {
    const tabs = useMemo<TabItem[]>(() => {
        return [
            {
                tab: 'Now playing',
                panel: <CurrentlyPlaying item={item} visualizer={visualizer} />,
            },
            {
                tab: 'Lyrics',
                panel: <Lyrics item={item} />,
            },
            {
                tab: 'Details',
                panel: <MediaDetails item={item} />,
            },
        ];
    }, [item, visualizer]);
    return <TabList className="media-info-tabs" items={tabs} label="Media info" />;
}
