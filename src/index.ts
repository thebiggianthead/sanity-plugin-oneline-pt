import {PreviewConfig} from 'sanity'

import {toPlainText} from './utils'

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
 *   ],
 * });
 * ```
 */
export {OneLinePtInput} from './components/OneLinePtInput'

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
