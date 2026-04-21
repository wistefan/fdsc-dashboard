<template>
  <div>
    <!-- Back button -->
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      to="/ccs"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <h1 class="text-h4 mb-4">
      {{ isEditMode ? t('ccs.editTitle') : t('ccs.createTitle') }}
    </h1>

    <!-- Error alert -->
    <v-alert
      v-if="store.saveError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="store.saveError = null"
    >
      {{ store.saveError }}
    </v-alert>

    <!-- Success snackbar -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      :timeout="SNACKBAR_TIMEOUT"
    >
      {{ successMessage }}
    </v-snackbar>

    <!-- Loading state for edit mode -->
    <template v-if="isEditMode && store.detailLoading">
      <v-skeleton-loader
        type="card"
        class="mb-4"
      />
      <v-skeleton-loader type="card" />
    </template>

    <!-- Form -->
    <v-form
      v-else
      ref="formRef"
      @submit.prevent="handleSubmit"
    >
      <!-- Service ID field -->
      <v-card class="mb-4">
        <v-card-title>{{ t('ccs.serviceId') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.id"
            :label="t('ccs.serviceId')"
            :readonly="isEditMode"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            placeholder="my-service"
          />
        </v-card-text>
      </v-card>

      <!-- Default OIDC Scope -->
      <v-card class="mb-4">
        <v-card-title>{{ t('ccs.defaultOidcScope') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.defaultOidcScope"
            :label="t('ccs.defaultOidcScope')"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            placeholder="default"
          />
        </v-card-text>
      </v-card>

      <!-- Authorization Type -->
      <v-card class="mb-4">
        <v-card-title>{{ t('ccs.authorizationType') }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.authorizationType"
            :label="t('ccs.authorizationType')"
            :items="authorizationTypeOptions"
            variant="outlined"
            density="comfortable"
            clearable
          />
        </v-card-text>
      </v-card>

      <!-- OIDC Scopes section -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-shield-key
          </v-icon>
          {{ t('ccs.oidcScopes') }}
          <v-chip
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ form.scopes.length }}
          </v-chip>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-plus"
            @click="addScope"
          >
            {{ t('ccs.addScope') }}
          </v-btn>
        </v-card-title>

        <v-card-text v-if="form.scopes.length === 0">
          <p class="text-medium-emphasis">
            {{ t('ccs.noScopes') }}
          </p>
        </v-card-text>

        <v-expansion-panels
          v-else
          variant="accordion"
          class="mx-4 mb-4"
        >
          <v-expansion-panel
            v-for="(scope, scopeIndex) in form.scopes"
            :key="scopeIndex"
          >
            <v-expansion-panel-title>
              <v-icon
                start
                size="small"
              >
                mdi-key-variant
              </v-icon>
              <span class="font-weight-medium">
                {{ scope.name || t('ccs.scopeName') + ' ' + (scopeIndex + 1) }}
              </span>
              <v-spacer />
              <v-chip
                size="x-small"
                variant="outlined"
                class="mr-2"
              >
                {{ scope.credentials.length }} {{ t('ccs.credentialConfiguration').toLowerCase() }}
              </v-chip>
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                class="mr-2"
                @click.stop="removeScope(scopeIndex)"
              />
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- Scope name -->
              <v-text-field
                v-model="scope.name"
                :label="t('ccs.scopeName')"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />

              <!-- Flat claims toggle -->
              <v-switch
                v-model="scope.flatClaims"
                :label="t('ccs.flatClaims')"
                color="primary"
                density="comfortable"
                class="mb-3"
              />

              <!-- DCQL section -->
              <v-divider class="mb-3" />
              <div class="d-flex align-center mb-3">
                <v-icon
                  start
                  size="small"
                >
                  mdi-file-document-check
                </v-icon>
                <span class="text-subtitle-1 font-weight-medium">
                  {{ t('ccs.dcql') }}
                </span>
                <v-spacer />
                <v-switch
                  v-model="scope.dcqlEnabled"
                  :label="t('ccs.enableDcql')"
                  color="primary"
                  density="compact"
                  hide-details
                  class="ml-2"
                />
              </div>
              <p class="text-caption text-medium-emphasis mb-3">
                {{ t('ccs.dcqlDescription') }}
              </p>

              <template v-if="scope.dcqlEnabled">
                <!-- Credential Queries -->
                <v-card
                  variant="outlined"
                  class="mb-3 pa-3"
                >
                  <div class="d-flex align-center mb-2">
                    <span class="text-subtitle-2">
                      {{ t('ccs.credentialQueries') }}
                    </span>
                    <v-chip
                      class="ml-2"
                      size="x-small"
                      color="info"
                      variant="tonal"
                    >
                      {{ scope.dcqlCredentials.length }}
                    </v-chip>
                    <v-spacer />
                    <v-btn
                      variant="tonal"
                      size="x-small"
                      prepend-icon="mdi-plus"
                      @click="addDcqlCredentialQuery(scopeIndex)"
                    >
                      {{ t('ccs.addCredentialQuery') }}
                    </v-btn>
                  </div>

                  <v-card
                    v-for="(cq, cqIndex) in scope.dcqlCredentials"
                    :key="cqIndex"
                    variant="outlined"
                    class="mb-3 pa-3"
                  >
                    <div class="d-flex align-center mb-2">
                      <span class="text-caption text-medium-emphasis">
                        {{ t('ccs.credentialQueries') }} {{ cqIndex + 1 }}
                      </span>
                      <v-spacer />
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeDcqlCredentialQuery(scopeIndex, cqIndex)"
                      />
                    </div>

                    <v-text-field
                      v-model="cq.id"
                      :label="t('ccs.credentialQueryId')"
                      variant="outlined"
                      density="compact"
                      class="mb-2"
                    />

                    <v-select
                      v-model="cq.format"
                      :label="t('ccs.credentialQueryFormat')"
                      :items="credentialFormatOptions"
                      variant="outlined"
                      density="compact"
                      clearable
                      class="mb-2"
                    />

                    <div class="d-flex ga-3 mb-2">
                      <v-switch
                        v-model="cq.multiple"
                        :label="t('ccs.credentialQueryMultiple')"
                        color="primary"
                        density="compact"
                        hide-details
                      />
                      <v-switch
                        v-model="cq.requireCryptographicHolderBinding"
                        :label="t('ccs.requireCryptographicHolderBinding')"
                        color="primary"
                        density="compact"
                        hide-details
                      />
                    </div>

                    <!-- Metadata -->
                    <v-expansion-panels
                      variant="accordion"
                      class="mb-2"
                    >
                      <v-expansion-panel>
                        <v-expansion-panel-title class="text-caption">
                          {{ t('ccs.metadata') }}
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-text-field
                            v-model="cq.metaVctValues"
                            :label="t('ccs.vctValues')"
                            variant="outlined"
                            density="compact"
                            class="mb-2"
                          />
                          <v-text-field
                            v-model="cq.metaDoctypeValue"
                            :label="t('ccs.doctypeValue')"
                            variant="outlined"
                            density="compact"
                            class="mb-2"
                          />
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>

                    <!-- Claims Queries -->
                    <v-expansion-panels
                      variant="accordion"
                      class="mb-2"
                    >
                      <v-expansion-panel>
                        <v-expansion-panel-title class="text-caption">
                          {{ t('ccs.claimsQueries') }} ({{ cq.claims.length }})
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-btn
                            variant="tonal"
                            size="x-small"
                            prepend-icon="mdi-plus"
                            class="mb-2"
                            @click="addDcqlClaim(scopeIndex, cqIndex)"
                          >
                            {{ t('ccs.addClaimQuery') }}
                          </v-btn>

                          <v-card
                            v-for="(claim, claimIndex) in cq.claims"
                            :key="claimIndex"
                            variant="outlined"
                            class="mb-2 pa-2"
                          >
                            <div class="d-flex align-center mb-1">
                              <span class="text-caption text-medium-emphasis">
                                {{ t('ccs.claimsQueries') }} {{ claimIndex + 1 }}
                              </span>
                              <v-spacer />
                              <v-btn
                                icon="mdi-delete"
                                size="x-small"
                                variant="text"
                                color="error"
                                @click="removeDcqlClaim(scopeIndex, cqIndex, claimIndex)"
                              />
                            </div>
                            <v-text-field
                              v-model="claim.id"
                              :label="t('ccs.claimId')"
                              variant="outlined"
                              density="compact"
                              class="mb-1"
                            />
                            <v-text-field
                              v-model="claim.pathRaw"
                              :label="t('ccs.claimPath')"
                              :hint="t('ccs.claimPathHint')"
                              variant="outlined"
                              density="compact"
                              persistent-hint
                              class="mb-1"
                            />
                            <v-text-field
                              v-model="claim.valuesRaw"
                              :label="t('ccs.claimValues')"
                              :hint="t('ccs.claimValuesHint')"
                              variant="outlined"
                              density="compact"
                              persistent-hint
                              class="mb-1"
                            />
                            <v-text-field
                              v-model="claim.namespace"
                              :label="t('ccs.claimNamespace')"
                              variant="outlined"
                              density="compact"
                              class="mb-1"
                            />
                            <v-text-field
                              v-model="claim.claimName"
                              :label="t('ccs.claimClaimName')"
                              variant="outlined"
                              density="compact"
                              class="mb-1"
                            />
                            <v-switch
                              v-model="claim.intentToRetain"
                              :label="t('ccs.intentToRetain')"
                              color="primary"
                              density="compact"
                              hide-details
                            />
                          </v-card>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>

                    <!-- Trusted Authorities -->
                    <v-expansion-panels
                      variant="accordion"
                      class="mb-2"
                    >
                      <v-expansion-panel>
                        <v-expansion-panel-title class="text-caption">
                          {{ t('ccs.trustedAuthorities') }} ({{ cq.trustedAuthorities.length }})
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <v-btn
                            variant="tonal"
                            size="x-small"
                            prepend-icon="mdi-plus"
                            class="mb-2"
                            @click="addDcqlTrustedAuthority(scopeIndex, cqIndex)"
                          >
                            {{ t('ccs.addTrustedAuthority') }}
                          </v-btn>

                          <v-card
                            v-for="(ta, taIndex) in cq.trustedAuthorities"
                            :key="taIndex"
                            variant="outlined"
                            class="mb-2 pa-2"
                          >
                            <div class="d-flex align-center mb-1">
                              <span class="text-caption text-medium-emphasis">
                                {{ t('ccs.trustedAuthorities') }} {{ taIndex + 1 }}
                              </span>
                              <v-spacer />
                              <v-btn
                                icon="mdi-delete"
                                size="x-small"
                                variant="text"
                                color="error"
                                @click="removeDcqlTrustedAuthority(scopeIndex, cqIndex, taIndex)"
                              />
                            </div>
                            <v-text-field
                              v-model="ta.type"
                              :label="t('ccs.authorityType')"
                              :rules="[rules.required]"
                              variant="outlined"
                              density="compact"
                              class="mb-1"
                            />
                            <v-text-field
                              v-model="ta.valuesRaw"
                              :label="t('ccs.authorityValues')"
                              :hint="t('ccs.commaSeparatedHint')"
                              variant="outlined"
                              density="compact"
                              persistent-hint
                            />
                          </v-card>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card>
                </v-card>

                <!-- Credential Set Queries -->
                <v-card
                  variant="outlined"
                  class="mb-3 pa-3"
                >
                  <div class="d-flex align-center mb-2">
                    <span class="text-subtitle-2">
                      {{ t('ccs.credentialSetQueries') }}
                    </span>
                    <v-chip
                      class="ml-2"
                      size="x-small"
                      color="info"
                      variant="tonal"
                    >
                      {{ scope.dcqlCredentialSets.length }}
                    </v-chip>
                    <v-spacer />
                    <v-btn
                      variant="tonal"
                      size="x-small"
                      prepend-icon="mdi-plus"
                      @click="addDcqlCredentialSetQuery(scopeIndex)"
                    >
                      {{ t('ccs.addCredentialSetQuery') }}
                    </v-btn>
                  </div>

                  <v-card
                    v-for="(csq, csqIndex) in scope.dcqlCredentialSets"
                    :key="csqIndex"
                    variant="outlined"
                    class="mb-2 pa-3"
                  >
                    <div class="d-flex align-center mb-2">
                      <span class="text-caption text-medium-emphasis">
                        {{ t('ccs.credentialSetQueries') }} {{ csqIndex + 1 }}
                      </span>
                      <v-spacer />
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeDcqlCredentialSetQuery(scopeIndex, csqIndex)"
                      />
                    </div>
                    <v-text-field
                      v-model="csq.optionsRaw"
                      :label="t('ccs.credentialSetOptions')"
                      :hint="t('ccs.credentialSetOptionsHint')"
                      variant="outlined"
                      density="compact"
                      persistent-hint
                      class="mb-2"
                    />
                    <v-switch
                      v-model="csq.required"
                      :label="t('ccs.credentialSetRequired')"
                      color="primary"
                      density="compact"
                      hide-details
                      class="mb-2"
                    />
                    <v-text-field
                      v-model="csq.purposeRaw"
                      :label="t('ccs.credentialSetPurpose')"
                      :hint="t('ccs.credentialSetPurposeHint')"
                      variant="outlined"
                      density="compact"
                      persistent-hint
                    />
                  </v-card>
                </v-card>
              </template>

              <!-- Credentials for this scope -->
              <div class="d-flex align-center mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('ccs.credentialConfiguration') }}
                </span>
                <v-chip
                  class="ml-2"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ scope.credentials.length }}
                </v-chip>
                <v-spacer />
                <v-btn
                  variant="tonal"
                  size="x-small"
                  prepend-icon="mdi-plus"
                  @click="addCredential(scopeIndex)"
                >
                  {{ t('ccs.addCredential') }}
                </v-btn>
              </div>

              <v-card
                v-for="(cred, credIndex) in scope.credentials"
                :key="credIndex"
                variant="outlined"
                class="mb-3 pa-3"
              >
                <div class="d-flex align-center mb-2">
                  <span class="text-caption text-medium-emphasis">
                    {{ t('ccs.credentialConfiguration') }} {{ credIndex + 1 }}
                  </span>
                  <v-spacer />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeCredential(scopeIndex, credIndex)"
                  />
                </div>

                <!-- Credential type -->
                <v-text-field
                  v-model="cred.type"
                  :label="t('common.type')"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                />

                <!-- Trusted Issuers Lists -->
                <v-text-field
                  v-model="cred.trustedIssuersListsRaw"
                  :label="t('ccs.trustedIssuersLists')"
                  :hint="t('ccs.commaSeparatedHint')"
                  variant="outlined"
                  density="compact"
                  persistent-hint
                  class="mb-2"
                />

                <!-- Trusted Participants Lists -->
                <v-text-field
                  v-model="cred.trustedParticipantsListsRaw"
                  :label="t('ccs.trustedParticipantsLists')"
                  :hint="t('ccs.commaSeparatedHint')"
                  variant="outlined"
                  density="compact"
                  persistent-hint
                />
              </v-card>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card>

      <!-- Actions -->
      <div class="d-flex ga-3">
        <v-btn
          type="submit"
          color="primary"
          :loading="store.saving"
          :disabled="store.saving"
          prepend-icon="mdi-content-save"
        >
          {{ t('common.save') }}
        </v-btn>
        <v-btn
          variant="outlined"
          to="/ccs"
          :disabled="store.saving"
        >
          {{ t('common.cancel') }}
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useCcsStore } from '@/stores/ccs'
import { useAuth } from '@/composables/useAuth'
import type { Service, ServiceScopesEntry, Credential, DCQL, CredentialQuery, CredentialSetQuery, ClaimsQuery, TrustedAuthorityQuery } from '@/api/generated/ccs'

