import {
  type PortableTextMemberSchemaTypes,
  useEditor,
  useEditorSelector,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {
  BoldIcon,
  CodeIcon,
  EllipsisVerticalIcon as MenuIcon,
  type IconComponent,
  InlineElementIcon,
  ItalicIcon,
  LinkIcon,
  StrikethroughIcon,
  UnderlineIcon,
  UnknownIcon,
} from '@sanity/icons'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  Text,
  Tooltip,
  TooltipDelayGroupProvider,
  useMediaIndex,
} from '@sanity/ui'
import {Dispatch, type JSX, SetStateAction, useCallback, useId, useMemo} from 'react'
import {type Path} from 'sanity'

const iconMap: Record<string, IconComponent> = {
  strong: BoldIcon,
  em: ItalicIcon,
  code: CodeIcon,
  underline: UnderlineIcon,
  'strike-through': StrikethroughIcon,
  link: LinkIcon,
}

const MOBILE_BUTTON_LIMIT = 2
const DESKTOP_BUTTON_LIMIT = 5

export function Toolbar({
  setEditablePath,
}: {
  setEditablePath: Dispatch<SetStateAction<Path | null>>
}): JSX.Element {
  const editor = useEditor()
  const currentSchema = editor.getSnapshot().context.schema
  const mediaIndex = useMediaIndex()
  const menuId = useId()

  const isMobile = mediaIndex < 2
  const decorators = currentSchema.decorators
  const annotations = currentSchema.annotations
  const inlineObjects = currentSchema.inlineObjects
  const buttonLimit = isMobile ? MOBILE_BUTTON_LIMIT : DESKTOP_BUTTON_LIMIT

  const mainDecorators = useMemo(() => {
    return decorators.slice(0, buttonLimit)
  }, [decorators, buttonLimit])
  const overflowDecorators = useMemo(() => {
    return decorators.slice(buttonLimit)
  }, [decorators, buttonLimit])
  const mainAnnotations = useMemo(() => {
    return annotations.slice(0, buttonLimit - mainDecorators.length)
  }, [annotations, buttonLimit, mainDecorators.length])
  const overflowAnnotations = useMemo(() => {
    return annotations.slice(buttonLimit - mainDecorators.length)
  }, [annotations, buttonLimit, mainDecorators.length])
  const mainInlineObjects = useMemo(() => {
    return inlineObjects.slice(0, buttonLimit - mainDecorators.length - mainAnnotations.length)
  }, [inlineObjects, buttonLimit, mainDecorators.length, mainAnnotations.length])
  const overflowInlineObjects = useMemo(() => {
    return inlineObjects.slice(buttonLimit - mainDecorators.length - mainAnnotations.length)
  }, [inlineObjects, buttonLimit, mainDecorators.length, mainAnnotations.length])

  const showMenuButton = decorators.length + annotations.length > buttonLimit

  return (
    <Flex gap={1} wrap="wrap">
      <TooltipDelayGroupProvider delay={{open: 400}}>
        {mainDecorators.map((decorator) => (
          <DecoratorInsert decorator={decorator} key={decorator.value} />
        ))}
        {mainAnnotations.map((annotation) => (
          <AnnotationInsert annotation={annotation} key={annotation.name} />
        ))}
        {mainInlineObjects.map((inlineObject) => (
          <InlineObjectInsert
            inlineObject={inlineObject}
            key={inlineObject.name}
            setEditablePath={setEditablePath}
          />
        ))}
      </TooltipDelayGroupProvider>

      {showMenuButton && (
        <MenuButton
          id={menuId}
          button={<Button mode="bleed" padding={2} icon={MenuIcon} />}
          menu={
            <Menu>
              {overflowDecorators.map((decorator) => (
                <DecoratorInsert decorator={decorator} key={decorator.value} isMenu />
              ))}
              {overflowAnnotations.map((annotation) => (
                <AnnotationInsert annotation={annotation} key={annotation.name} isMenu />
              ))}
              {overflowInlineObjects.map((inlineObject) => (
                <InlineObjectInsert
                  inlineObject={inlineObject}
                  key={inlineObject.name}
                  setEditablePath={setEditablePath}
                  isMenu
                />
              ))}
            </Menu>
          }
        />
      )}
    </Flex>
  )
}

