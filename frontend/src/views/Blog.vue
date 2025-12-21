<template>
  <div class="bg-surface-50 dark:bg-surface-950 px-6 py-20 md:px-12 lg:px-20">
    <div
      class="font-bold text-5xl text-surface-900 dark:text-surface-0 mb-8 text-center"
    >
      Featured Posts
    </div>
    <div class="grid grid-cols-12 gap-4 nogutter">
      <div class="col-span-12 lg:col-span-4 p-4">
        <div
          class="shadow rounded-border h-full bg-surface-0 dark:bg-surface-900"
        >
          <img
            src="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/blog/blog-1.jpg"
            alt="Image"
            class="block w-full rounded-t"
          />
          <div class="p-6">
            <span class="block font-medium text-blue-600 mb-4"
              >Content Category</span
            >
            <div
              class="text-xl text-surface-900 dark:text-surface-0 font-medium mb-4 leading-normal"
            >
              Lorem ipsum dolor sit amet
            </div>
            <div
              class="leading-normal mb-4 text-surface-700 dark:text-surface-100"
            >
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
            <div class="flex">
              <Avatar
                image="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/avatars/circle/avatar-f-1.png"
                shape="circle"
              />
              <div class="ml-2">
                <div
                  class="text-sm font-bold text-surface-900 dark:text-surface-0 mb-1"
                >
                  Steve Babb
                </div>
                <div
                  class="text-sm flex items-center text-surface-700 dark:text-surface-100"
                >
                  <i class="pi pi-calendar mr-1 text-sm" />
                  <span>Apr 5, 202X</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-4 p-4">
        <div
          class="shadow rounded-border h-full bg-surface-0 dark:bg-surface-900"
        >
          <img
            src="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/blog/blog-2.jpg"
            alt="Image"
            class="block w-full rounded-t"
          />
          <div class="p-6 flex flex-col">
            <span class="block font-medium text-pink-600 mb-4"
              >Content Category</span
            >
            <div
              class="text-xl text-surface-900 dark:text-surface-0 font-medium mb-4 leading-normal"
            >
              Lorem ipsum dolor sit amet
            </div>
            <div
              class="leading-normal mb-4 text-surface-700 dark:text-surface-100"
            >
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
            <div class="flex">
              <Avatar
                image="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/avatars/circle/avatar-f-2.png"
                shape="circle"
              />
              <div class="ml-2">
                <div
                  class="text-sm font-bold text-surface-900 dark:text-surface-0 mb-1"
                >
                  Steve Babb
                </div>
                <div
                  class="text-sm flex items-center text-surface-700 dark:text-surface-100"
                >
                  <i class="pi pi-calendar mr-1 text-sm" />
                  <span>Apr 6, 202X</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-4 p-4">
        <div
          class="shadow rounded-border h-full bg-surface-0 dark:bg-surface-900"
        >
          <img
            src="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/blog/blog-3.jpg"
            alt="Image"
            class="block w-full rounded-t"
          />
          <div class="p-6">
            <span class="block font-medium text-orange-600 mb-4"
              >Content Category</span
            >
            <div
              class="text-xl text-surface-900 dark:text-surface-0 font-medium mb-4 leading-normal"
            >
              Lorem ipsum dolor sit amet
            </div>
            <div
              class="leading-normal mb-4 text-surface-700 dark:text-surface-100"
            >
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
            <div class="flex">
              <Avatar
                image="https://fqjltiegiezfetthbags.supabase.co/storage/v1/render/image/public/block.images/blocks/avatars/circle/avatar-f-3.png"
                shape="circle"
              />
              <div class="ml-2">
                <div
                  class="text-sm font-bold text-surface-900 dark:text-surface-0 mb-1"
                >
                  Steve Babb
                </div>
                <div
                  class="text-sm flex items-center text-surface-700 dark:text-surface-100"
                >
                  <i class="pi pi-calendar mr-1 text-sm" />
                  <span>Apr 9, 202X</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import Avatar from "primevue/avatar";
</script>

