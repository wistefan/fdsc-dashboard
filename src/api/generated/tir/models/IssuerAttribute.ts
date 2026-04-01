/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IssuerAttribute = {
    /**
     * sha256 hash of the payload
     */
    hash: string;
    /**
     * Base64 encoded content
     */
    body: string;
    /**
     * Type of the trusted issuer
     */
    issuerType: 'RootTAO' | 'TAO' | 'TI' | 'Revoked' | 'Undefined';
    /**
     * Trusted Accredited Organization that accredited the insertion of the attribute
     */
    tao?: string;
    /**
     * Root chain of accreditations
     */
    rootTao?: string;
};

