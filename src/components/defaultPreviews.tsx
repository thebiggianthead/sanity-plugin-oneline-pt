import {BlockAnnotationRenderProps, BlockDecoratorRenderProps} from '@portabletext/editor'
import {JSX} from 'react'
import styled from 'styled-components'

const Strong = styled.strong`
  font-weight: 700 !important;
`

const Code = styled.code`
  mix-blend-mode: ${(props) => (props.theme.sanity?.color.dark ? 'screen' : 'multiply')};
  color: inherit;
  background: var(--card-code-bg-color);
`

const Link = styled.span`
  color: ${(props) => props.theme.sanity?.color.selectable?.primary.enabled.fg};
  border-bottom: 1px solid ${(props) => props.theme.sanity?.color.selectable?.primary.enabled.fg};
  display: inline-block;
`

const Annotation = styled.span`
  border-bottom: 1px dashed ${(props) => props.theme.sanity?.color.selectable?.primary.enabled.fg};
  display: inline-block;
`

export const decoratorMap: Map<string, (props: BlockDecoratorRenderProps) => JSX.Element> = new Map(
  [
    ['strong', (props) => <Strong>{props.children}</Strong>],
    ['em', (props) => <em>{props.children}</em>],
    ['code', (props) => <Code>{props.children}</Code>],
    ['underline', (props) => <span style={{textDecoration: 'underline'}}>{props.children}</span>],
    [
      'strike-through',
      (props) => <span style={{textDecorationLine: 'line-through'}}>{props.children}</span>,
    ],
  ],
)

export const annotationMap: Map<string, (props: BlockAnnotationRenderProps) => JSX.Element> =
  new Map([
    ['link', (props) => <Link>{props.children}</Link>],
    ['default', (props) => <Annotation>{props.children}</Annotation>],
  ])
