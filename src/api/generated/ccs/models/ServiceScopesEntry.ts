/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Credential } from './Credential';
import type { DCQL } from './DCQL';
import type { PresentationDefinition } from './PresentationDefinition';
export type ServiceScopesEntry = {
    /**
     * Trust configuration for the credentials
     */
    credentials: Array<Credential>;
    presentationDefinition?: PresentationDefinition | null;
    dcql?: DCQL | null;
    /**
     * When set, the claim are flatten to plain JWT-claims before beeing included, instead of keeping the credential/presentation structure, where the claims are under the key vc or vp
     */
    flatClaims?: boolean;
};

