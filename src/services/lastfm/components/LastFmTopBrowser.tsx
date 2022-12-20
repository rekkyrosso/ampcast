import React, {useCallback, useState} from 'react';
import MediaObject from 'types/MediaObject';
import {PagedBrowser, PagedBrowserProps} from 'components/MediaBrowser';
import usePeriod from './usePeriod';

export type LastFMPeriod = 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';

interface LastFMPeriodOption {
    value: LastFMPeriod;
    text: string;
}

const options: LastFMPeriodOption[] = [
    {value: 'overall', text: 'All time'},
    {value: '12month', text: 'Year'},
    {value: '1month', text: 'Month'},
    {value: '7day', text: 'Week'},
];

export default function LastFmTopBrowser<T extends MediaObject>({
    source,
    ...props
}: PagedBrowserProps<T>) {
    const [period, setPeriod] = useState<LastFMPeriod | undefined>();
    const pager = usePeriod(source, period);

    const handlePeriodChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setPeriod(event.target.value as LastFMPeriod);
    }, []);

    return (
        <>
            <div className="lastfm-period-selector options">
                <ul className="lastfm-periods">
                    {options.map(({value, text}) => (
                        <li className="lastfm-period" key={value}>
                            <input
                                id={`lastfm-period-${value}`}
                                type="radio"
                                name="lastfm-period"
                                value={value}
                                defaultChecked={value === 'overall'}
                                onChange={handlePeriodChange}
                            />
                            <label htmlFor={`lastfm-period-${value}`}>{text}</label>
                        </li>
                    ))}
                </ul>
            </div>
            <PagedBrowser {...props} source={source} pager={pager} layout={source.layout} />
        </>
    );
}
