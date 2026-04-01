import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vuetify } from './plugins/vuetify'
import { i18n } from './plugins/i18n'
import { configureApiClients } from './api/config'

import '@mdi/font/css/materialdesignicons.css'

/* Initialise generated API clients with the correct base URLs. */
configureApiClients()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(i18n)

app.mount('#app')
