import React, {useCallback, useState} from 'react';
import {exists, sleep} from 'utils';
import {IconButton, IconButtons} from 'components/Button';
import useVisibleServices from 'hooks/useVisibleServices';
import useHistory from './useHistory';

export default function BrowserControls() {
    const visibleServices = useVisibleServices();
    const hasServices = visibleServices.length > 0;
    const {stack, currentIndex, back, forward, refresh} = useHistory();
    const [refreshing, setRefreshing] = useState(false);
    const disabled = !hasServices || !stack.some(exists);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        refresh();
        await sleep(500);
        setRefreshing(false);
    }, [refresh]);

    return (
        <IconButtons className="browser-controls">
            <IconButton
                className="back"
                icon="back"
                onClick={back}
                title="Back"
                disabled={disabled || currentIndex <= 0}
            />
            <IconButton
                className="forward"
                icon="forward"
                title="Forward"
                onClick={forward}
                disabled={disabled || currentIndex === stack.length - 1}
            />
            <IconButton
                className="refresh"
                icon="refresh"
                title="Refresh"
                onClick={handleRefresh}
                disabled={disabled || refreshing || currentIndex === -1}
            />
        </IconButtons>
    );
}
