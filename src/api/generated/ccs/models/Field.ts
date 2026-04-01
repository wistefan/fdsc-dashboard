/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Field = {
    /**
     * Id of the field
     */
    id?: string;
    /**
     * A human readable name for the definition
     */
    name?: string;
    /**
     * A string that describes the purpose for which the claim is requested
     */
    purpose?: string;
    /**
     * Defines if the described field is considered optional or not
     */
    optional?: boolean;
    /**
     * An array of JsonPaths that selects the value from the input
     */
    path?: Array<string>;
    /**
     * Filter to be evaluated against the values returned from path evaluation
     */
    filter?: Record<string, any>;
};

