/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OdrlPolicyJson } from '../models/OdrlPolicyJson';
import type { Policy } from '../models/Policy';
import type { PolicyList } from '../models/PolicyList';
import type { Uid } from '../models/Uid';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PolicyService {
    /**
     * Creates a new policy from the given odrl-json
     * @returns string The rego policy
     * @throws ApiError
     */
    public static createPolicy({
        requestBody,
    }: {
        requestBody: OdrlPolicyJson,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/policy',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get the policies in the ODRL-Format
     * @returns PolicyList Successfully retrieved the policis.
     * @throws ApiError
     */
    public static getPolicies({
        page,
        pageSize = 25,
    }: {
        page?: number,
        pageSize?: number,
    }): CancelablePromise<PolicyList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/policy',
            query: {
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                404: `No such policy exists`,
            },
        });
    }
    /**
     * Creates or overwrites the given policy.
     * @returns string The rego policy
     * @throws ApiError
     */
    public static createPolicyWithId({
        id,
        requestBody,
    }: {
        id: Uid,
        requestBody: OdrlPolicyJson,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/policy/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `Should be returned in case the policy is not allowed to be modified`,
            },
        });
    }
    /**
     * Return the given policy by its ID.
     * @returns Policy Successfully retrieved the policy.
     * @throws ApiError
     */
    public static getPolicyById({
        id,
    }: {
        id: Uid,
    }): CancelablePromise<Policy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/policy/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `No such policy exists`,
            },
        });
    }
    /**
     * Delete the given policy.
     * @returns void
     * @throws ApiError
     */
    public static deletePolicyById({
        id,
    }: {
        id: Uid,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/policy/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `No such policy exists`,
            },
        });
    }
    /**
     * Return the given policy by its ID.
     * @returns Policy Successfully retrieved the policy.
     * @throws ApiError
     */
    public static getPolicyByUid({
        id,
    }: {
        id: Uid,
    }): CancelablePromise<Policy> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/policy/odrl/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `No such policy exists`,
            },
        });
    }
    /**
     * Delete the given policy.
     * @returns void
     * @throws ApiError
     */
    public static deletePolicyByUid({
        id,
    }: {
        id: Uid,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/policy/odrl/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `No such policy exists`,
            },
        });
    }
}
