/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ServiceScopesEntry } from './ServiceScopesEntry';
/**
 * Configuration of a service and its credentials
 */
export type Service = {
    /**
     * Id of the service to be configured. If no id is provided, the service will generate one.
     */
    id?: string;
    /**
     * Default OIDC scope to be used if none is specified
     */
    defaultOidcScope: string;
    /**
     * A specific OIDC scope for that service, specifying the necessary VC types (credentials)
     */
    oidcScopes: Record<string, ServiceScopesEntry>;
    /**
     * The authorization redirect to be created.
     */
    authorizationType?: 'FRONTEND_V2' | 'DEEPLINK';
};