/** Timeout in milliseconds for the success snackbar. */
const SNACKBAR_TIMEOUT = 3000

/** Available authorization type options. */
const AUTHORIZATION_TYPE_OPTIONS: Array<{ title: string; value: string }> = [
  { title: 'Frontend V2', value: 'FRONTEND_V2' },
  { title: 'Deeplink', value: 'DEEPLINK' },
]

/** Available credential format options for DCQL credential queries. */
const CREDENTIAL_FORMAT_OPTIONS: Array<{ title: string; value: string }> = [
  { title: 'SD-JWT VC', value: 'vc+sd-jwt' },
  { title: 'DC SD-JWT', value: 'dc+sd-jwt' },
  { title: 'MSO MDoc', value: 'mso_mdoc' },
  { title: 'LDP VC', value: 'ldp_vc' },
  { title: 'JWT VC JSON', value: 'jwt_vc_json' },
]

const props = defineProps<{ id?: string }>()
const { t } = useI18n()
const router = useRouter()
const store = useCcsStore()
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

/** Role-based capability flags for the current user. */
const { canEdit } = useAuth()

/** Whether the form is in edit mode (has an ID prop). */
const isEditMode = computed(() => !!props.id)

/** Success message for the snackbar. */
const successMessage = ref('')
/** Whether the success snackbar is visible. */
const showSuccess = ref(false)

