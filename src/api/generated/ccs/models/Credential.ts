/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HolderVerification } from './HolderVerification';
import type { JwtInclusion } from './JwtInclusion';
/**
 * A credential-type with its trust configuration
 */
export type Credential = {
    /**
     * Type of the credential
     */
    type: string;
    trustedParticipantsLists?: Array<Record<string, any>>;
    /**
     * A list of (EBSI Trusted Issuers Registry compatible) endpoints to
     * retrieve the trusted issuers from. The attributes need to be formated
     * to comply with the verifiers requirements.
     *
     */
    trustedIssuersLists?: Array<string>;
    holderVerification?: HolderVerification;
    /**
     * Does the given credential require a compliancy credential
     */
    requireCompliance?: boolean;
    jwtInclusion?: JwtInclusion;
};

