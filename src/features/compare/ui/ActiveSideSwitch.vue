<script setup lang="ts">
import { ArrowRightLeft } from "lucide-vue-next";
import type { StudioDocument } from "../../../shared/types";
import { setActive } from "../model/actions";
defineProps<{ doc: StudioDocument }>();
</script>
<template>
  <section class="panel active-side-panel">
    <div class="section-label">
      <span>对照 · 活动侧</span><ArrowRightLeft :size="14" />
    </div>
    <div class="segmented">
      <button :class="{ active: doc.active === 0 }" @click="setActive(doc, 0)">
        左侧 A</button
      ><button :class="{ active: doc.active === 1 }" @click="setActive(doc, 1)">
        右侧 B
      </button>
    </div>
    <p class="mini">下方投影、旋转与边缘控件始终作用于活动侧。</p>
  </section>
</template>