/** Authorization type dropdown options. */
const authorizationTypeOptions = AUTHORIZATION_TYPE_OPTIONS

/** Credential format dropdown options. */
const credentialFormatOptions = CREDENTIAL_FORMAT_OPTIONS

/** Form validation rules. */
const rules = {
  /** Validates that a field is not empty. */
  required: (v: string) => !!v || t('common.required'),
}

/** Reactive credential type for the form. */
interface FormCredential {
  type: string
  trustedIssuersListsRaw: string
  trustedParticipantsListsRaw: string
}

/** Reactive form type for a DCQL claims query entry. */
interface FormDcqlClaim {
  id: string
  pathRaw: string
  valuesRaw: string
  namespace: string
  claimName: string
  intentToRetain: boolean
}

/** Reactive form type for a DCQL trusted authority entry. */
interface FormDcqlTrustedAuthority {
  type: string
  valuesRaw: string
}

/** Reactive form type for a DCQL credential query entry. */
interface FormDcqlCredentialQuery {
  id: string
  format: string
  multiple: boolean
  requireCryptographicHolderBinding: boolean
  metaVctValues: string
  metaDoctypeValue: string
  claims: FormDcqlClaim[]
  trustedAuthorities: FormDcqlTrustedAuthority[]
}

/** Reactive form type for a DCQL credential set query entry. */
interface FormDcqlCredentialSetQuery {
  optionsRaw: string
  required: boolean
  purposeRaw: string
}

