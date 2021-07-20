import React, {HTMLAttributes} from 'react';
import './IconButtons.scss';

export type IconButtonsProps = HTMLAttributes<HTMLDivElement>;

export default function IconButtons({className = '', children}: IconButtonsProps) {
    return <div className={`icon-buttons ${className}`}>{children}</div>;
}
