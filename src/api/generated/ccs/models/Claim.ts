/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Claim of the a credential to be included in the JWT.
 */
export type Claim = {
    /**
     * Key of the claim to be included. All objects under this key will be included unchanged.
     */
    originalKey: string;
    /**
     * Key of the claim to be used in the jwt. If not provided, the original one will be used.
     */
    newKey?: string;
};

