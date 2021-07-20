import React, {useCallback, useState} from 'react';
import {DialogProps} from './Dialog';

export default function useDialog(
    Dialog: React.ComponentType<DialogProps>,
    target?: DialogProps['target']
) {
    const [open, setOpen] = useState(false);
    const openDialog = useCallback(() => setOpen(true), []);
    const closeDialog = useCallback(() => setOpen(false), []);

    return [open ? <Dialog onClose={closeDialog} target={target} /> : null, openDialog] as const;
}
