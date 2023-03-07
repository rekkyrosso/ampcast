import React, {useCallback, useEffect, useRef, useState} from 'react';
import {formatDate, formatMonth} from 'utils';
import MonthPicker from './MonthPicker';

export interface DatePickerProps {
    value?: number | string;
    min?: number | string;
    max?: number | string;
    onSelect?: (value: string) => void;
}

export default function DatePicker({
    min = '1970-01-01',
    max = formatDate(),
    value = max,
    onSelect,
}: DatePickerProps) {
    const ref = useRef<HTMLSelectElement>(null);
    const [month, setMonth] = useState(() => formatMonth(value));
    const [date, setDate] = useState(() => new Date(value).getDate());
    const dates = useDates(month, min, max);

    useEffect(() => {
        const date = dates[0];
        if (date) {
            ref.current!.value = String(date);
            setDate(date);
        }
    }, [dates]);

    useEffect(() => {
        if (date) {
            onSelect?.(`${month}-${String(date).padStart(2, '0')}`);
        }
    }, [onSelect, month, date]);

    const handleMonthSelect = useCallback((month: string) => {
        setDate(0);
        setMonth(month);
    }, []);

    const handleDateChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setDate(Number(event.target.value));
    }, []);

    return (
        <span className="date-picker">
            <MonthPicker min={min} max={max} value={month} onSelect={handleMonthSelect} />
            <select defaultValue={date} onChange={handleDateChange} key={month} ref={ref}>
                {dates.map((date) => (
                    <option value={date} key={date}>
                        {date}
                    </option>
                ))}
            </select>
        </span>
    );
}

function useDates(monthValue: string, min: number | string, max: number | string): number[] {
    const [dates, setDates] = useState<number[]>([]);

    useEffect(() => {
        const dates: number[] = [];
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const parts = monthValue.split('-').map(Number);
        const year = parts[0];
        const month = parts[1] - 1;
        const minDay =
            year === minDate.getFullYear() && month === minDate.getMonth() ? minDate.getDate() : 1;
        let day =
            year === maxDate.getFullYear() && month === maxDate.getMonth()
                ? maxDate.getDate()
                : new Date(year, month + 1, 0).getDate();
        while (day >= minDay) {
            dates.push(day);
            day--;
        }
        setDates(dates);
    }, [monthValue, min, max]);

    return dates;
}
