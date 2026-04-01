/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CredentialQuery } from './CredentialQuery';
import type { CredentialSetQuery } from './CredentialSetQuery';
/**
 * JSON encoded query to request the credentials to be included in the presentation
 */
export type DCQL = {
    /**
     * A non-empty array of Credential Queries that specify the requested Credentials.
     */
    credentials: Array<CredentialQuery>;
    /**
     * A non-empty array of Credential Set Queries that specifies additional constraints on which of the requested Credentials to return.
     */
    credential_sets?: Array<CredentialSetQuery>;
};

