// Half-arsed attempt to patch the types for google.accounts apis.

declare namespace google {
    namespace accounts {
        namespace oauth2 {
            type Prompt = '' | 'none' | 'consent' | 'select_account';

            interface TokenResponse {
                access_token: string;
                error: string;
                expires_in: string; // seconds
                error: any;
                error_description: string;
            }

            interface TokenClientConfig {
                client_id: string;
                callback: (response: TokenResponse) => void;
                scope?: string;
                prompt?: Prompt;
            }

            interface OverridableTokenClientConfig {
                prompt?: Prompt;
            }

            interface TokenClient {
                requestAccessToken(overrideConfig?: OverridableTokenClientConfig): void;
            }

            const initTokenClient: (config: TokenClientConfig) => TokenClient;
            const revoke: (accessToken: string, done?: () => void) => void;
        }

        namespace id {
            interface IdConfiguration {
                client_id: string;
                callback: (response: CredentialResponse) => void;
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
                context?: 'signin' | 'signup' | 'use';
            }

            interface CredentialResponse {
                clientId: string;
                credential: string;
                select_by: string;
            }

            const initialize: (config: IdConfiguration) => void;
            const prompt: () => void;
        }
    }
}
