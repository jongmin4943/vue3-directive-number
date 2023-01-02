# vue3-directive-number

Vue3 number directive supports IME for inputs including other Ui frameworks's input Element

# Features

Force to enter only numbers

# Installation

    npm install vue3-directive-number
    yarn add vue3-directive-number

# Usage

### main.ts

```js
import { createApp } from "vue";
import App from "./App.vue";
import VueNumber from "vue3-directive-number";

createApp(App).use(VueNumber).mount("#app");
```

```html
<template>
  <input v-number.minus.point.money="option" />
</template>

<script setup lang="ts">
  const option = {
    min: 0,
    max: 100,
  };
</script>
```

### Modifiers

#### minus

Required: `false`<br>

Allow minus

#### point

Required: `false`<br>

Allow decimal point

#### money

Required: `false`<br>

Automatically add comma separators

### Options

```typescript
min?: number; // Default -10000000000000000000
max?: number; // Default 10000000000000000000
```

# License

<a href="https://github.com/jongmin4943/vue3-directive-number/blob/master/LICENSE">MIT</a> License
