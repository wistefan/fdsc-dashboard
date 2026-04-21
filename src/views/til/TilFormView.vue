<template>
  <div>
    <!-- Back button -->
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      to="/til"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <h1 class="text-h4 mb-4">
      {{ isEditMode ? t('til.editTitle') : t('til.createTitle') }}
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
      <!-- DID field -->
      <v-card class="mb-4">
        <v-card-title>{{ t('til.did') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.did"
            :label="t('til.did')"
            :readonly="isEditMode"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            placeholder="did:example:123"
          />
        </v-card-text>
      </v-card>

      <!-- Credentials section -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-file-certificate
          </v-icon>
          {{ t('til.credentials') }}
          <v-chip
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ form.credentials.length }}
          </v-chip>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-plus"
            @click="addCredential"
          >
            {{ t('til.addCredential') }}
          </v-btn>
        </v-card-title>

        <v-card-text v-if="form.credentials.length === 0">
          <p class="text-medium-emphasis">
            {{ t('til.noCredentials') }}
          </p>
        </v-card-text>

        <v-expansion-panels
          v-else
          variant="accordion"
          class="mx-4 mb-4"
        >
          <v-expansion-panel
            v-for="(cred, credIndex) in form.credentials"
            :key="credIndex"
          >
            <v-expansion-panel-title>
              <v-icon
                start
                size="small"
              >
                mdi-key-variant
              </v-icon>
              <span class="font-weight-medium">
                {{ cred.credentialsType || t('til.credentialType') + ' ' + (credIndex + 1) }}
              </span>
              <v-spacer />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                class="mr-2"
                @click.stop="removeCredential(credIndex)"
              />
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- Credential type -->
              <v-text-field
                v-model="cred.credentialsType"
                :label="t('til.credentialType')"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />

              <!-- Validity period -->
              <v-row>
                <v-col
                  cols="12"
                  sm="6"
                >
                  <v-text-field
                    v-model="cred.validFor.from"
                    :label="t('til.validFrom')"
                    variant="outlined"
                    density="comfortable"
                    type="datetime-local"
                  />
                </v-col>
                <v-col
                  cols="12"
                  sm="6"
                >
                  <v-text-field
                    v-model="cred.validFor.to"
                    :label="t('til.validTo')"
                    variant="outlined"
                    density="comfortable"
                    type="datetime-local"
                  />
                </v-col>
              </v-row>

              <!-- Claims section -->
              <div class="d-flex align-center mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('til.claims') }}
                </span>
                <v-chip
                  class="ml-2"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ cred.claims.length }}
                </v-chip>
                <v-spacer />
                <v-btn
                  variant="tonal"
                  size="x-small"
                  prepend-icon="mdi-plus"
                  @click="addClaim(credIndex)"
                >
                  {{ t('til.addClaim') }}
                </v-btn>
              </div>

              <v-card
                v-for="(claim, claimIndex) in cred.claims"
                :key="claimIndex"
                variant="outlined"
                class="mb-3 pa-3"
              >
                <div class="d-flex align-center mb-2">
                  <span class="text-caption text-medium-emphasis">
                    {{ t('til.claims') }} {{ claimIndex + 1 }}
                  </span>
                  <v-spacer />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeClaim(credIndex, claimIndex)"
                  />
                </div>
                <v-row dense>
                  <v-col
                    cols="12"
                    sm="4"
                  >
                    <v-text-field
                      v-model="claim.name"
                      :label="t('til.claimName')"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="4"
                  >
                    <v-text-field
                      v-model="claim.path"
                      :label="t('til.claimPath')"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="4"
                  >
                    <v-text-field
                      v-model="claim.allowedValuesRaw"
                      :label="t('til.allowedValues')"
                      :hint="t('til.allowedValuesHint')"
                      variant="outlined"
                      density="compact"
                      persistent-hint
                    />
                  </v-col>
                </v-row>
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
          to="/til"
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
import { useTilStore } from '@/stores/til'
import { useAuth } from '@/composables/useAuth'
import type { TrustedIssuer, Credentials, Claim } from '@/api/generated/til'

/** Timeout in milliseconds for the success snackbar. */
const SNACKBAR_TIMEOUT = 3000

const props = defineProps<{ did?: string }>()
const { t } = useI18n()
const router = useRouter()
const store = useTilStore()
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

/** Role-based capability flags for the current user. */
const { canEdit } = useAuth()

/** Whether the form is in edit mode (has a DID prop). */
const isEditMode = computed(() => !!props.did)

/** Success message for the snackbar. */
const successMessage = ref('')
/** Whether the success snackbar is visible. */
const showSuccess = ref(false)

/** Form validation rules. */
const rules = {
  /** Validates that a field is not empty. */
  required: (v: string) => !!v || t('common.required'),
}

