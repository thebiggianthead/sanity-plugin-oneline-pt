import {useEditor} from '@portabletext/editor'
import {Card, Dialog, Portal} from '@sanity/ui'
import {isEqual, pathFor} from '@sanity/util/paths'
import {
  type Dispatch,
  type JSX,
  type ReactNode,
  RefObject,
  type SetStateAction,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import {
  type ArrayOfObjectsFormNode,
  type ArrayOfObjectsInputProps,
  type ArrayOfObjectsItemMember,
  type FieldMember,
  type FIXME,
  FormInput,
  type FormPatch,
  isArraySchemaType,
  isObjectSchemaType,
  type ObjectFormNode,
  type ObjectInputProps,
  type ObjectMember,
  type Path,
  pathToString,
  type PortableTextInputProps,
  type PortableTextMemberItem,
  type SchemaType,
  set,
} from 'sanity'

type ModalFormProps = ArrayOfObjectsInputProps & {
  editablePath: Path
  setEditablePath: Dispatch<SetStateAction<Path | null>>
}

export function ModalForm(props: ModalFormProps): JSX.Element {
  const {editablePath, setEditablePath} = props
  const path = useMemo(() => [...props.path, ...editablePath], [editablePath, props.path])
  const editor = useEditor()

  const members = usePortableTextMemberItemsFromProps(props as unknown as PortableTextInputProps)

  const openMember = useMemo(() => {
    return members.find((m) => m.key === pathToString(path))
  }, [members, path])

  const title = openMember?.node?.schemaType?.title
    ? `Edit ${openMember?.node?.schemaType?.title}`
    : 'Edit Content'

  const onClose = useCallback(() => {
    setEditablePath(null)
    editor.send({type: 'focus'})
  }, [editor, setEditablePath])

  return (
    <Portal>
      <Dialog
        header={title}
        id="dialog-edit-content"
        zOffset={1000}
        onClickOutside={onClose}
        onClose={onClose}
        width={1}
      >
        <Card paddingBottom={4} paddingTop={0} paddingX={4} radius={2}>
          {openMember?.input}
        </Card>
      </Dialog>
    </Portal>
  )
}

/**
 * Duplicates an internal function from Sanity
 *
 * Returns a flat structure of all the form member items
 * included in this Portable Text Input.
 */
function usePortableTextMemberItemsFromProps(
  props: PortableTextInputProps,
): PortableTextMemberItem[] {
  const {
    members,
    path,
    schemaType,
    renderAnnotation,
    renderField,
    renderBlock,
    renderInput,
    renderItem,
    renderInlineBlock,
    renderPreview,
    onPathFocus,
  } = props

  const portableTextMemberItemsRef: RefObject<PortableTextMemberItem[]> = useRef([])
  return useMemo(() => {
    const result: {
      kind: PortableTextMemberItem['kind']
      member: ArrayOfObjectsItemMember
      node: ObjectFormNode
    }[] = []

    for (const member of members) {
      if (member.kind === 'item') {
        const isObjectBlock = !isBlockType(member.item.schemaType)
        if (isObjectBlock) {
          result.push({kind: 'objectBlock', member, node: member.item})
        } else {
          // Also include regular text blocks with validation, presence, changes or that are open or focused.
          // This is a performance optimization to avoid accounting for blocks that
          // doesn't need to be re-rendered (which usually is most of the blocks).
          if (
            member.item.validation.length > 0 ||
            member.item.changed ||
            member.item.presence?.length ||
            member.open ||
            member.item.focusPath.length ||
            member.item.focused
          ) {
            result.push({kind: 'textBlock', member, node: member.item})
          }
          // Inline objects
          const childrenField = member.item.members.find(
            (f) => f.kind === 'field' && f.name === 'children',
          )
          if (
            childrenField &&
            childrenField.kind === 'field' &&
            isMemberArrayOfObjects(childrenField)
          ) {
            // eslint-disable-next-line max-depth
            for (const child of childrenField.field.members) {
              // eslint-disable-next-line max-depth
              if (child.kind === 'item' && child.item.schemaType.name !== 'span') {
                result.push({kind: 'inlineObject', member: child, node: child.item})
              }
            }
          }
          // Markdefs
          const markDefArrayMember = member.item.members
            .filter(isArrayOfObjectsFieldMember)
            .find((f) => f.name === 'markDefs')
          if (markDefArrayMember) {
            // eslint-disable-next-line max-depth
            for (const child of markDefArrayMember.field.members) {
              // eslint-disable-next-line max-depth
              if (child.kind === 'item' && child.item.schemaType.jsonType === 'object') {
                result.push({
                  kind: 'annotation',
                  member: child,
                  node: child.item,
                })
              }
            }
          }
        }
      }
    }

    const items: PortableTextMemberItem[] = result.map((item) => {
      const key = pathToString(item.node.path)
      const existingItem = portableTextMemberItemsRef.current.find((refItem) => refItem.key === key)
      const isObject = item.kind !== 'textBlock'
      let input: ReactNode = null

      if ((isObject && item.member !== existingItem?.member) || item.node !== existingItem?.node) {
        // No-op when calling elementProps.onFocus or calling onPathFocus with an empty focusPath
        // This is to avoid closing the editing modal as it will focus the editor element itself.
        const _elementProps = (renderInputProps: ObjectInputProps) => ({
          ...renderInputProps.elementProps,
          onFocus: () => {
            // no-op
          },
        })
        const _onPathFocus = (focusPath: Path) => {
          const fullPath = item.member.item.path.concat(focusPath)
          if (focusPath.length === 0) {
            // no-op
            return
          }
          onPathFocus(fullPath.slice(path.length, fullPath.length))
        }

        // When an Input is trying to remove itself (unset([])), we want instead to clear the values from the object,
        // but keep the object itself. This is to avoid the array input to remove the array entirely when unsetting the last item (for instance with markDefs)
        // We also want the (empty) object there in order to be able to control the closing of the object modal properly, cleaning up, normalizing through the editor etc.
        const _onChangeDisableRemoveSelf = (objectFormRenderInputProps: ObjectInputProps) => {
          return (patch: FormPatch) => {
            // Special handling for unset([]) change
            if (patch.type === 'unset' && patch.path.length === 0) {
              objectFormRenderInputProps.onChange(
                set({_type: item.member.item.schemaType.name, _key: item.member.key}, patch.path),
              )
              return
            }
            // Original onChange
            objectFormRenderInputProps.onChange(patch)
          }
        }

        // Render object Input with no-ops for setting root focus, and unsetting the object.
        const _renderInput = (renderInputProps: ObjectInputProps) => {
          const isObjectInputPath = isEqual(renderInputProps.path, item.member.item.path)
          if (isObjectInputPath) {
            return renderInput({
              ...renderInputProps,
              onChange: _onChangeDisableRemoveSelf(renderInputProps),
              onPathFocus: _onPathFocus,
              elementProps: _elementProps(renderInputProps),
            } as ObjectInputProps)
          }
          return renderInput(renderInputProps)
        }
        const inputProps = {
          absolutePath: pathFor(item.node.path),
          includeField: false,
          members,
          path: pathFor(path),
          renderAnnotation,
          renderBlock,
          renderField,
          renderInlineBlock,
          renderInput: _renderInput,
          renderItem,
          renderPreview,
          schemaType,
        }
        input = <FormInput {...(inputProps as FIXME)} />
      }

      // Update existing item
      if (existingItem) {
        existingItem.member = item.member
        existingItem.node = item.node
        existingItem.input = input || existingItem.input
        return existingItem
      }

      return {
        kind: item.kind,
        key,
        member: item.member,
        node: item.node,
        input,
      }
    })

    portableTextMemberItemsRef.current = items

    return items
  }, [
    members,
    onPathFocus,
    path,
    renderAnnotation,
    renderBlock,
    renderField,
    renderInlineBlock,
    renderInput,
    renderItem,
    renderPreview,
    schemaType,
  ])
}

/**
 * Duplicates an internal function from Sanity
 */
function isMemberArrayOfObjects(
  member: FieldMember,
): member is FieldMember<ArrayOfObjectsFormNode> {
  return (
    isArraySchemaType(member.field.schemaType) &&
    member.field.schemaType.of.every((ofType) => isObjectSchemaType(ofType))
  )
}

/**
 * Duplicates an internal function from Sanity
 */
function isBlockType(type: SchemaType): boolean {
  if (type.type) {
    return isBlockType(type.type)
  }

  return type.name === 'block'
}

/**
 * Duplicates an internal function from Sanity
 */
function isArrayOfObjectsFieldMember(
  member: ObjectMember,
): member is FieldMember<ArrayOfObjectsFormNode> {
  return member.kind === 'field' && member.field.schemaType.jsonType === 'array'
}
