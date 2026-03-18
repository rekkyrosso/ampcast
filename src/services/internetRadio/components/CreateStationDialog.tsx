import React from 'react';
import MediaService from 'types/MediaService';
import {DialogProps} from 'components/Dialog';
import EditStationDialog from './EditStationDialog';

export interface CreateStationDialogProps extends DialogProps {
    service?: MediaService;
}

export default function CreateStationDialog(props: CreateStationDialogProps) {
    return <EditStationDialog {...props} />;
}
