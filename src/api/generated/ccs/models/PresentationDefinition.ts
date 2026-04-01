/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Format } from './Format';
import type { InputDescriptor } from './InputDescriptor';
/**
 * Proofs required by the service - see https://identity.foundation/presentation-exchange/#presentation-definition
 */
export type PresentationDefinition = {
    /**
     * Id of the definition
     */
    id: string;
    /**
     * A human readable name for the definition
     */
    name?: string;
    /**
     * A string that describes the purpose for wich the definition should be used
     */
    purpose?: string;
    /**
     * List of requested inputs for the presentation
     */
    input_descriptors: Array<InputDescriptor>;
    format?: Format;
};

