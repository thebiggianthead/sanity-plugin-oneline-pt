# sanity-plugin-oneline-pt

A one line portable text input. Support decorators, annotations and inline objects.

> This is a **Sanity Studio v3** plugin.

## Installation

```sh
npm install sanity-plugin-oneline-pt
```

## Usage

Add it as a plugin in `sanity.config.ts` (or .js):

```ts
import {defineConfig} from 'sanity'
import {oneLinePortableText} from 'sanity-plugin-oneline-pt'

export default defineConfig({
  //...
  plugins: [oneLinePortableText()],
})
```

Then, in your schema simply add the new option to your Portable Text field:

```ts
defineField({
  name: 'myField',
  type: 'array',
  title: 'My Field',
  of: [
    defineArrayMember({
      type: 'block',
      options: {
        oneLine: true,
      },
    }),
  ],
})
```

### Preview

If you need to use a field with the plugin enabled for your document previews, you can do this in your schema:

```ts
import {defineType, defineField} from 'sanity'
import {ptStringPreview} from 'sanity-plugin-pt-string'

export default defineType({
  name: 'myType',
  type: 'document',
  fields: [
    // field defined as above
  ],
  preview: ptStringPreview('myField'),
})
```

### Configuration

Configure the field just as you would any other Portable Text block. Note that any unsupported configuration (lists, multiple styles, additional block types) will simply be ignored and removed from the schema by the plugin.

The same default decorators and annotations will be used as per the standard Studio Portable Text editor.

```ts
defineField({
  name: 'myField',
  type: 'array',
  title: 'My Field',
  of: [
    defineArrayMember({
      type: 'block',
      of: [] // define an array of inline objects
      marks: {
        annotations: [] // define an array of annotations
        decorators: [] // define an array of decorators
      },
      options: {
        oneLine: true,
      },
    }),
  ],
})
```

## Usage

The data is output as a Portable Text block. You can use the `PortableText` component from `@portabletext/react` to render it in React:

```tsx
import {PortableText} from '@portabletext/react'

const PortableTextParagraph = (props) => {
  return <PortableText value={props.value} />
}
```

If you want to customize the rendering of the blocks, you can pass a `components` prop to the `PortableText` component. Following is an example of how to render your content within a `h2` tag:

```tsx
import {PortableText} from '@portabletext/react'

const components = {
  block: {
    normal: ({children}) => <p>{children}</p>,
  },
}

const PortableTextHeading = (props) => {
  return <PortableText value={props.value} components={components} />
}
```

## License

[MIT](LICENSE) © Tom Smith

## Develop & test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit)
with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio)
on how to run this plugin with hotreload in the studio.
