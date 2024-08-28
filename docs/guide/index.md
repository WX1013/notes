# 文档编写语法

Rspress不仅支持Markdown，还支持MDX，这是一种强大的内容开发方式。


## Markdown

MDX是Markdown的超集，这意味着您可以像往常一样写入Markdown文件。例如：

```md
# Hello World
```

## 使用组件

当您想在Markdown文件中使用React组件时，您应该使用 .mdx 扩展名命名您的文件。例如：

```mdx
// docs/index.mdx
import { CustomComponent } from './custom';

# Hello World

<CustomComponent />
```

## Front Matter

您可以在Markdown文件的开头添加Front Matter，这是一个YAML格式的对象，用于定义一些元数据。例如：

```yaml
---
title: Hello World
---
```

> 注意：默认情况下，Rspress使用h1标题作为html标题。

您还可以访问正文中Front Matter中定义的属性，例如：

```markdown
---
title: Hello World
---

# {frontmatter.title}
```

之前定义的属性将作为`frontmatter`属性传递给组件。所以最终输出将是：

```html
<h1>Hello World</h1>
```

## 自定义容器

您可以使用`:::`语法来创建自定义容器并支持自定义标题。例如：

**Input:**

```markdown
:::tip
This is a `block` of type `tip`
:::

:::info
This is a `block` of type `info`
:::

:::warning
This is a `block` of type `warning`
:::

:::danger
This is a `block` of type `danger`
:::

::: details
This is a `block` of type `details`
:::

:::tip Custom Title
This is a `block` of `Custom Title`
:::

:::tip{title="Custom Title"}
This is a `block` of `Custom Title`
:::
```

**Output:**

:::tip
This is a `block` of type `tip`
:::

:::info
This is a `block` of type `info`
:::

:::warning
This is a `block` of type `warning`
:::

:::danger
This is a `block` of type `danger`
:::

::: details
This is a `block` of type `details`
:::

:::tip Custom Title
This is a `block` of `Custom Title`
:::

:::tip{title="Custom Title"}
This is a `block` of `Custom Title`
:::

## 代码块

### 基本用法

您可以使用 \`\`\` 语法创建代码块并支持自定义标题。例如：

**Input:**

````md
```js
console.log('Hello World');
```

```js title="hello.js"
console.log('Hello World');
```
````

**Output:**

```js
console.log('Hello World');
```

```js title="hello.js"
console.log('Hello World');
```

### 显示行号

如果要显示行号，可以在配置文件中启用 `showLineNumbers` 选项：

```ts title="rspress.config.ts"
export default {
  // ...
  markdown: {
    showLineNumbers: true,
  },
};
```

### 包装代码

如果要默认包装长代码行，可以在配置文件中启用 `defaultWrapCode` 选项：

```ts title="rspress.config.ts"
export default {
  // ...
  markdown: {
    defaultWrapCode: true,
  },
};
```

### 行高亮

您还可以同时应用行高亮和代码块标题，例如：

**Input:**

````md
```js title="hello.js" {1,3-5}
console.log('Hello World');

const a = 1;

console.log(a);

const b = 2;

console.log(b);
```
````

**Ouput:**

```js title="hello.js" {1,3-5}
console.log('Hello World');

const a = 1;

console.log(a);

const b = 2;

console.log(b);
```
