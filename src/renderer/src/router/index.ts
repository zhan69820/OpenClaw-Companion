import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/llm' },
    {
      path: '/llm',
      name: 'LLMHub',
      component: () => import('@/views/LLMHub.vue'),
      meta: { title: '模型配置', icon: 'brain' }
    },
    {
      path: '/channels',
      name: 'Channels',
      component: () => import('@/views/ChannelManager.vue'),
      meta: { title: '通信频道', icon: 'radio' }
    },
    {
      path: '/backup',
      name: 'Backup',
      component: () => import('@/views/BackupMigrate.vue'),
      meta: { title: '备份迁移', icon: 'archive' }
    },
    {
      path: '/doctor',
      name: 'Doctor',
      component: () => import('@/views/Doctor.vue'),
      meta: { title: '故障急救', icon: 'stethoscope' }
    },
    {
      path: '/preview',
      name: 'Preview',
      component: () => import('@/views/ConfigPreview.vue'),
      meta: { title: '配置预览', icon: 'file-code' }
    },
    {
      path: '/manager',
      name: 'Manager',
      component: () => import('@/views/OpenClawManager.vue'),
      meta: { title: '服务管理', icon: 'activity' }
    },
    {
      path: '/uninstall',
      name: 'Uninstall',
      component: () => import('@/views/Uninstall.vue'),
      meta: { title: '卸载', icon: 'trash-2' }
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@/views/About.vue'),
      meta: { title: '关于', icon: 'info' }
    }
  ]
})

export default router
