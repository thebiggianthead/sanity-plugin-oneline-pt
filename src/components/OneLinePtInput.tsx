import {
  EditorEmittedEvent,
  EditorProvider,
  PortableTextEditable,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderPlaceholderFunction,
} from '@portabletext/editor'
import {EventListenerPlugin, MarkdownPlugin, OneLinePlugin} from '@portabletext/editor/plugins'
import {Box, Card, Flex, PortalProvider, ThemeProvider, usePortal, useToast} from '@sanity/ui'
import {type JSX, useCallback, useMemo, useState} from 'react'
import {
  type ArrayDefinition,
  type ArrayOfObjectsInputProps,
  type ArrayOfType,
  type BlockAnnotationDefinition,
  type BlockDefinition,
  ChangeIndicator,
  type Path,
  type PortableTextBlock,
  type PortableTextInputProps,
  useConnectionState,
} from 'sanity'
import {useDocumentPane} from 'sanity/structure'
import styled from 'styled-components'
import {decoratorMap, annotationMap} from './defaultPreviews'
import {Annotation} from './Annotation'
import {toFormPatches} from '../utils'
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

  [role='textbox'] {
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

export function OneLinePtInput(props: PortableTextInputProps): JSX.Element {
  const {elementProps, value = EMPTY_ARRAY, path, readOnly, changed, schemaType, onChange} = props

  const toast = useToast()
  const {editState, documentId, documentType} = useDocumentPane()
  const connectionState = useConnectionState(documentId, documentType)
  const ready = useMemo(() => {
    return connectionState === 'connected' && editState?.ready
  }, [connectionState, editState])
  const [editablePath, setEditablePath] = useState<Path | null>(null)
  const [hasFocusWithin, setHasFocusWithin] = useState(false)

  // When the editor emits an event, update the form value
  const handleEditorChange = useCallback(
    (event: EditorEmittedEvent) => {
      switch (event.type) {
        case 'mutation':
          onChange(toFormPatches(event.patches))
          break
        case 'focused':
          setHasFocusWithin(true)
          break
        case 'blurred':
          setHasFocusWithin(false)
          break
        case 'error':
          toast.push({
            status: 'error',
            description: event.description,
          })
          break
        default:
      }
    },
    [onChange, toast],
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

  const buttonCount = 2

  return (
    <ThemeProvider>
      <ChangeIndicator path={path} isChanged={changed} readOnly={!ready || readOnly} hasFocus>
        <EditorProvider
          initialConfig={{
            readOnly: !ready || readOnly,
            initialValue: value as PortableTextBlock[],
            schema: schemaType,
          }}
        >
          {/* <PortalProvider __unstable_elements={portalElements} element={portal.element}>
            <div data-portal="" ref={setPortalElement} />
            {editablePath && (
              <ModalForm
                {...props}
                editablePath={editablePath}
                setEditablePath={setEditablePath}
                title={`Edit ${
                  (editorSchema?.of?.[0] as BlockDefinition)?.of?.find(
                    (type) => type.name === editablePath[editablePath.length - 2],
                  )?.title || ''
                }`}
              />
            )} */}
          <EventListenerPlugin on={handleEditorChange} />
          {/* <OneLinePlugin />
          <MarkdownPlugin
            config={{
              boldDecorator: ({schema}) =>
                schema.decorators.find((decorator) => decorator.value === 'strong')?.value,
              codeDecorator: ({schema}) =>
                schema.decorators.find((decorator) => decorator.value === 'code')?.value,
              italicDecorator: ({schema}) =>
                schema.decorators.find((decorator) => decorator.value === 'em')?.value,
              strikeThroughDecorator: ({schema}) =>
                schema.decorators.find((decorator) => decorator.value === 'strike-through')?.value,
              defaultStyle: ({schema}) =>
                schema.styles.find((style) => style.value === 'normal')?.value,
            }}
          /> */}
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
                  // renderChild={renderInlineBlock}
                  renderPlaceholder={renderPlaceholder}
                  readOnly={!ready || readOnly}
                  {...elementProps}
                />
              </Box>
              <Toolbar />
            </Flex>
          </InputWrapper>
          {/* </PortalProvider> */}
        </EditorProvider>
      </ChangeIndicator>
    </ThemeProvider>
  )
}
