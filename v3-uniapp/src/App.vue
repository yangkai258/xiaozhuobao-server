<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { setAuthNotifier } from './api/client';

onLaunch(() => {
  // 401 / refresh 失败时清空 token 并强制回到登录页
  setAuthNotifier(() => {
    uni.reLaunch({ url: '/pages/login/index' });
  });
});
</script>

<style lang="scss">
/* 已在 uni.scss 中引入 tokens.scss / global.scss */
</style>
