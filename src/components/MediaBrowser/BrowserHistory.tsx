import React from 'react';
import useHistory from './useHistory';

export default function BrowserHistory() {
    const {stack, currentKey} = useHistory();

    return (
        <div className="browser-history">
            {stack.map((item) => (
                <div
                    className="history-item"
                    data-key={item.key}
                    hidden={item.key !== currentKey}
                    key={item.key}
                >
                    {item.node}
                </div>
            ))}
        </div>
    );
}
