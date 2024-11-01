import React, {useCallback} from 'react';
import {exists, formatTime} from 'utils';
import Logger, {Log, LogLevel} from 'utils/Logger';
import DialogButtons from 'components/Dialog/DialogButtons';
import ErrorReportButton from 'components/ErrorScreen/ErrorReportButton';
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
    const hasErrors = logs.some((log) => log.level === LogLevel.Error);

    const itemClassName = useCallback(({level}: Log) => {
        return level === LogLevel.Error
            ? 'log error'
            : level === LogLevel.Warn
            ? 'log warn'
            : 'log';
    }, []);

    const handleReportClick = useCallback(async () => {
        const errorLogs = logs.filter((log) => log.level === LogLevel.Error).slice(0, 5);
        const simpleLog = (log: Log): Exclude<Log, 'errorReport'> => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {errorReport, ...simpleLog} = log;
            return simpleLog;
        };
        const errors = errorLogs
            .map((error) => {
                const index = logs.indexOf(error);
                if (index !== -1) {
                    const before = logs.slice(index + 1, index + 6).map(simpleLog);
                    const after = logs
                        .slice(Math.max(index - 5, 0), index)
                        .map(simpleLog)
                        .reverse();
                    return {before, error, after};
                }
            })
            .filter(exists);
        await navigator.clipboard.writeText(JSON.stringify({errors}, undefined, 2));
    }, [logs]);

    return (
        <form className="logs" method="dialog">
            <ListView
                title="Logs"
                items={logs}
                itemKey="id"
                itemClassName={itemClassName}
                layout={layout}
            />
            <p>
                <ErrorReportButton
                    disabled={!hasErrors}
                    title={hasErrors ? undefined : ''}
                    onClick={handleReportClick}
                >
                    {hasErrors ? undefined : 'No errors'}
                </ErrorReportButton>
            </p>
            <DialogButtons />
        </form>
    );
}
