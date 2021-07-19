import './MediaBrowser.scss';
import React, { useCallback } from 'react';

export interface MediaBrowserProps {

}

export default function MediaBrowser({}: MediaBrowserProps) {
    const handleScan = useCallback(() => {
        fetch('/commands/media/scan', {method: 'POST'});
    }, []);

    const handleClear = useCallback(() => {
        fetch('/commands/media/clear', {method: 'POST'});
    }, []);

    return (
        <div className="media-browser">
            <p>
                <button onClick={handleScan}>Scan</button>
                <button onClick={handleClear}>Clear</button>
            </p>
        </div>
    )
}
