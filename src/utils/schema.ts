import type {PortableTextBlock, PortableTextMemberSchemaTypes} from '@portabletext/editor'
import {
  type ArrayOfObjectsInputProps,
  type ArraySchemaType,
  type BlockSchemaType,
  isArraySchemaType,
  isBlockSchemaType,
  type ObjectSchemaType,
  type SchemaType,
  type SpanSchemaType,
} from 'sanity'

export function createEditorSchema(
  portableTextType: ArraySchemaType<PortableTextBlock>,
): PortableTextMemberSchemaTypes {
  if (!portableTextType) {
    throw new Error("Parameter 'portabletextType' missing (required)")
  }
  const blockType = portableTextType.of?.find(findBlockType) as BlockSchemaType | undefined
  if (!blockType) {
    throw new Error('Block type is not defined in this schema (required)')
  }

  const childrenField = blockType.fields?.find((field) => field.name === 'children') as
    | {type: ArraySchemaType}
    | undefined
  if (!childrenField) {
    throw new Error('Children field for block type found in schema (required)')
  }
  const ofType = childrenField.type.of
  if (!ofType) {
    throw new Error('Valid types for block children not found in schema (required)')
  }
  const spanType = ofType.find((memberType) => memberType.name === 'span') as
    | ObjectSchemaType
    | undefined
  if (!spanType) {
    throw new Error('Span type not found in schema (required)')
  }
  const inlineObjectTypes = (ofType.filter((memberType) => memberType.name !== 'span') ||
    []) as ObjectSchemaType[]

  const filteredPortableTextType = {
    ...portableTextType,
    of: portableTextType.of?.filter((field) => field.name === blockType.name) || [],
  }

  return {
    styles: resolveStyles(blockType),
    decorators: resolveEnabledDecorators(spanType),
    lists: removeLists(blockType),
    block: blockType,
    span: spanType,
    portableText: filteredPortableTextType,
    inlineObjects: inlineObjectTypes,
    blockObjects: [],
    annotations: (spanType as SpanSchemaType).annotations,
  }
}

function resolveStyles(blockType: ObjectSchemaType) {
  const styleField = blockType.fields?.find((btField) => btField.name === 'style')
  if (!styleField) {
    throw new Error("A field with name 'style' is not defined in the block type (required).")
  }

  if (styleField?.type?.options) {
    styleField.type.options.list = [{title: 'Normal', value: 'normal'}]
  }

  return styleField.type.options?.list ?? []
}

function removeLists(blockType: ObjectSchemaType) {
  // make sure the list type is empty
  const listField = blockType.fields?.find((btField) => btField.name === 'listItem')
  if (!listField) {
    throw new Error("A field with name 'listItem' is not defined in the block type (required).")
  }
  if (listField?.type?.options) {
    listField.type.options.list = []
  }

  return listField.type.options?.list ?? []
}

function resolveEnabledDecorators(spanType: ObjectSchemaType) {
  return (spanType as SpanSchemaType).decorators ?? []
}

function findBlockType(type: SchemaType): BlockSchemaType | null {
  if (type.type) {
    return findBlockType(type.type)
  }

  if (type.name === 'block') {
    return type as BlockSchemaType
  }

  return null
}

export function isOneLinePortableTextInputProps(props: ArrayOfObjectsInputProps): boolean {
  const type = props.schemaType
  const blockType =
    isArraySchemaType(type) && type.of.find((memberType) => isBlockSchemaType(memberType))

  if (!blockType) {
    return false
  }

  return !!blockType?.options?.oneLine
}
