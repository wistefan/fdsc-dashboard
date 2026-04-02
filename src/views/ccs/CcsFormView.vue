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
                label="Flat Claims"
                color="primary"
                density="comfortable"
                class="mb-3"
              />

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
import type { Service, ServiceScopesEntry, Credential } from '@/api/generated/ccs'

/** Timeout in milliseconds for the success snackbar. */
const SNACKBAR_TIMEOUT = 3000

/** Available authorization type options. */
const AUTHORIZATION_TYPE_OPTIONS: Array<{ title: string; value: string }> = [
  { title: 'Frontend V2', value: 'FRONTEND_V2' },
  { title: 'Deeplink', value: 'DEEPLINK' },
]

const props = defineProps<{ id?: string }>()
const { t } = useI18n()
const router = useRouter()
const store = useCcsStore()
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

/** Whether the form is in edit mode (has an ID prop). */
const isEditMode = computed(() => !!props.id)

/** Success message for the snackbar. */
const successMessage = ref('')
/** Whether the success snackbar is visible. */
const showSuccess = ref(false)

/** Authorization type dropdown options. */
const authorizationTypeOptions = AUTHORIZATION_TYPE_OPTIONS

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

/** Reactive scope type for the form. */
interface FormScope {
  name: string
  flatClaims: boolean
  credentials: FormCredential[]
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
 * Create a new empty form scope.
 *
 * @returns A blank FormScope.
 */
function createEmptyScope(): FormScope {
  return {
    name: '',
    flatClaims: false,
    credentials: [],
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
  if (isEditMode.value && props.id) {
    await store.fetchServiceDetail(props.id)
    if (store.selectedService) {
      populateForm(store.selectedService)
    }
  }
})
</script>
