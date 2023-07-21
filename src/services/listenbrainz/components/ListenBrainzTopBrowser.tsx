import React, {useCallback, useId, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import PageHeader from 'components/MediaBrowser/PageHeader';
import PagedItems from 'components/MediaBrowser/PagedItems';
import listenbrainz from '../listenbrainz';
import useRange from './useRange';

export type ListenBrainzRange =
    | 'week'
    | 'month'
    | 'quarter'
    | 'half_yearly'
    | 'year'
    | 'all_time'
    | 'this_week'
    | 'this_month'
    | 'this_year';

interface ListenBrainzRangeOption {
    value: ListenBrainzRange;
    text: string;
}

const options: ListenBrainzRangeOption[] = [
    {value: 'all_time', text: 'All time'},
    {value: 'year', text: 'Year'},
    {value: 'month', text: 'Month'},
    {value: 'week', text: 'Week'},
];

export interface ListenBrainzTopBrowserProps<T extends MediaObject> {
    source: MediaSource<T>;
}

export default function ListenBrainzTopBrowser<T extends MediaObject>({
    source,
}: ListenBrainzTopBrowserProps<T>) {
    const id = useId();
    const [range, setRange] = useState<ListenBrainzRange | undefined>();
    const pager = useRange(source, range);

    const handleRangeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRange(event.target.value as ListenBrainzRange);
    }, []);

    return (
        <>
            <PageHeader icon={listenbrainz.icon}>
                {listenbrainz.name}: {source.title}
            </PageHeader>
            <div className="listenbrainz-range-selector options">
                <ul className="listenbrainz-ranges">
                    {options.map(({value, text}) => (
                        <li className="listenbrainz-range" key={value}>
                            <input
                                id={`${id}-range-${value}`}
                                type="radio"
                                name="listenbrainz-range"
                                value={value}
                                defaultChecked={value === 'all_time'}
                                onChange={handleRangeChange}
                            />
                            <label htmlFor={`${id}-range-${value}`}>{text}</label>
                        </li>
                    ))}
                </ul>
            </div>
            <PagedItems
                service={listenbrainz}
                source={source}
                pager={pager}
                layout={source.layout}
            />
        </>
    );
}
