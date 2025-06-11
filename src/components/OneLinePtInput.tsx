import {
  type EditorChange,
  type EditorEmittedEvent,
  EditorProvider,
  PortableTextEditable,
  type RenderAnnotationFunction,
  type RenderChildFunction,
  type RenderDecoratorFunction,
  type RenderPlaceholderFunction,
  useEditor,
} from '@portabletext/editor'
import {defineBehavior} from '@portabletext/editor/behaviors'
import {BehaviorPlugin, EventListenerPlugin} from '@portabletext/editor/plugins'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {OneLinePlugin} from '@portabletext/plugin-one-line'
import {
  Box,
  Card,
  Flex,
  PortalProvider,
  Stack,
  ThemeProvider,
  usePortal,
  useToast,
} from '@sanity/ui'
import {type JSX, useCallback, useEffect, useMemo, useState} from 'react'
import {
  type ArrayOfObjectsInputProps,
  ChangeIndicator,
  type Path,
  type PortableTextBlock,
  type PortableTextInputProps,
  useConnectionState,
} from 'sanity'
import {useDocumentPane} from 'sanity/structure'
import styled from 'styled-components'

import {toFormPatches} from '../utils'
import {createEditorSchema} from '../utils/schema'
import {Annotation} from './Annotation'
import {annotationMap, decoratorMap} from './defaultPreviews'
import {InlineBlock} from './InlineBlock'
import {MergeButton} from './MergeButton'
import {ModalForm} from './ModalForm'
import {Toolbar} from './Toolbar'

const EMPTY_ARRAY: [] = []

const InputWrapper = styled(Card)`
  position: relative;
  overflow: hidden;
  font-size: ${(props) => `${props.theme.sanity.fonts.text.sizes[2].fontSize}px`};
  cursor: text;

  &:focus-within {
    box-shadow: 0 0 0 1px var(--card-focus-ring-color);

    div {
      outline: none;
    }
  }

  [role='textbox'],
  .pt-editable {
    white-space: pre !important;
    overflow-x: auto;
    /* hide scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
`

const Placeholder = styled('div')`
  color: ${(props) => props.theme.sanity.color.input.default.enabled.placeholder};
`

/**
 * Custom PTE plugin that translates `EditorEmittedEvent`s to `EditorChange`s
 */
function EditorChangePlugin(props: {onChange: (change: EditorChange) => void}) {
  const handleEditorEvent = useCallback(
    (event: EditorEmittedEvent) => {
      switch (event.type) {
        case 'blurred':
          props.onChange({
            type: 'blur',
            event: event.event,
          })
          break
        case 'error':
          props.onChange({
            type: 'error',
            name: event.name,
            level: 'warning',
            description: event.description,
          })
          break
        case 'focused':
          props.onChange({
            type: 'focus',
            event: event.event,
          })
          break
        case 'loading':
          props.onChange({
            type: 'loading',
            isLoading: true,
          })
          break
        case 'done loading':
          props.onChange({
            type: 'loading',
            isLoading: false,
          })
          break
        case 'invalid value':
          props.onChange({
            type: 'invalidValue',
            resolution: event.resolution,
            value: event.value,
          })
          break
        case 'mutation':
          props.onChange(event)
          break
        case 'patch': {
          props.onChange(event)
          break
        }
        case 'ready':
          props.onChange(event)
          break
        case 'selection': {
          props.onChange(event)
          break
        }
        case 'value changed':
          props.onChange({
            type: 'value',
            value: event.value,
          })
          break
        default:
      }
    },
    [props],
  )

  return <EventListenerPlugin on={handleEditorEvent} />
}

