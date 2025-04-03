import {type Patch} from '@portabletext/editor'
import {FormPatch, type PortableTextTextBlock, SANITY_PATCH_TYPE} from 'sanity'

export function toPlainText(blocks?: PortableTextTextBlock[]): string | undefined {
  if (!blocks) return undefined
  return (
    blocks
      // loop through each block
      ?.map((block) => {
        // if it's not a text block with children,
        // return nothing
        if (block._type !== 'block' || !block.children) {
          return ''
        }
        // loop through the children spans, and join the
        // text strings
        return block.children.map((child) => child.text).join('')
      })
      // join the paragraphs leaving split by two linebreaks
      .join('\n\n')
  )
}

export function toFormPatches(patches: Patch[]): FormPatch[] {
  return patches.map((p: Patch) => ({...p, patchType: SANITY_PATCH_TYPE}) as FormPatch)
}
