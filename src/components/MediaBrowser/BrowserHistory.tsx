import React from 'react';
import {exists} from 'utils';
import useHistory from './useHistory';

export default function BrowserHistory() {
    const {stack, currentKey} = useHistory();

    return (
        <div className="browser-history">
            {stack.some(exists) ? (
                stack
                    .filter(exists)
                    .reverse()
                    .map((item) => (
                        <div
                            className="history-item"
                            hidden={item.key !== currentKey}
                            key={item.key}
                        >
                            {item.node}
                        </div>
                    ))
            ) : (
                <div className="panel" />
            )}
        </div>
    );
}