/** Reactive scope type for the form. */
interface FormScope {
  name: string
  flatClaims: boolean
  credentials: FormCredential[]
  dcqlEnabled: boolean
  dcqlCredentials: FormDcqlCredentialQuery[]
  dcqlCredentialSets: FormDcqlCredentialSetQuery[]
}

/** Form state. */
const form = reactive<{
  id: string
  defaultOidcScope: string
  authorizationType: string
  scopes: FormScope[]
}>({
  id: '',
  defaultOidcScope: '',
  authorizationType: '',
  scopes: [],
})

/**
 * Create a new empty form credential.
 *
 * @returns A blank FormCredential.
 */
function createEmptyCredential(): FormCredential {
  return {
    type: '',
    trustedIssuersListsRaw: '',
    trustedParticipantsListsRaw: '',
  }
}

/**
 * Create a new empty DCQL claims query entry.
 *
 * @returns A blank FormDcqlClaim.
 */
function createEmptyDcqlClaim(): FormDcqlClaim {
  return {
    id: '',
    pathRaw: '',
    valuesRaw: '',
    namespace: '',
    claimName: '',
    intentToRetain: false,
  }
}

/**
 * Create a new empty DCQL trusted authority entry.
 *
 * @returns A blank FormDcqlTrustedAuthority.
 */
