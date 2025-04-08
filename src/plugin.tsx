import {InputProps, isArrayOfBlocksInputProps} from 'sanity'
import {definePlugin} from 'sanity'
import {PreviewConfig} from 'sanity'

import {OneLinePtInput} from './components/OneLinePtInput'
import {toPlainText} from './utils'
import {isOneLinePortableTextInputProps} from './utils/schema'

/**
 * Usage in `sanity.config.ts` (or .js)
 *
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {ptString} from 'pt-string'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [ptString()],
 * })
 * ```
 */
export const oneLinePortableText = definePlugin(() => {
  return {
    name: 'pt-string',
    form: {
      components: {
        input: (props: InputProps) => {
          if (isArrayOfBlocksInputProps(props) && isOneLinePortableTextInputProps(props)) {
            return <OneLinePtInput {...props} />
          }

          return props.renderDefault(props)
        },
      },
    },
  }
})

/**
 * Usage in `schemaTypes/post.ts` (or similar)
 *
 * ```ts
 * import {defineType, defineField} from 'sanity'
 * import {ptStringPreview} from 'pt-string'
 *
 * export const post = defineType({
 *   name: 'post',
 *   title: 'Post',
 *   type: 'document',
 *   fields: [
 *     defineField({
 *       name: 'title',
 *       title: 'Title',
 *       type: 'array',
 *       of: [{type: 'block'}],
 *       components: {
 *         input: OneLinePtInput,
 *       },
 *     }),
 *     // ...
 *   ],
 *   preview: ptStringPreview('title'),
 * });
 * ```
 */
export const ptStringPreview = (targetField: string): PreviewConfig => ({
  select: {
    field: targetField,
  },
  prepare(selection) {
    const title = toPlainText(selection.field)
    return {title}
  },
})
