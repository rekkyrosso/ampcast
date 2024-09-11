import {Subject, filter, firstValueFrom, mergeMap} from 'rxjs';
import {partition} from './array';
import {anySignal} from './fetch';

interface RequestWithTimeout extends Request {
    timeout?: number;
}

export default class RateLimiter {
    private readonly requests: RequestWithTimeout[] = [];
    private readonly currentRequest$ = new Subject<RequestWithTimeout>();
    private lastFetchTime = 0;
    private timerId: ReturnType<typeof setTimeout> | undefined = undefined;

    constructor(private readonly period = 1000, private readonly maxRequests = Infinity) {}

    get size(): number {
        return this.requests.length;
    }

    async fetch(request: RequestWithTimeout): Promise<Response> {
        const promise = firstValueFrom(
            this.currentRequest$.pipe(
                filter((currentRequest) => currentRequest === request),
                mergeMap((request) => {
                    if (request.signal?.aborted) {
                        throw Error(request.signal.reason);
                    } else {
                        this.lastFetchTime = Date.now();
                        const signals: AbortSignal[] = [];
                        const {signal: initSignal, timeout} = request;
                        if (initSignal) {
                            signals.push(initSignal);
                        }
                        if (timeout) {
                            signals.push(AbortSignal.timeout(timeout));
                        }
                        const signal = anySignal(signals);
                        return fetch(new Request(request.url, {...request, signal}));
                    }
                })
            )
        );
        this.addRequest(request);
        return promise;
    }

    private addRequest(request: RequestWithTimeout): void {
        this.flush();
        if (this.size >= this.maxRequests) {
            throw Error('Too many requests');
        }
        this.requests.push(request);
        this.startTimer();
    }

    private startTimer(): void {
        if (!this.timerId) {
            const timeSinceLastFetch = Date.now() - this.lastFetchTime;
            if (timeSinceLastFetch < this.period) {
                const delay = this.period - timeSinceLastFetch;
                this.timerId = setTimeout(() => {
                    this.timerId = undefined;
                    this.nextRequest();
                }, delay);
            } else {
                this.nextRequest();
            }
        }
    }

    private nextRequest(): void {
        this.flush();
        const request = this.requests.shift();
        if (request) {
            this.currentRequest$.next(request);
            if (this.size > 0) {
                this.startTimer();
            }
        }
    }

    private flush(): void {
        const [aborted, requests] = partition(this.requests, (request) => request.signal?.aborted);
        for (const request of aborted) {
            this.currentRequest$.next(request);
        }
        this.requests.length = 0;
        this.requests.push(...requests);
    }
}