function createEmptyDcqlTrustedAuthority(): FormDcqlTrustedAuthority {
  return {
    type: '',
    valuesRaw: '',
  }
}

/**
 * Create a new empty DCQL credential query entry.
 *
 * @returns A blank FormDcqlCredentialQuery.
 */
function createEmptyDcqlCredentialQuery(): FormDcqlCredentialQuery {
  return {
    id: '',
    format: '',
    multiple: false,
    requireCryptographicHolderBinding: true,
    metaVctValues: '',
    metaDoctypeValue: '',
    claims: [],
    trustedAuthorities: [],
  }
}

/**
 * Create a new empty DCQL credential set query entry.
 *
 * @returns A blank FormDcqlCredentialSetQuery.
 */
function createEmptyDcqlCredentialSetQuery(): FormDcqlCredentialSetQuery {
  return {
    optionsRaw: '',
    required: false,
    purposeRaw: '',
  }
}

/**
 * Create a new empty form scope.
 *
 * @returns A blank FormScope.
 */
function createEmptyScope(): FormScope {
  return {
    name: '',
    flatClaims: false,
    credentials: [],
    dcqlEnabled: false,
    dcqlCredentials: [],
    dcqlCredentialSets: [],
  }
}

/** Add a new scope to the form. */
function addScope(): void {
  form.scopes.push(createEmptyScope())
}

