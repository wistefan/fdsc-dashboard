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
 * A Credential Set Query is an object representing a request for one or more Credentials to satisfy a particular use case with the Verifier.
 */
export type CredentialSetQuery = {
    /**
     * A non-empty array, where each value in the array is a list of Credential Query identifiers representing one set of Credentials that satisfies the use case. The value of each element in the options array is a non-empty array of identifiers which reference elements in credentials.
     */
    options?: Array<Array<string>>;
    /**
     * A boolean which indicates whether this set of Credentials is required to satisfy the particular use case at the Verifier.
     */
    required?: boolean;
    /**
     * A string, number or object specifying the purpose of the query. This specification does not define a specific structure or specific values for this property. The purpose is intended to be used by the Verifier to communicate the reason for the query to the Wallet. The Wallet MAY use this information to show the user the reason for the request.
     */
    purpose?: Record<string, any>;
};

