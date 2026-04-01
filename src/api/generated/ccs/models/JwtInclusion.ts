/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Claim } from './Claim';
/**
 * Configuration for the credential to decide its inclusion into the JWT.
 */
export type JwtInclusion = {
    /**
     * Should the given credential be included into the generated JWT
     */
    enabled?: boolean;
    /**
     * Should the complete credential be embedded
     */
    fullInclusion?: boolean;
    /**
     * Claims to be included
     */
    claimsToInclude?: Array<Claim>;
};

