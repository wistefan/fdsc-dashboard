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

