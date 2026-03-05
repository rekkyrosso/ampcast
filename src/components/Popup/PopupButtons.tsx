import React from 'react';
import {DialogButtons, DialogButtonsProps} from 'components/Dialog';

export default function PopupButtons({className = '', ...props}: DialogButtonsProps) {
    return <DialogButtons {...props} className={`popup-buttons ${className}`} />;
}
