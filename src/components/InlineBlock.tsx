import {BlockChildRenderProps, useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {EditIcon, TrashIcon} from '@sanity/icons'
import {Box, Button, Flex, Popover, Text} from '@sanity/ui'
import {cloneDeep} from 'lodash'
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {type KeyedObject, type Path, pathToString, RenderPreviewCallback} from 'sanity'
import styled from 'styled-components'

import {Root} from './InlineBlock.styles'

// Styled component for the inline block wrapper to match Sanity Studio's styling
export const PreviewSpan = styled.span`
  display: block;
  max-width: calc(5em + 80px);
  position: relative;
`

type InlineBlockProps = BlockChildRenderProps & {
  inlineBlockPath: Path
  hasFocusWithin: boolean
  setEditablePath: Dispatch<SetStateAction<Path | null>>
  renderPreview: RenderPreviewCallback
}

export function InlineBlock(props: InlineBlockProps): JSX.Element {
  const {inlineBlockPath, hasFocusWithin, setEditablePath, renderPreview, ...inlineBlockProps} =
    props

  const editor = useEditor()
  const selectedBlock = useEditorSelector(editor, selectors.getFocusChild)

  const [open, setOpen] = useState(false)
  const [cursorRect, setCursorRect] = useState<DOMRect | null>(null)

  const cursorElement = useMemo(() => {
    if (!cursorRect) {
      return null
    }
    return {
      getBoundingClientRect: () => {
        return cursorRect
      },
    }
  }, [cursorRect]) as HTMLElement

  useEffect(() => {
    if (
      hasFocusWithin &&
      selectedBlock?.path &&
      pathToString(inlineBlockPath) === pathToString(selectedBlock?.path)
    ) {
      setOpen(true)
      const sel = window.getSelection()

      if (!sel || sel.rangeCount === 0) return

      const range = sel.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      if (rect) {
        setCursorRect(rect)
      }
    } else if (hasFocusWithin) {
      setOpen(false)
    }
  }, [inlineBlockPath, selectedBlock, setEditablePath, hasFocusWithin])

  editor.on('blurred', () => {
    setTimeout(() => {
      setOpen(false)
    }, 150)
  })

  const handleRemoveButtonClicked = useCallback(() => {
    if (selectedBlock) {
      editor.send({
        type: 'delete',
        selection: {
          anchor: {
            path: selectedBlock.path,
            offset: 0,
          },
          focus: {
            path: selectedBlock.path,
            offset: 0,
          },
        },
      })
    }
    editor.send({type: 'focus'})
  }, [editor, selectedBlock])

  const handleEditButtonClicked = useCallback(() => {
    const inlineBlockPathCopy = cloneDeep(inlineBlockPath)

    // Check if the last item is an object with a `_key` property
    // and replace it with the value _key instead
    if (
      inlineBlockPathCopy.length > 0 &&
      typeof inlineBlockPathCopy[inlineBlockPathCopy.length - 1] === 'object' &&
      '_key' in (inlineBlockPathCopy[inlineBlockPathCopy.length - 1] as KeyedObject)
    ) {
      ;(inlineBlockPathCopy[inlineBlockPathCopy.length - 1] as KeyedObject)._key =
        inlineBlockProps?.value?._key
    }

    setOpen(false)
    setEditablePath(inlineBlockPathCopy)
  }, [inlineBlockPath, inlineBlockProps?.value?._key, setEditablePath])

  const blockPreview = useMemo(() => {
    return renderPreview({
      layout: 'inline',
      schemaType: inlineBlockProps.schemaType,
      skipVisibilityCheck: true,
      value: inlineBlockProps.value,
      fallbackTitle: 'Click to edit',
    })
  }, [inlineBlockProps.schemaType, inlineBlockProps.value, renderPreview])

  // Wrap the children in our styled wrapper
  const wrappedChildren = (
    <Root>
      <PreviewSpan>{blockPreview}</PreviewSpan>
    </Root>
  )

  return (
    <Popover
      content={
        <Box padding={1} data-testid="inline-block-toolbar-popover">
          <Flex gap={1}>
            <Box padding={2}>
              <Text weight="medium" size={1}>
                {inlineBlockProps?.schemaType?.title || 'Edit Inline Block'}
              </Text>
            </Box>
            <Button
              aria-label={'Edit Inline Block'}
              data-testid="edit-inline-block-button"
              icon={EditIcon}
              mode="bleed"
              onClick={handleEditButtonClicked}
              tabIndex={0}
              padding={2}
            />
            <Button
              aria-label={'Remove Inline Block'}
              data-testid="remove-inline-block-button"
              icon={TrashIcon}
              mode="bleed"
              onClick={handleRemoveButtonClicked}
              tabIndex={0}
              tone="critical"
              padding={2}
            />
          </Flex>
        </Box>
      }
      constrainSize
      placement="top"
      portal="editor"
      preventOverflow
      open={open}
      referenceElement={cursorElement}
      scheme="dark"
    >
      {wrappedChildren}
    </Popover>
  )
}
