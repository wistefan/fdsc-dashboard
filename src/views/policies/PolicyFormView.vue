<template>
  <div>
    <!-- Back button -->
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      to="/policies"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <h1 class="text-h4 mb-4">
      {{ isEditMode ? t('policies.editTitle') : t('policies.createTitle') }}
    </h1>

    <!-- Service badge -->
    <v-chip
      v-if="serviceId"
      class="mb-4"
      color="info"
      variant="tonal"
      prepend-icon="mdi-folder-outline"
    >
      {{ t('policies.service') }}: {{ serviceId }}
    </v-chip>

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
      <!-- ODRL Context -->
      <v-card class="mb-4">
        <v-card-title>{{ t('policies.odrlContext') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.context"
            :label="t('policies.odrlContext')"
            variant="outlined"
            density="comfortable"
            placeholder="http://www.w3.org/ns/odrl.jsonld"
          />
        </v-card-text>
      </v-card>

      <!-- Policy Type -->
      <v-card class="mb-4">
        <v-card-title>{{ t('policies.policyType') }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.type"
            :label="t('policies.policyType')"
            :items="policyTypeOptions"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
      </v-card>

      <!-- ODRL UID -->
      <v-card class="mb-4">
        <v-card-title>{{ t('policies.odrlUid') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.uid"
            :label="t('policies.odrlUid')"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            placeholder="urn:uuid:..."
          />
        </v-card-text>
      </v-card>

      <!-- Permissions section -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-shield-check
          </v-icon>
          {{ t('policies.permissions') }}
          <v-chip
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ form.permissions.length }}
          </v-chip>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-plus"
            @click="addPermission"
          >
            {{ t('policies.addPermission') }}
          </v-btn>
        </v-card-title>

        <v-card-text v-if="form.permissions.length === 0">
          <p class="text-medium-emphasis">
            {{ t('policies.noPermissions') }}
          </p>
        </v-card-text>

        <v-expansion-panels
          v-else
          variant="accordion"
          class="mx-4 mb-4"
        >
          <v-expansion-panel
            v-for="(perm, permIndex) in form.permissions"
            :key="permIndex"
          >
            <v-expansion-panel-title>
              <v-icon
                start
                size="small"
              >
                mdi-shield-check
              </v-icon>
              <span class="font-weight-medium">
                {{ t('policies.permission') }} {{ permIndex + 1 }}
                <span
                  v-if="perm.target"
                  class="text-medium-emphasis"
                >
                  — {{ perm.target }}
                </span>
              </span>
              <v-spacer />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                class="mr-2"
                @click.stop="removePermission(permIndex)"
              />
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- Target -->
              <v-text-field
                v-model="perm.target"
                :label="t('policies.target')"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                placeholder="urn:asset:..."
              />

              <!-- Action -->
              <v-select
                v-model="perm.action"
                :label="t('policies.action')"
                :items="actionOptions"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />

              <!-- Constraints section -->
              <div class="d-flex align-center mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('policies.constraints') }}
                </span>
                <v-chip
                  class="ml-2"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ perm.constraints.length }}
                </v-chip>
                <v-spacer />
                <v-btn
                  variant="tonal"
                  size="x-small"
                  prepend-icon="mdi-plus"
                  @click="addConstraint(permIndex)"
                >
                  {{ t('policies.addConstraint') }}
                </v-btn>
              </div>

              <v-card
                v-for="(constraint, conIndex) in perm.constraints"
                :key="conIndex"
                variant="outlined"
                class="mb-3 pa-3"
              >
                <div class="d-flex align-center mb-2">
                  <span class="text-caption text-medium-emphasis">
                    {{ t('policies.constraint') }} {{ conIndex + 1 }}
                  </span>
                  <v-spacer />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeConstraint(permIndex, conIndex)"
                  />
                </div>
                <v-row dense>
                  <v-col
                    cols="12"
                    sm="4"
                  >
                    <v-text-field
                      v-model="constraint.leftOperand"
                      :label="t('policies.leftOperand')"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="4"
                  >
                    <v-select
                      v-model="constraint.operator"
                      :label="t('policies.operator')"
                      :items="operatorOptions"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="4"
                  >
                    <v-text-field
                      v-model="constraint.rightOperand"
                      :label="t('policies.rightOperand')"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                </v-row>
              </v-card>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card>

      <!-- Live ODRL JSON preview -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-code-json
          </v-icon>
          {{ t('policies.jsonPreview') }}
        </v-card-title>
        <v-card-text>
          <pre class="text-body-2 pa-3 bg-grey-lighten-4 rounded overflow-x-auto">{{ formattedPreview }}</pre>
        </v-card-text>
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
          to="/policies"
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
import { usePoliciesStore } from '@/stores/policies'
import type { OdrlPolicyJson } from '@/api/generated/odrl'

/** Timeout in milliseconds for the success snackbar. */
const SNACKBAR_TIMEOUT = 3000

/** Default ODRL context URI. */
const DEFAULT_ODRL_CONTEXT = 'http://www.w3.org/ns/odrl.jsonld'

/** Number of spaces used for JSON indentation in the preview. */
const JSON_INDENT = 2

const props = defineProps<{ id?: string; serviceId?: string }>()
const { t } = useI18n()
const router = useRouter()
const store = usePoliciesStore()
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

/** Whether the form is in edit mode (has an id prop). */
const isEditMode = computed(() => !!props.id)

/** Whether this form is for a service-scoped policy. */
const isServicePolicy = computed(() => !!props.serviceId)

/** Success message for the snackbar. */
const successMessage = ref('')
/** Whether the success snackbar is visible. */
const showSuccess = ref(false)

/** Form validation rules. */
const rules = {
  /** Validates that a field is not empty. */
  required: (v: string) => !!v || t('common.required'),
}

/** Available ODRL policy type options. */
const policyTypeOptions = ['Set', 'Offer', 'Agreement']

/** Available ODRL action options. */
const actionOptions = [
  'use',
  'transfer',
  'acceptTracking',
  'aggregate',
  'annotate',
  'anonymize',
  'archive',
  'attribute',
  'compensate',
  'concurrentUse',
  'delete',
  'derive',
  'digitize',
  'display',
  'distribute',
  'ensureExclusivity',
  'execute',
  'extract',
  'grantUse',
  'include',
  'index',
  'inform',
  'install',
  'modify',
  'move',
  'nextPolicy',
  'obtainConsent',
  'play',
  'present',
  'print',
  'read',
  'reproduce',
  'reviewPolicy',
  'stream',
  'synchronize',
  'textToSpeech',
  'transform',
  'translate',
  'uninstall',
  'watermark',
]

/** Available ODRL constraint operator options. */
const operatorOptions = [
  'eq',
  'neq',
  'lt',
  'lteq',
  'gt',
  'gteq',
  'isA',
  'hasPart',
  'isPartOf',
  'isAllOf',
  'isAnyOf',
  'isNoneOf',
]

/** Reactive constraint type for the form. */
interface FormConstraint {
  leftOperand: string
  operator: string
  rightOperand: string
}

/** Reactive permission type for the form. */
interface FormPermission {
  target: string
  action: string
  constraints: FormConstraint[]
}

/** Form state. */
const form = reactive<{
  context: string
  type: string
  uid: string
  permissions: FormPermission[]
}>({
  context: DEFAULT_ODRL_CONTEXT,
  type: 'Set',
  uid: '',
  permissions: [],
})

/**
 * Create a new empty form constraint.
 *
 * @returns A blank FormConstraint.
 */
function createEmptyConstraint(): FormConstraint {
  return { leftOperand: '', operator: 'eq', rightOperand: '' }
}

/**
 * Create a new empty form permission.
 *
 * @returns A blank FormPermission.
 */
function createEmptyPermission(): FormPermission {
  return { target: '', action: 'use', constraints: [] }
}

/** Add a new permission to the form. */
function addPermission(): void {
  form.permissions.push(createEmptyPermission())
}

/**
 * Remove a permission from the form by index.
 *
 * @param index - The permission index to remove.
 */
function removePermission(index: number): void {
  form.permissions.splice(index, 1)
}

/**
 * Add a new constraint to a permission.
 *
 * @param permIndex - The permission index to add a constraint to.
 */
function addConstraint(permIndex: number): void {
  form.permissions[permIndex].constraints.push(createEmptyConstraint())
}

/**
 * Remove a constraint from a permission.
 *
 * @param permIndex - The permission index.
 * @param conIndex - The constraint index to remove.
 */
function removeConstraint(permIndex: number, conIndex: number): void {
  form.permissions[permIndex].constraints.splice(conIndex, 1)
}

/**
 * Build an ODRL policy JSON payload from the form state.
 *
 * @returns The OdrlPolicyJson payload ready for API submission.
 */
function buildPayload(): OdrlPolicyJson {
  const policy: OdrlPolicyJson = {
    '@context': form.context || DEFAULT_ODRL_CONTEXT,
    '@type': form.type,
    uid: form.uid,
  }

  if (form.permissions.length > 0) {
    policy.permission = form.permissions.map((perm) => {
      const permission: Record<string, unknown> = {
        target: perm.target,
        action: perm.action,
      }

      if (perm.constraints.length > 0) {
        permission.constraint = perm.constraints.map((c) => ({
          leftOperand: c.leftOperand,
          operator: c.operator,
          rightOperand: c.rightOperand,
        }))
      }

      return permission
    })
  }

  return policy
}

/** Live ODRL JSON preview computed from form state. */
const formattedPreview = computed(() => {
  return JSON.stringify(buildPayload(), null, JSON_INDENT)
})

/**
 * Populate the form from a Policy object (for edit mode).
 * Parses the `odrl` JSON string to extract structured data.
 *
 * @param policy - The policy to populate from.
 */
function populateForm(policy: { odrl?: string; 'odrl:uid'?: string }): void {
  if (!policy.odrl) return

  try {
    const parsed = JSON.parse(policy.odrl)
    form.context = parsed['@context'] ?? DEFAULT_ODRL_CONTEXT
    form.type = parsed['@type'] ?? 'Set'
    form.uid = parsed.uid ?? policy['odrl:uid'] ?? ''

    if (Array.isArray(parsed.permission)) {
      form.permissions = parsed.permission.map(
        (perm: Record<string, unknown>) => ({
          target: (perm.target as string) ?? '',
          action: (perm.action as string) ?? 'use',
          constraints: Array.isArray(perm.constraint)
            ? (perm.constraint as Array<Record<string, string>>).map((c) => ({
                leftOperand: c.leftOperand ?? '',
                operator: c.operator ?? 'eq',
                rightOperand: c.rightOperand ?? '',
              }))
            : [],
        }),
      )
    }
  } catch {
    // If parsing fails, leave defaults
  }
}

/** Handle form submission for create or update, supporting service-scoped policies. */
async function handleSubmit(): Promise<void> {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return

  const payload = buildPayload()

  if (isEditMode.value && props.id) {
    const success = isServicePolicy.value
      ? await store.updateServicePolicy(props.serviceId!, props.id, payload)
      : await store.updatePolicy(props.id, payload)
    if (success) {
      successMessage.value = t('policies.updateSuccess')
      showSuccess.value = true
      if (isServicePolicy.value) {
        router.push({ name: 'service-policy-detail', params: { serviceId: props.serviceId, id: props.id } })
      } else {
        router.push({ name: 'policy-detail', params: { id: props.id } })
      }
    }
  } else {
    const success = isServicePolicy.value
      ? await store.createServicePolicy(props.serviceId!, payload)
      : await store.createPolicy(payload)
    if (success) {
      successMessage.value = t('policies.createSuccess')
      showSuccess.value = true
      router.push({ name: 'policies-list' })
    }
  }
}

onMounted(async () => {
  if (isEditMode.value && props.id) {
    if (isServicePolicy.value) {
      await store.fetchServicePolicyDetail(props.serviceId!, props.id)
    } else {
      await store.fetchPolicyDetail(props.id)
    }
    if (store.selectedPolicy) {
      populateForm(store.selectedPolicy)
    }
  }
})
</script>
