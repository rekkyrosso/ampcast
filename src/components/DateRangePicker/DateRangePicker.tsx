import React, {useCallback, useEffect, useMemo, useState} from 'react';
import DateRange from 'types/DateRange';
import {LiteStorage} from 'utils';
import usePeriodOrYear, {PeriodOrYear} from './usePeriodOrYear';
import usePeriodOrMonth, {PeriodOrMonth} from './usePeriodOrMonth';
import './DateRangePicker.scss';

export interface DateRangePickerProps {
    startAt: number;
    storeId?: string;
    onSelect?: (range: DateRange) => void;
}

export default function DateRangePicker({startAt, storeId, onSelect}: DateRangePickerProps) {
    const storage = useMemo(() => (storeId ? new LiteStorage(storeId) : null), [storeId]);
    const defaultYear = useMemo(() => storage?.getString('year'), [storage]);
    const defaultMonth = useMemo(() => storage?.getString('month'), [storage]);
    const [year, setYear] = useState<PeriodOrYear['value']>('all-time');
    const [month, setMonth] = useState<PeriodOrMonth['value']>(0);
    const years = usePeriodOrYear(startAt);
    const months = usePeriodOrMonth(year, startAt);

    useEffect(() => {
        switch (year) {
            case 'all-time':
            case 'this-year':
            case 'this-month':
            case 'this-week':
                onSelect?.({period: year});
                break;
            default:
                if (month === 'year') {
                    onSelect?.({period: 'year', year});
                } else {
                    onSelect?.({period: 'month', year, month});
                }
                break;
        }
    }, [year, month, onSelect]);

    const handleYearChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setYear(Number(event.target.value));
    }, []);

    const handleMonthChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(Number(event.target.value));
    }, []);

    return (
        <form className="month-picker">
            <select
                className="month-picker-year"
                defaultValue={defaultYear}
                onChange={handleYearChange}
            >
                {years.map(({value, text}) => (
                    <option value={value} key={value}>
                        {text}
                    </option>
                ))}
            </select>
            {year && (
                <select
                    className="month-picker-month"
                    defaultValue={defaultMonth}
                    onChange={handleMonthChange}
                >
                    {months.map(({value, text}) => (
                        <option value={value} key={value}>
                            {text}
                        </option>
                    ))}
                </select>
            )}
        </form>
    );
}
