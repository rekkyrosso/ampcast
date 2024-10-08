import React, {HTMLAttributes} from 'react';
import {cancelEvent} from 'utils';
import './IconButtons.scss';

export type IconButtonsProps = HTMLAttributes<HTMLDivElement>;

export default function IconButtons({className = '', children, ...props}: IconButtonsProps) {
    return (
        <div {...props} className={`icon-buttons ${className}`} onDoubleClick={cancelEvent}>
            {children}
        </div>
    );
}
