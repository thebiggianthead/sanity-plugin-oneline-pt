import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
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
): EditorSchema {
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

  return {
    styles: [{title: 'Normal', value: 'normal'}],
    decorators: resolveEnabledDecorators(spanType),
    lists: [],
    block: blockType,
    span: spanType,
    portableText: portableTextType,
    inlineObjects: inlineObjectTypes,
    blockObjects: [],
    annotations: (spanType as SpanSchemaType).annotations,
  }
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
