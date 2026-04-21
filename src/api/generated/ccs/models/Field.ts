/*
 * Copyright 2026 Seamless Middleware Technologies S.L and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

