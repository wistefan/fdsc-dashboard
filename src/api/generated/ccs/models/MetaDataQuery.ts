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
/**
 * Defines additional properties requested by the Verifier that apply to the metadata and validity data of the Credential. The properties of this object are defined per Credential Format. If empty, no specific constraints are placed on the metadata or validity of the requested Credential.
 */
export type MetaDataQuery = {
    /**
     * SD-JWT and JWT specific parameter. A non-empty array of strings that specifies allowed values for the type of the requested Verifiable Credential.The Wallet MAY return Credentials that inherit from any of the specified types, following the inheritance logic defined in https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-10
     */
    vct_values?: Array<string>;
    /**
     * Required for MDoc. String that specifies an allowed value for the doctype of the requested Verifiable Credential. It MUST be a valid doctype identifier as defined in https://www.iso.org/standard/69084.html
     */
    doctype_value?: string;
    /**
     * Required for ldp_vc. A non-empty array of string arrays. The Type value of the credential needs to be a subset of at least one of the string-arrays.
     */
    type_values?: Array<Array<string>>;
};

