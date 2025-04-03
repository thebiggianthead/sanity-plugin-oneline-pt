import {BlockAnnotationRenderProps, useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {EditIcon, TrashIcon} from '@sanity/icons'
import {Box, Button, Flex, Popover, Text} from '@sanity/ui'
import {cloneDeep} from 'lodash'
import {
  type Dispatch,
  type JSX,
  type ReactElement,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {KeyedObject, type Path, pathToString, PortableTextObject} from 'sanity'

type AnnotationProps = BlockAnnotationRenderProps & {
  annotationPath: Path
  children: ReactElement
  hasFocusWithin: boolean
  setEditablePath: Dispatch<SetStateAction<Path | null>>
}

export function Annotation(props: AnnotationProps): JSX.Element {
  const {annotationPath, hasFocusWithin, setEditablePath, children, ...annotationProps} = props

  const editor = useEditor()
  const selectedSpan = useEditorSelector(editor, selectors.getFocusSpan)
  const selectedBlock = useEditorSelector(editor, selectors.getFocusBlock)
  const spanType = (selectedBlock?.node.markDefs as PortableTextObject[])?.find(
    (markDef) => markDef._key === selectedSpan?.node?.marks?.[0],
  )?._type
  const annotationSchema =
    spanType &&
    editor
      .getSnapshot()
      .context.schema.annotations.find((annotation) => annotation.name === spanType)

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
      selectedSpan?.path &&
      pathToString(annotationPath) === pathToString(selectedSpan?.path)
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
  }, [annotationPath, selectedSpan, hasFocusWithin])

  editor.on('blurred', () => {
    setTimeout(() => {
      setOpen(false)
    }, 150)
  })

  const handleRemoveButtonClicked = useCallback(() => {
    if (annotationSchema && annotationSchema?.name) {
      editor.send({
        type: 'annotation.remove',
        annotation: {
          name: annotationSchema?.name,
        },
      })
    }
    editor.send({type: 'focus'})
  }, [annotationSchema, editor])

  const handleEditButtonClicked = useCallback(() => {
    const markDefPath = cloneDeep(annotationPath)
    const lastIndex = markDefPath.lastIndexOf('children')
    if (lastIndex !== -1) {
      markDefPath[lastIndex] = 'markDefs' // Replace "children" with "markDefs" in the final instance
    }
    // Check if the last item is an object with a `_key` property
    // and replace it with the value _key instead
    if (
      markDefPath.length > 0 &&
      typeof markDefPath[markDefPath.length - 1] === 'object' &&
      '_key' in (markDefPath[markDefPath.length - 1] as KeyedObject)
    ) {
      ;(markDefPath[markDefPath.length - 1] as KeyedObject)._key = annotationProps?.value?._key // Replace the `_key` value
    }
    setOpen(false)
    setEditablePath(markDefPath)
  }, [annotationPath, annotationProps?.value?._key, setEditablePath])

  return (
    <Popover
      content={
        <Box padding={1} data-testid="annotation-toolbar-popover">
          <Flex gap={1}>
            <Box padding={2}>
              <Text weight="medium" size={1}>
                {(annotationSchema && annotationSchema?.title) || 'Edit Annotation'}
              </Text>
            </Box>
            <Button
              aria-label={'Edit Annotation'}
              data-testid="edit-annotation-button"
              icon={EditIcon}
              mode="bleed"
              onClick={handleEditButtonClicked}
              tabIndex={0}
              padding={2}
            />
            <Button
              aria-label={'Remove Annotation'}
              data-testid="remove-annotation-button"
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
      {children}
    </Popover>
  )
}
