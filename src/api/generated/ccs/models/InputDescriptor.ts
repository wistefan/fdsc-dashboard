/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Constraints } from './Constraints';
import type { Format } from './Format';
export type InputDescriptor = {
    /**
     * Id of the descriptor
     */
    id: string;
    /**
     * A human readable name for the definition
     */
    name?: string;
    /**
     * A string that describes the purpose for which the claim is requested
     */
    purpose?: string;
    constraints: Constraints;
    format?: Format;
};

