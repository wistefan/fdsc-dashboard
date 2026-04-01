/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClaimSet } from './ClaimSet';
import type { ClaimsQuery } from './ClaimsQuery';
import type { MetaDataQuery } from './MetaDataQuery';
import type { TrustedAuthorityQuery } from './TrustedAuthorityQuery';
/**
 * A Credential Query is an object representing a request for a presentation of one or more matching Credentials
 */
export type CredentialQuery = {
    /**
     * A string identifying the Credential in the response and, if provided, the constraints in credential_sets. The value MUST be a non-empty string consisting of alphanumeric, underscore (_), or hyphen (-) characters. Within the Authorization Request, the same id MUST NOT be present more than once.
     */
    id?: string;
    /**
     * A string that specifies the format of the requested Credential.
     */
    format?: 'mso_mdoc' | 'vc+sd-jwt' | 'dc+sd-jwt' | 'ldp_vc' | 'jwt_vc_json';
    /**
     * A boolean which indicates whether multiple Credentials can be returned for this Credential Query. If omitted, the default value is false.
     */
    multiple?: boolean;
    /**
     * A non-empty array of objects  that specifies claims in the requested Credential. Verifiers MUST NOT point to the same claim more than once in a single query. Wallets SHOULD ignore such duplicate claim queries.
     */
    claims?: Array<ClaimsQuery>;
    meta?: MetaDataQuery;
    /**
     * A boolean which indicates whether the Verifier requires a Cryptographic Holder Binding proof. The default value is true, i.e., a Verifiable Presentation with Cryptographic Holder Binding is required. If set to false, the Verifier accepts a Credential without Cryptographic Holder Binding proof.
     */
    require_cryptographic_holder_binding?: boolean;
    /**
     * A non-empty array containing arrays of identifiers for elements in claims that specifies which combinations of claims for the Credential are requested.
     */
    claim_sets?: Array<ClaimSet>;
    /**
     * A non-empty array of objects  that specifies expected authorities or trust frameworks that certify Issuers, that the Verifier will accept. Every Credential returned by the Wallet SHOULD match at least one of the conditions present in the corresponding trusted_authorities array if present.
     */
    trusted_authorities?: Array<TrustedAuthorityQuery>;
};

