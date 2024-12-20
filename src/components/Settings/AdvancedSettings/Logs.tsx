import React, {useCallback} from 'react';
import {formatTime} from 'utils';
import Logger, {Log, LogLevel} from 'utils/Logger';
import {copyLogsToClipboard} from 'services/reporting';
import CopyButton from 'components/Button/CopyButton';
import DialogButtons from 'components/Dialog/DialogButtons';
import ListView, {ListViewLayout} from 'components/ListView';
import useLogs from './useLogs';
import './Logs.scss';

const layout: ListViewLayout<Log> = {
    view: 'details',
    sizeable: true,
    showTitles: true,
    cols: [
        {
            title: 'Time',
            render: ({timeStamp}) => formatTime(Math.floor((timeStamp + Logger.startedAt) / 1000)),
            width: 6,
            align: 'right',
        },
        {
            title: 'Message',
            render: ({message, repeats = 0}) =>
                repeats > 1 ? (
                    <>
                        <span className="repeats">{repeats}</span>
                        {message}
                    </>
                ) : (
                    message
                ),
            width: 28,
        },
    ],
};

export default function Logs() {
    const logs = useLogs();

    const itemClassName = useCallback(({level}: Log) => {
        return level === LogLevel.Error
            ? 'log error'
            : level === LogLevel.Warn
            ? 'log warn'
            : 'log';
    }, []);

    return (
        <form className="logs" method="dialog">
            <div className="logs-view">
                <ListView
                    title="Logs"
                    items={logs}
                    itemKey="id"
                    itemClassName={itemClassName}
                    layout={layout}
                />
                <p>
                    <CopyButton onClick={copyLogsToClipboard}>Copy logs</CopyButton>
                </p>
            </div>
            <DialogButtons />
        </form>
    );
}