/** Reactive claim type with raw string for allowed values editing. */
interface FormClaim {
  name: string
  path: string
  allowedValuesRaw: string
}

/** Reactive credential type for the form. */
interface FormCredential {
  credentialsType: string
  validFor: { from: string; to: string }
  claims: FormClaim[]
}

/** Form state. */
const form = reactive<{
  did: string
  credentials: FormCredential[]
}>({
  did: '',
  credentials: [],
})

/**
 * Create a new empty form credential.
 *
 * @returns A blank FormCredential.
 */
function createEmptyCredential(): FormCredential {
  return {
    credentialsType: '',
    validFor: { from: '', to: '' },
    claims: [],
  }
}

/**
 * Create a new empty form claim.
 *
 * @returns A blank FormClaim.
 */
function createEmptyClaim(): FormClaim {
  return { name: '', path: '', allowedValuesRaw: '' }
}

/** Add a new credential to the form. */
function addCredential(): void {
  form.credentials.push(createEmptyCredential())
}

/**
 * Remove a credential from the form by index.
 *
 * @param index - The credential index to remove.
 */
function removeCredential(index: number): void {
  form.credentials.splice(index, 1)
}

/**
 * Add a new claim to a credential.
 *
 * @param credIndex - The credential index to add a claim to.
 */
function addClaim(credIndex: number): void {
  form.credentials[credIndex].claims.push(createEmptyClaim())
}

/**
 * Remove a claim from a credential.
 *
 * @param credIndex - The credential index.
 * @param claimIndex - The claim index to remove.
 */
function removeClaim(credIndex: number, claimIndex: number): void {
  form.credentials[credIndex].claims.splice(claimIndex, 1)
}

/**
 * Parse a comma-separated string into an array of allowed value objects.
 *
 * @param raw - The raw comma-separated string.
 * @returns An array of allowed value records.
 */
function parseAllowedValues(raw: string): Array<Record<string, unknown>> {
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map((v) => {
      try {
        return JSON.parse(v) as Record<string, unknown>
      } catch {
        return v as unknown as Record<string, unknown>
      }
    })
}

/**
 * Convert form state to a TrustedIssuer API payload.
 *
 * @returns The TrustedIssuer payload.
 */
function buildPayload(): TrustedIssuer {
  const credentials: Credentials[] = form.credentials.map((cred) => {
    const claims: Claim[] = cred.claims.map((claim) => ({
      name: claim.name || undefined,
      path: claim.path || undefined,
      allowedValues: parseAllowedValues(claim.allowedValuesRaw),
    }))

    return {
      credentialsType: cred.credentialsType || undefined,
      validFor:
        cred.validFor.from || cred.validFor.to
          ? {
              from: cred.validFor.from || undefined,
              to: cred.validFor.to || undefined,
            }
          : undefined,
      claims: claims.length > 0 ? claims : undefined,
    }
  })

  return {
    did: form.did,
    credentials: credentials.length > 0 ? credentials : undefined,
  }
}

/**
 * Populate the form from a TrustedIssuer object (for edit mode).
 *
 * @param issuer - The issuer to populate from.
 */
function populateForm(issuer: TrustedIssuer): void {
  form.did = issuer.did ?? ''
  form.credentials = (issuer.credentials ?? []).map((cred) => ({
    credentialsType: cred.credentialsType ?? '',
    validFor: {
      from: cred.validFor?.from ?? '',
      to: cred.validFor?.to ?? '',
    },
    claims: (cred.claims ?? []).map((claim) => ({
      name: claim.name ?? '',
      path: claim.path ?? '',
      allowedValuesRaw: (claim.allowedValues ?? [])
        .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
        .join(', '),
    })),
  }))
}

/** Handle form submission for create or update. */
async function handleSubmit(): Promise<void> {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return

  const payload = buildPayload()

  if (isEditMode.value && props.did) {
    const success = await store.updateIssuer(props.did, payload)
    if (success) {
      successMessage.value = t('til.updateSuccess')
      showSuccess.value = true
      router.push({ name: 'til-detail', params: { did: props.did } })
    }
  } else {
    const success = await store.createIssuer(payload)
    if (success) {
      successMessage.value = t('til.createSuccess')
      showSuccess.value = true
      router.push({ name: 'til-detail', params: { did: form.did } })
    }
  }
}

onMounted(async () => {
  // Defensive redirect: the router guard normally blocks viewers from
  // reaching the form routes, but fall back to the list view in case the
  // guard was bypassed (e.g. stale session, manual route registration).
  if (!canEdit.value) {
    router.replace({ name: 'til-list' })
    return
  }
  if (isEditMode.value && props.did) {
    await store.fetchIssuerDetail(props.did)
    if (store.selectedIssuer) {
      populateForm(store.selectedIssuer)
    }
  }
})
</script>
