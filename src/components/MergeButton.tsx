import {useEditor} from '@portabletext/editor'
import {isTextBlock, mergeTextBlocks} from '@portabletext/editor/utils'
import {Button, Card, Flex, Text} from '@sanity/ui'
import {type JSX, useCallback} from 'react'

export function MergeButton(): JSX.Element {
  const editor = useEditor()

  const handleMerge = useCallback(() => {
    const context = editor.getSnapshot().context

    const mergedBlock = editor
      .getSnapshot()
      .context.value.filter((block) => isTextBlock(context, block))
      .reduce((targetBlock, incomingBlock) => {
        return mergeTextBlocks({
          context: context,
          targetBlock,
          incomingBlock,
        })
      })

    editor.send({
      type: 'update value',
      value: [mergedBlock],
    })
  }, [editor])

  return (
    <Card padding={2} radius={2} tone="caution" shadow={1}>
      <Flex align="center" justify="space-between">
        <Text size={1}>Too many lines detected for this single line input.</Text>
        <Button
          space={1}
          padding={2}
          fontSize={1}
          tone="caution"
          text="Merge blocks"
          onClick={handleMerge}
        />
      </Flex>
    </Card>
  )
}