/**
 * Remove a scope from the form by index.
 *
 * @param index - The scope index to remove.
 */
function removeScope(index: number): void {
  form.scopes.splice(index, 1)
}

/**
 * Add a new credential to a scope.
 *
 * @param scopeIndex - The scope index to add a credential to.
 */
function addCredential(scopeIndex: number): void {
  form.scopes[scopeIndex].credentials.push(createEmptyCredential())
}

/**
 * Remove a credential from a scope.
 *
 * @param scopeIndex - The scope index.
 * @param credIndex - The credential index to remove.
 */
function removeCredential(scopeIndex: number, credIndex: number): void {
  form.scopes[scopeIndex].credentials.splice(credIndex, 1)
}

/**
 * Add a new DCQL credential query to a scope.
 *
 * @param scopeIndex - The scope index to add a credential query to.
 */
function addDcqlCredentialQuery(scopeIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentials.push(createEmptyDcqlCredentialQuery())
}

/**
 * Remove a DCQL credential query from a scope.
 *
 * @param scopeIndex - The scope index.
 * @param cqIndex - The credential query index to remove.
 */
function removeDcqlCredentialQuery(scopeIndex: number, cqIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentials.splice(cqIndex, 1)
}

/**
 * Add a new DCQL credential set query to a scope.
 *
 * @param scopeIndex - The scope index to add a credential set query to.
 */
function addDcqlCredentialSetQuery(scopeIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentialSets.push(createEmptyDcqlCredentialSetQuery())
}

/**
 * Remove a DCQL credential set query from a scope.
 *
 * @param scopeIndex - The scope index.
 * @param csqIndex - The credential set query index to remove.
 */
function removeDcqlCredentialSetQuery(scopeIndex: number, csqIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentialSets.splice(csqIndex, 1)
}

/**
 * Add a new claims query to a DCQL credential query.
 *
 * @param scopeIndex - The scope index.
 * @param cqIndex - The credential query index to add a claim to.
 */
function addDcqlClaim(scopeIndex: number, cqIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentials[cqIndex].claims.push(createEmptyDcqlClaim())
}

/**
 * Remove a claims query from a DCQL credential query.
 *
 * @param scopeIndex - The scope index.
 * @param cqIndex - The credential query index.
 * @param claimIndex - The claim index to remove.
 */
function removeDcqlClaim(scopeIndex: number, cqIndex: number, claimIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentials[cqIndex].claims.splice(claimIndex, 1)
}

/**
 * Add a new trusted authority to a DCQL credential query.
 *
 * @param scopeIndex - The scope index.
 * @param cqIndex - The credential query index to add a trusted authority to.
 */
function addDcqlTrustedAuthority(scopeIndex: number, cqIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentials[cqIndex].trustedAuthorities.push(createEmptyDcqlTrustedAuthority())
}

/**
 * Remove a trusted authority from a DCQL credential query.
 *
 * @param scopeIndex - The scope index.
 * @param cqIndex - The credential query index.
 * @param taIndex - The trusted authority index to remove.
 */
function removeDcqlTrustedAuthority(scopeIndex: number, cqIndex: number, taIndex: number): void {
  form.scopes[scopeIndex].dcqlCredentials[cqIndex].trustedAuthorities.splice(taIndex, 1)
}

/**
 * Parse a comma-separated string into an array of trimmed, non-empty strings.
 *
 * @param raw - The raw comma-separated string.
 * @returns An array of strings.
 */
