<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Orb held in front claw -->
    <circle cx="4.5" cy="16" r="2" />
    <!-- Head -->
    <path d="M13 7.5 C13 6 14 5 15.5 5 C17 5 18.2 6 18.2 7.5 C18.2 9 17 9.8 15.5 9.8" />
    <!-- Horn -->
    <path d="M13.8 5.5 L13 4" />
    <!-- Neck -->
    <path d="M15.5 9.8 C14.5 10.5 13.5 11 12.5 11.5" />
    <!-- Wing (prominent bat-wing shape) -->
    <path d="M14.5 9 C12 7 8 5 5 6.5 C7 7.5 9.5 10 10 12" />
    <path d="M10 12 C8.5 9.5 5.5 8.5 4 10" />
    <!-- Shoulder / body junction -->
    <path d="M12.5 11.5 C11.5 11.8 10.8 12 10 12" />
    <!-- Torso -->
    <path d="M12.5 11.5 C14 11.5 16 13 16 15 C16 17 14.5 18.5 13 19" />
    <!-- Front arm reaching to orb -->
    <path d="M11.5 13.5 C9.5 13.5 7 14.5 6.5 16" />
    <!-- Tail -->
    <path d="M13 19 C12 20.5 12 22 12.5 23" />
    <!-- Back leg -->
    <path d="M16 17.5 C16.5 19 16 21 15 22" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: string; strokeWidth?: string | number }>(), {
  size: '1em',
  strokeWidth: 1.5,
});
</script>
