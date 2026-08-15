import React, {useCallback, useState} from 'react';
import {sleep} from 'utils';
import {IconButton, IconButtons} from 'components/Button';
import useHistory from './useHistory';

export default function BrowserControls() {
    const {stack, currentKey, back, forward, refresh} = useHistory();
    const currentIndex = stack.findIndex((entry) => entry.key === currentKey);
    const [refreshing, setRefreshing] = useState(false);

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
                disabled={currentIndex <= 0}
            />
            <IconButton
                className="forward"
                icon="forward"
                title="Forward"
                onClick={forward}
                disabled={currentIndex === stack.length - 1}
            />
            <IconButton
                className="refresh"
                icon="refresh"
                title="Refresh"
                onClick={handleRefresh}
                disabled={refreshing || currentIndex === -1}
            />
        </IconButtons>
    );
}