function parseCommaSeparated(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

/**
 * Parse a comma-separated string into an array of participant list objects.
 *
 * @param raw - The raw comma-separated string of URLs.
 * @returns An array of records with url keys.
 */
function parseParticipantsLists(raw: string): Array<Record<string, unknown>> {
  const urls = parseCommaSeparated(raw)
  return urls.map((url) => ({ url }))
}

/**
 * Safely parse a JSON string, returning null on failure.
 *
 * @param raw - The raw JSON string.
 * @returns The parsed value or null.
 */
function safeJsonParse(raw: string): unknown | null {
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Build a DCQL object from scope form state.
 *
 * @param scope - The form scope containing DCQL data.
 * @returns The DCQL object or null if not enabled or empty.
 */
function buildDcql(scope: FormScope): DCQL | null {
  if (!scope.dcqlEnabled || scope.dcqlCredentials.length === 0) return null

  const credentials: CredentialQuery[] = scope.dcqlCredentials.map((cq) => {
    const query: CredentialQuery = {}

    if (cq.id) query.id = cq.id
    if (cq.format) query.format = cq.format as CredentialQuery['format']
    if (cq.multiple) query.multiple = true
    if (!cq.requireCryptographicHolderBinding) query.require_cryptographic_holder_binding = false

    if (cq.claims.length > 0) {
      query.claims = cq.claims.map((claim) => {
        const claimQuery: ClaimsQuery = {}
        if (claim.id) claimQuery.id = claim.id
        const parsedPath = safeJsonParse(claim.pathRaw)
        if (Array.isArray(parsedPath)) claimQuery.path = parsedPath
        const parsedValues = safeJsonParse(claim.valuesRaw)
        if (Array.isArray(parsedValues)) claimQuery.values = parsedValues
        if (claim.namespace) claimQuery.namespace = claim.namespace
        if (claim.claimName) claimQuery.claim_name = claim.claimName
        if (claim.intentToRetain) claimQuery.intent_to_retain = true
        return claimQuery
      })
    }

    if (cq.metaVctValues || cq.metaDoctypeValue) {
      query.meta = {}
      const vctValues = parseCommaSeparated(cq.metaVctValues)
      if (vctValues.length > 0) query.meta.vct_values = vctValues
      if (cq.metaDoctypeValue) query.meta.doctype_value = cq.metaDoctypeValue
    }

    if (cq.trustedAuthorities.length > 0) {
      query.trusted_authorities = cq.trustedAuthorities
        .filter((ta) => ta.type)
        .map((ta): TrustedAuthorityQuery => ({
          type: ta.type,
          values: parseCommaSeparated(ta.valuesRaw),
        }))
    }

    return query
  })

  const dcql: DCQL = { credentials }

  if (scope.dcqlCredentialSets.length > 0) {
    const credentialSets: CredentialSetQuery[] = scope.dcqlCredentialSets.map((csq) => {
      const setQuery: CredentialSetQuery = {}

      if (csq.optionsRaw.trim()) {
        setQuery.options = csq.optionsRaw
          .split(';')
          .map((group) => group.split(',').map((v) => v.trim()).filter((v) => v.length > 0))
          .filter((group) => group.length > 0)
      }

      if (csq.required) setQuery.required = true

      const parsedPurpose = safeJsonParse(csq.purposeRaw)
      if (parsedPurpose && typeof parsedPurpose === 'object') {
        setQuery.purpose = parsedPurpose as Record<string, unknown>
      }

      return setQuery
    })

    if (credentialSets.length > 0) {
      dcql.credential_sets = credentialSets
    }
  }

  return dcql
}

/**
 * Convert form state to a Service API payload.
 *
 * @returns The Service payload.
 */
function buildPayload(): Service {
  const oidcScopes: Record<string, ServiceScopesEntry> = {}

  for (const scope of form.scopes) {
    if (!scope.name) continue

    const credentials: Credential[] = scope.credentials.map((cred) => {
      const credential: Credential = {
        type: cred.type,
      }

      const trustedIssuersLists = parseCommaSeparated(cred.trustedIssuersListsRaw)
      if (trustedIssuersLists.length > 0) {
        credential.trustedIssuersLists = trustedIssuersLists
      }

      const trustedParticipantsLists = parseParticipantsLists(cred.trustedParticipantsListsRaw)
      if (trustedParticipantsLists.length > 0) {
        credential.trustedParticipantsLists = trustedParticipantsLists
      }

      return credential
    })

    const entry: ServiceScopesEntry = {
      credentials,
    }

    if (scope.flatClaims) {
      entry.flatClaims = true
    }

    const dcql = buildDcql(scope)
    if (dcql) {
      entry.dcql = dcql
    }

    oidcScopes[scope.name] = entry
  }

  const service: Service = {
    id: form.id || undefined,
    defaultOidcScope: form.defaultOidcScope,
    oidcScopes,
  }

  if (form.authorizationType) {
    service.authorizationType = form.authorizationType as Service['authorizationType']
  }

  return service
}

/**
 * Populate the form from a Service object (for edit mode).
 *
 * @param service - The service to populate from.
 */
function populateForm(service: Service): void {
  form.id = service.id ?? ''
  form.defaultOidcScope = service.defaultOidcScope ?? ''
  form.authorizationType = service.authorizationType ?? ''

  form.scopes = Object.entries(service.oidcScopes ?? {}).map(([name, entry]) => ({
    name,
    flatClaims: entry.flatClaims ?? false,
    credentials: (entry.credentials ?? []).map((cred) => ({
      type: cred.type ?? '',
      trustedIssuersListsRaw: (cred.trustedIssuersLists ?? []).join(', '),
      trustedParticipantsListsRaw: (cred.trustedParticipantsLists ?? [])
        .map((p) => (typeof p === 'string' ? p : p.url ?? JSON.stringify(p)))
        .join(', '),
    })),
    dcqlEnabled: !!entry.dcql,
    dcqlCredentials: (entry.dcql?.credentials ?? []).map((cq): FormDcqlCredentialQuery => ({
      id: cq.id ?? '',
      format: cq.format ?? '',
      multiple: cq.multiple ?? false,
      requireCryptographicHolderBinding: cq.require_cryptographic_holder_binding !== false,
      metaVctValues: (cq.meta?.vct_values ?? []).join(', '),
      metaDoctypeValue: cq.meta?.doctype_value ?? '',
      claims: (cq.claims ?? []).map((claim): FormDcqlClaim => ({
        id: claim.id ?? '',
        pathRaw: claim.path ? JSON.stringify(claim.path) : '',
        valuesRaw: claim.values ? JSON.stringify(claim.values) : '',
        namespace: claim.namespace ?? '',
        claimName: claim.claim_name ?? '',
        intentToRetain: claim.intent_to_retain ?? false,
      })),
      trustedAuthorities: (cq.trusted_authorities ?? []).map((ta): FormDcqlTrustedAuthority => ({
        type: ta.type ?? '',
        valuesRaw: (ta.values ?? []).join(', '),
      })),
    })),
    dcqlCredentialSets: (entry.dcql?.credential_sets ?? []).map((csq): FormDcqlCredentialSetQuery => ({
      optionsRaw: (csq.options ?? []).map((group) => group.join(',')).join(';'),
      required: csq.required ?? false,
      purposeRaw: csq.purpose ? JSON.stringify(csq.purpose) : '',
    })),
  }))
}

/** Handle form submission for create or update. */
async function handleSubmit(): Promise<void> {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return

  const payload = buildPayload()

  if (isEditMode.value && props.id) {
    const success = await store.updateService(props.id, payload)
    if (success) {
      successMessage.value = t('ccs.updateSuccess')
      showSuccess.value = true
      router.push({ name: 'ccs-detail', params: { id: props.id } })
    }
  } else {
    const success = await store.createService(payload)
    if (success) {
      successMessage.value = t('ccs.createSuccess')
      showSuccess.value = true
      router.push({ name: 'ccs-detail', params: { id: form.id } })
    }
  }
}

onMounted(async () => {
  // Defensive redirect: the router guard normally blocks viewers from
  // reaching the form routes, but fall back to the list view in case the
  // guard was bypassed (e.g. stale session, manual route registration).
  if (!canEdit.value) {
    router.replace({ name: 'ccs-list' })
    return
  }
  if (isEditMode.value && props.id) {
    await store.fetchServiceDetail(props.id)
    if (store.selectedService) {
      populateForm(store.selectedService)
    }
  }
})
</script>
