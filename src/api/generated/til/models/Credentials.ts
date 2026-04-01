/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Claim } from './Claim';
import type { TimeRange } from './TimeRange';
export type Credentials = {
    validFor?: TimeRange;
    credentialsType?: string;
    claims?: Array<Claim>;
};