function DecoratorInsert(props: {
  decorator: PortableTextMemberSchemaTypes['decorators'][0]
  isMenu?: boolean
}) {
  const editor = useEditor()
  const {decorator, isMenu} = props

  const active = useEditorSelector(editor, selectors.isActiveDecorator(decorator.value))
  const Icon = props.decorator.icon ? props.decorator.icon : iconMap[props.decorator.value]

  const handleDecoratorClick = useCallback(() => {
    editor.send({
      type: 'decorator.toggle',
      decorator: decorator.value,
    })
    editor.send({
      type: 'focus',
    })
  }, [decorator.value, editor])

  if (isMenu) {
    return (
      <MenuItem
        text={decorator.title}
        icon={Icon || iconMap[decorator.value]}
        onClick={handleDecoratorClick}
        tone={active ? 'neutral' : 'default'}
        pressed={active}
      />
    )
  }

  return (
    <Tooltip animate content={<Text size={1}>{decorator.title}</Text>} placement="top" portal>
      <Button
        mode="bleed"
        padding={2}
        selected={active}
        text={Icon ? undefined : decorator.title}
        icon={Icon}
        onClick={handleDecoratorClick}
      />
    </Tooltip>
  )
}

function AnnotationInsert(props: {
  annotation: PortableTextMemberSchemaTypes['annotations'][0]
  isMenu?: boolean
}) {
  const editor = useEditor()
  const {annotation, isMenu} = props
  const active = useEditorSelector(editor, selectors.isActiveAnnotation(annotation.name))
  const Icon = annotation.icon ?? iconMap[props.annotation.name] ?? UnknownIcon

  const handleAnnotationClick = useCallback(() => {
    if (active) {
      editor.send({
        type: 'annotation.remove',
        annotation: {
          name: annotation.name,
        },
      })
    } else {
      editor.send({
        type: 'annotation.add',
        annotation: {
          name: annotation.name,
          value: {},
        },
      })
    }
    editor.send({
      type: 'focus',
    })
  }, [active, annotation.name, editor])

  if (isMenu) {
    return (
      <MenuItem
        text={annotation.title}
        icon={Icon}
        onClick={handleAnnotationClick}
        tone={active ? 'neutral' : 'default'}
        pressed={active}
      />
    )
  }

  return (
    <Tooltip animate content={<Text size={1}>{annotation.title}</Text>} placement="top" portal>
      <Button
        mode="bleed"
        padding={2}
        selected={active}
        text={Icon ? undefined : annotation.title}
        icon={Icon}
        onClick={handleAnnotationClick}
      />
    </Tooltip>
  )
}

function InlineObjectInsert(props: {
  inlineObject: PortableTextMemberSchemaTypes['inlineObjects'][0]
  isMenu?: boolean
  setEditablePath: Dispatch<SetStateAction<Path | null>>
}) {
  const editor = useEditor()
  const {inlineObject, isMenu, setEditablePath} = props
  const Icon = inlineObject.icon ?? iconMap[props.inlineObject.name] ?? InlineElementIcon

  const handleInlineObjectClick = useCallback(() => {
    editor.send({
      type: 'insert.inline object',
      inlineObject: {
        name: props.inlineObject.name,
        value: {},
      },
    })
    const path = editor.getSnapshot().context.selection?.anchor.path
    setEditablePath(path ?? null)
  }, [editor, props.inlineObject.name, setEditablePath])

  if (isMenu) {
    return (
      <MenuItem
        text={inlineObject.title}
        icon={Icon}
        onClick={handleInlineObjectClick}
        tone={'default'}
      />
    )
  }

  return (
    <Tooltip animate content={<Text size={1}>{inlineObject.title}</Text>} placement="top" portal>
      <Button
        mode="bleed"
        padding={2}
        text={Icon ? undefined : inlineObject.title}
        icon={Icon}
        onClick={handleInlineObjectClick}
      />
    </Tooltip>
  )
}
