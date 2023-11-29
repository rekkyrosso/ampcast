import React, {memo} from 'react';
import './SvgDefs.scss';

export default memo(function SvgDefs() {
    return (
        <svg className="svg-defs" width="0" height="0">
            <defs>
                <linearGradient
                    id="apple-linear-gradient"
                    gradientUnits="userSpaceOnUse"
                    x1="36"
                    y1="2.2858"
                    x2="36"
                    y2="72.455"
                    gradientTransform="matrix(1 0 0 -1 0 74.0068)"
                >
                    <stop offset="0" style={{stopColor: '#fa233b'}} />
                    <stop offset="1" style={{stopColor: '#fb5c74'}} />
                </linearGradient>
                <linearGradient
                    id="jellyfin-linear-gradient"
                    gradientUnits="userSpaceOnUse"
                    x1="110.25"
                    y1="213.3"
                    x2="496.14"
                    y2="436.09"
                >
                    <stop offset="0" style={{stopColor: '#aa5cc3'}} />
                    <stop offset="1" style={{stopColor: '#00a4dc'}} />
                </linearGradient>
            </defs>
        </svg>
    );
});
