const statusCodes: Record<number, string> = {
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    408: 'Timeout',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Timeout',
};

export default function getReadableErrorMessage(error: any): string {
    return (
        (error
            ? typeof error === 'string'
                ? error
                : error.isMKError
                  ? String(error.detail || error)
                  : String(
                        error.message ||
                            error.statusText ||
                            statusCodes[error.status] ||
                            error.status ||
                            ''
                    )
            : '') || 'unknown'
    );
}
