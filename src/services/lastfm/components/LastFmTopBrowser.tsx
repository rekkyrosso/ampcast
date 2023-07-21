import React, {useCallback, useId, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import PageHeader from 'components/MediaBrowser/PageHeader';
import PagedItems from 'components/MediaBrowser/PagedItems';
import lastfm from '../lastfm';
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

export interface LastFmTopBrowserProps<T extends MediaObject> {
    source: MediaSource<T>;
}

export default function LastFmTopBrowser<T extends MediaObject>({
    source,
    ...props
}: LastFmTopBrowserProps<T>) {
    const id = useId();
    const [period, setPeriod] = useState<LastFMPeriod | undefined>();
    const pager = usePeriod(source, period);

    const handlePeriodChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setPeriod(event.target.value as LastFMPeriod);
    }, []);

    return (
        <>
            <PageHeader icon={lastfm.icon}>
                {lastfm.name}: {source.title}
            </PageHeader>
            <div className="lastfm-period-selector options">
                <ul className="lastfm-periods">
                    {options.map(({value, text}) => (
                        <li className="lastfm-period" key={value}>
                            <input
                                id={`${id}-period-${value}`}
                                type="radio"
                                name="lastfm-period"
                                value={value}
                                defaultChecked={value === 'overall'}
                                onChange={handlePeriodChange}
                            />
                            <label htmlFor={`${id}-period-${value}`}>{text}</label>
                        </li>
                    ))}
                </ul>
            </div>
            <PagedItems
                {...props}
                service={lastfm}
                source={source}
                pager={pager}
                layout={source.layout}
            />
        </>
    );
}
