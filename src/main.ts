import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vue-data-ui/style.css'
import App from './App.vue'
import router from './router'
import './assets/font_5221915_pbx0boor5wq/iconfont.css'
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