export function OneLinePtInput(props: ArrayOfObjectsInputProps): JSX.Element {
  const {elementProps, value = EMPTY_ARRAY, path, readOnly, changed, schemaType, onChange} = props

  const toast = useToast()
  const {editState, documentId, documentType} = useDocumentPane()
  const connectionState = useConnectionState(documentId, documentType)
  const portal = usePortal()
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null)
  const portalElements = useMemo(
    () => ({
      default: portal.element,
      editor: portalElement,
    }),

    [portal.element, portalElement],
  )
  const ready = useMemo(() => {
    return connectionState === 'connected' && editState?.ready
  }, [connectionState, editState])
  const [editablePath, setEditablePath] = useState<Path | null>(null)
  const [hasFocusWithin, setHasFocusWithin] = useState(false)

  const editorSchema = useMemo(
    () => createEditorSchema(schemaType as PortableTextInputProps['schemaType']),
    [schemaType],
  )

  // When the editor emits an event, update the form value
  const handleEditorChange = useCallback(
    (change: EditorChange) => {
      switch (change.type) {
        case 'mutation':
          onChange(toFormPatches(change.patches))
          break
        case 'focus':
          setHasFocusWithin(true)
          break
        case 'blur':
          setHasFocusWithin(false)
          break
        case 'error':
          toast.push({
            status: change.level,
            description: change.description,
          })
          break
        default:
      }
    },
    [onChange, toast, toFormPatches],
  )

  // Render a placeholder when the editor is empty
  const renderPlaceholder: RenderPlaceholderFunction = useCallback(() => {
    return <Placeholder>Empty</Placeholder>
  }, [])

  // Render custom decorators or use the default ones
  const renderDecorator: RenderDecoratorFunction = useCallback((decoratorProps) => {
    const CustomDecoratorComponent = decoratorProps.schemaType.component
    if (CustomDecoratorComponent) return <CustomDecoratorComponent {...decoratorProps} />
    return (decoratorMap.get(decoratorProps.value) ?? ((dProps) => dProps.children))(decoratorProps)
  }, [])

  // Render custom annotations or use the default ones
  const renderAnnotation: RenderAnnotationFunction = useCallback(
    (annotationProps) => {
      const CustomAnnotationComponent = annotationProps.schemaType.components?.preview
      const DefaultAnnotationComponent = (
        (annotationMap.get(annotationProps.schemaType.name) || annotationMap.get('default')) ??
        ((aProps) => aProps.children)
      )(annotationProps)

      return (
        <Annotation
          annotationPath={annotationProps?.path}
          setEditablePath={setEditablePath}
          hasFocusWithin={hasFocusWithin}
          {...annotationProps}
        >
          {CustomAnnotationComponent ? (
            <CustomAnnotationComponent {...annotationProps} />
          ) : (
            DefaultAnnotationComponent
          )}
        </Annotation>
      )
    },
    [hasFocusWithin],
  )

  // Render custom inline blocks or use the default ones
  const renderInlineBlock: RenderChildFunction = useCallback(
    (inlineBlockProps) => {
      const isInlineBlockFromSchema = editorSchema.inlineObjects?.find(
        (type) => type.name === inlineBlockProps.schemaType.name,
      )

      // If it's not from our schema, just render the children
      if (!isInlineBlockFromSchema) {
        return inlineBlockProps.children
      }

      return (
        <InlineBlock
          inlineBlockPath={inlineBlockProps?.path}
          setEditablePath={setEditablePath}
          hasFocusWithin={hasFocusWithin}
          {...inlineBlockProps}
          renderPreview={props.renderPreview}
        />
      )
    },
    [editorSchema.inlineObjects, hasFocusWithin, props.renderPreview],
  )

  const buttonCount =
    (editorSchema.decorators?.length || 0) +
    (editorSchema.annotations?.length || 0) +
    (editorSchema.inlineObjects?.length || 0)

  const tooManyBlocks = value.length > 1

  return (
    <ThemeProvider>
      <ChangeIndicator path={path} isChanged={changed} readOnly={!ready || readOnly} hasFocus>
        <EditorProvider
          initialConfig={{
            readOnly: !ready || !!readOnly,
            initialValue: value as PortableTextBlock[],
            schema: editorSchema.portableText,
          }}
        >
          <PortalProvider __unstable_elements={portalElements} element={portal.element}>
            <div data-portal="" ref={setPortalElement} />
            {editablePath && (
              <ModalForm {...props} editablePath={editablePath} setEditablePath={setEditablePath} />
            )}
            <Stack space={2}>
              <InputWrapper
                shadow={1}
                paddingY={buttonCount ? 1 : 2}
                paddingRight={1}
                paddingLeft={3}
                radius={2}
                tone={!ready || readOnly ? 'transparent' : 'default'}
              >
                <Flex gap={1} align="center">
                  <Box flex={1} overflow={'auto'} height="fill">
                    <PortableTextEditable
                      renderAnnotation={renderAnnotation}
                      renderDecorator={renderDecorator}
                      renderChild={renderInlineBlock}
                      renderPlaceholder={renderPlaceholder}
                      readOnly={!ready || readOnly}
                      {...elementProps}
                    />
                    <EditorChangePlugin onChange={handleEditorChange} />
                    <OneLinePlugin />
                    <BehaviorPlugin
                      behaviors={[
                        defineBehavior({
                          on: 'insert.soft break',
                          actions: [],
                        }),
                      ]}
                    />
                    <UpdateReadOnlyPlugin readOnly={readOnly || !ready} />
                    <UpdateValuePlugin value={value as PortableTextBlock[]} />
                    <MarkdownShortcutsPlugin
                      boldDecorator={({schema}) =>
                        schema.decorators.find((d) => d.name === 'strong')?.name
                      }
                      codeDecorator={({schema}) =>
                        schema.decorators.find((d) => d.name === 'code')?.name
                      }
                      italicDecorator={({schema}) =>
                        schema.decorators.find((d) => d.name === 'em')?.name
                      }
                      strikeThroughDecorator={({schema}) =>
                        schema.decorators.find((d) => d.name === 'strike-through')?.name
                      }
                      defaultStyle={({schema}) =>
                        schema.styles.find((s) => s.name === 'normal')?.name
                      }
                    />
                  </Box>
                  <Toolbar editorSchema={editorSchema} setEditablePath={setEditablePath} />
                </Flex>
              </InputWrapper>
              {tooManyBlocks && <MergeButton />}
            </Stack>
          </PortalProvider>
        </EditorProvider>
      </ChangeIndicator>
    </ThemeProvider>
  )
}

/**
 * Duplicates an internal function from Sanity
 *
 * `EditorProvider` doesn't have a `value` prop. Instead, this custom PTE
 * plugin listens for the prop change and sends an `update value` event to the
 * editor.
 */
function UpdateValuePlugin(props: {value: Array<PortableTextBlock> | undefined}) {
  const editor = useEditor()

  useEffect(() => {
    editor.send({
      type: 'update value',
      value: props.value,
    })
  }, [editor, props.value])

  return null
}

/**
 * Duplicates an internal function from Sanity
 *
 * `EditorProvider` doesn't have a `readOnly` prop. Instead, this custom PTE
 * plugin listens for the prop change and sends a `toggle readOnly` event to
 * the editor.
 */
function UpdateReadOnlyPlugin(props: {readOnly: boolean}) {
  const editor = useEditor()

  useEffect(() => {
    editor.send({
      type: 'update readOnly',
      readOnly: props.readOnly,
    })
  }, [editor, props.readOnly])

  return null
}
